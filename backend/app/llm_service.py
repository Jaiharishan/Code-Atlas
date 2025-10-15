import os
import json
import time
import requests
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class LLMService:
    """Service for LLM-powered repository analysis using Ollama."""
    
    def __init__(self):
        """Initialize the LLM service with Ollama."""
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model_name = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT", "60"))
        
        # Test connection to Ollama
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code != 200:
                raise ConnectionError(f"Cannot connect to Ollama at {self.base_url}")
        except requests.RequestException as e:
            print(f"Warning: Cannot connect to Ollama at {self.base_url}. Error: {e}")
            print("Make sure Ollama is running with: ollama serve")
            # Don't raise an exception here to allow fallback behavior
    
    def _call_ollama(self, prompt: str, system_prompt: str = None) -> str:
        """Make a request to Ollama API."""
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "num_predict": 4096,
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
            else:
                print(f"Ollama API error: {response.status_code} - {response.text}")
                return ""
        except requests.RequestException as e:
            print(f"Error calling Ollama: {e}")
            return ""
    
    def analyze_repository_structure(self, repo_path: str) -> Dict[str, Any]:
        """
        Analyze the entire repository structure and provide comprehensive insights.
        
        Args:
            repo_path: Path to the repository directory
            
        Returns:
            Dict containing repository analysis, architecture, and insights
        """
        # Collect repository context
        context = self._build_repository_context(repo_path)
        
        # Generate comprehensive analysis
        prompt = self._build_analysis_prompt(context)
        
        try:
            response = self._call_ollama(
                prompt,
                system_prompt="You are a code analysis expert. Provide detailed, accurate analysis of repository structure and code."
            )
            
            # Parse the structured response
            analysis = self._parse_analysis_response(response)
            
            return {
                "success": True,
                "analysis": analysis,
                "context_size": len(context["files"]),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback_analysis": self._generate_fallback_analysis(context)
            }
    
    def generate_file_summary(self, file_path: str, file_content: str, repo_context: Dict[str, Any]) -> str:
        """Generate intelligent summary for a specific file."""
        # For now, use fallback to avoid per-file LLM calls
        # This dramatically reduces the number of HTTP requests
        return self._generate_fallback_summary(file_path)
    
    def generate_batch_summaries(self, files_data: List[Dict[str, str]], repo_context: Dict[str, Any]) -> Dict[str, str]:
        """Generate summaries for multiple files in a single request."""
        if not files_data or len(files_data) == 0:
            return {}
            
        # Limit batch size to avoid overwhelming the LLM
        batch_size = 10
        all_summaries = {}
        
        for i in range(0, len(files_data), batch_size):
            batch = files_data[i:i + batch_size]
            batch_summaries = self._process_file_batch(batch, repo_context)
            all_summaries.update(batch_summaries)
            
        return all_summaries
    
    def _process_file_batch(self, files_batch: List[Dict[str, str]], repo_context: Dict[str, Any]) -> Dict[str, str]:
        """Process a batch of files and return their summaries."""
        files_info = []
        for file_data in files_batch:
            file_path = file_data['path']
            content = file_data.get('content', '')[:1000]  # Limit content length
            files_info.append(f"File: {file_path}\nContent: {content[:500]}...\n")
        
        prompt = f"""
Analyze these files in the context of the repository and provide concise summaries for each.

Repository Context:
- Main technologies: {', '.join(repo_context.get('languages', []))}
- Repository type: {repo_context.get('type', 'Unknown')}

Files to analyze:
{chr(10).join(files_info)}

For each file, provide a 1-sentence summary explaining what it does and its role.
Format your response as:
FILE: path/to/file.ext
SUMMARY: Brief summary here

FILE: path/to/next.ext
SUMMARY: Brief summary here
"""

        try:
            response = self._call_ollama(
                prompt,
                system_prompt="You are a code analysis assistant. Provide concise, accurate summaries of code files."
            )
            
            if response:
                return self._parse_batch_summaries(response, files_batch)
            else:
                # Fallback to individual summaries
                return {f['path']: self._generate_fallback_summary(f['path']) for f in files_batch}
                
        except Exception as e:
            print(f"Batch summary failed: {e}")
            return {f['path']: self._generate_fallback_summary(f['path']) for f in files_batch}
    
    def _parse_batch_summaries(self, response: str, files_batch: List[Dict[str, str]]) -> Dict[str, str]:
        """Parse batch summary response."""
        summaries = {}
        lines = response.split('\n')
        current_file = None
        
        for line in lines:
            line = line.strip()
            if line.startswith('FILE:'):
                current_file = line.replace('FILE:', '').strip()
            elif line.startswith('SUMMARY:') and current_file:
                summary = line.replace('SUMMARY:', '').strip()
                summaries[current_file] = summary
                current_file = None
        
        # Fill in any missing summaries with fallbacks
        for file_data in files_batch:
            file_path = file_data['path']
            if file_path not in summaries:
                summaries[file_path] = self._generate_fallback_summary(file_path)
        
        return summaries
    
    def _generate_fallback_summary(self, file_path: str) -> str:
        """Generate a fallback summary when LLM is unavailable."""
        filename = os.path.basename(file_path)
        if 'test' in filename.lower():
            return f"Test file for {filename.replace('test_', '').replace('.test', '')}"
        elif 'config' in filename.lower():
            return f"Configuration file for the project"
        elif filename == 'README.md':
            return "Project documentation and setup instructions"
        else:
            return f"Source file implementing core functionality"
    
    def generate_dependency_graph(self, repo_path: str, file_contents: Dict[str, str]) -> Dict[str, Any]:
        """Generate dependency graph using LLM analysis."""
        context = self._build_dependency_context(repo_path, file_contents)
        
        prompt = f"""
Analyze the code files and generate a dependency graph in JSON format.

Repository files and their imports/dependencies:
{context}

Generate a JSON response with this exact structure:
{{
  "nodes": [
    {{"id": "filepath", "label": "filename", "type": "entry|module|utility|test|config"}},
    ...
  ],
  "edges": [
    {{"from": "source_file", "to": "target_file", "type": "import|call|reference"}},
    ...
  ],
  "insights": {{
    "main_entry_points": ["file1", "file2"],
    "core_modules": ["module1", "module2"],
    "circular_dependencies": ["if any"],
    "architecture_pattern": "mvc|microservices|monolith|library"
  }}
}}

Focus on actual code dependencies, imports, and function calls. Be precise and only include real relationships you can identify from the code."""

        try:
            response = self._call_ollama(
                prompt,
                system_prompt="You are a code dependency analyzer. Generate accurate JSON dependency graphs."
            )
            
            if response:
                return json.loads(response.strip())
            else:
                raise Exception("No response from Ollama")
        except Exception as e:
            # Return basic fallback graph
            return {
                "nodes": [],
                "edges": [],
                "insights": {
                    "main_entry_points": [],
                    "core_modules": [],
                    "circular_dependencies": [],
                    "architecture_pattern": "unknown"
                },
                "error": str(e)
            }
    
    def answer_repository_question(self, question: str, repo_context: Dict[str, Any], file_contents: Dict[str, str]) -> Dict[str, Any]:
        """Answer questions about the repository using full context."""
        
        # Build comprehensive context for the question
        context_summary = self._build_qa_context(repo_context, file_contents, question)
        
        prompt = f"""
You are a code analysis assistant. Answer the user's question about this repository using the provided context.

Repository Context:
{context_summary}

User Question: {question}

Provide a helpful, accurate answer based on the code and structure. If you can't find specific information, say so and suggest what the user might explore instead.

Response format:
- Give a direct answer to the question
- Reference specific files when relevant
- Provide confidence level (high/medium/low)
- Suggest related files or areas to explore

Answer:"""

        try:
            response = self._call_ollama(
                prompt,
                system_prompt="You are a helpful code analysis assistant. Answer questions about repositories accurately and provide helpful guidance."
            )
            
            if response:
                return {
                    "question": question,
                    "answer": response.strip(),
                    "relevant_files": self._extract_relevant_files(response, repo_context),
                    "confidence": self._estimate_confidence(response),
                    "suggestions": self._generate_exploration_suggestions(question, repo_context)
                }
            else:
                raise Exception("No response from Ollama")
            
        except Exception as e:
            return {
                "question": question,
                "answer": f"I encountered an error analyzing the repository: {str(e)}. Please try rephrasing your question or check the repository structure.",
                "relevant_files": [],
                "confidence": 0.1,
                "suggestions": ["Try exploring the main files", "Check the README for documentation"]
            }
    
    def _build_repository_context(self, repo_path: str) -> Dict[str, Any]:
        """Build comprehensive repository context for LLM analysis."""
        context = {
            "files": {},
            "structure": {},
            "languages": set(),
            "directories": [],
            "total_files": 0,
            "total_size": 0
        }
        
        # Walk through the repository
        for root, dirs, files in os.walk(repo_path):
            # Skip common ignore patterns
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in 
                      ['node_modules', '__pycache__', '.git', 'venv', '.venv', 'build', 'dist']]
            
            rel_root = os.path.relpath(root, repo_path)
            if rel_root != '.':
                context["directories"].append(rel_root)
            
            for file in files:
                if file.startswith('.') or file.endswith('.pyc'):
                    continue
                
                file_path = os.path.join(root, file)
                rel_file_path = os.path.relpath(file_path, repo_path)
                
                try:
                    # Get file info
                    file_size = os.path.getsize(file_path)
                    context["total_size"] += file_size
                    context["total_files"] += 1
                    
                    # Detect language
                    ext = Path(file).suffix.lower()
                    if ext in ['.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.cpp', '.c', '.h']:
                        context["languages"].add(ext[1:])  # Remove the dot
                        
                        # Read file content for small files
                        if file_size < 50000:  # Only read files smaller than 50KB
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                context["files"][rel_file_path] = {
                                    "content": content[:2000],  # First 2000 chars
                                    "size": file_size,
                                    "language": ext[1:],
                                    "lines": len(content.split('\n'))
                                }
                    elif file.lower() in ['readme.md', 'package.json', 'requirements.txt', 'go.mod', 'cargo.toml']:
                        # Always include important metadata files
                        try:
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                context["files"][rel_file_path] = {
                                    "content": content[:1000],
                                    "size": file_size,
                                    "language": "config",
                                    "lines": len(content.split('\n'))
                                }
                        except:
                            pass
                            
                except Exception:
                    continue
        
        context["languages"] = list(context["languages"])
        return context
    
    def _build_analysis_prompt(self, context: Dict[str, Any]) -> str:
        """Build comprehensive analysis prompt for the repository."""
        
        files_summary = []
        for file_path, file_info in context["files"].items():
            files_summary.append(f"File: {file_path}\n  Language: {file_info['language']}\n  Lines: {file_info['lines']}\n  Content preview:\n  ```\n{file_info['content'][:500]}\n  ```\n")
        
        return f"""
Analyze this repository and provide a comprehensive JSON response with the following structure:

Repository Overview:
- Total files: {context['total_files']}
- Languages: {', '.join(context['languages'])}
- Directories: {', '.join(context['directories'][:10])}

Files to analyze:
{chr(10).join(files_summary[:20])}  // Showing first 20 files

Provide analysis in this JSON format:
{{
  "overview": {{
    "purpose": "What does this repository do?",
    "type": "web-app|library|cli-tool|api|mobile-app|other",
    "architecture": "mvc|microservices|monolith|library|other",
    "tech_stack": ["main technologies used"]
  }},
  "structure": {{
    "entry_points": ["main files that start the application"],
    "core_modules": ["important business logic files"],
    "tests": ["test files identified"],
    "config": ["configuration files"],
    "documentation": ["readme, docs files"]
  }},
  "insights": {{
    "code_quality": "assessment of code organization",
    "patterns": ["design patterns or conventions used"],
    "dependencies": ["key external dependencies identified"],
    "complexity": "low|medium|high"
  }},
  "recommendations": {{
    "improvements": ["suggested improvements"],
    "missing": ["what might be missing"],
    "strengths": ["what is done well"]
  }}
}}

Be specific and base analysis on the actual code content provided."""
    
    def _build_dependency_context(self, repo_path: str, file_contents: Dict[str, str]) -> str:
        """Build context for dependency analysis."""
        context_parts = []
        
        for file_path, content in file_contents.items():
            # Extract imports and dependencies
            imports = self._extract_imports(content, file_path)
            if imports:
                context_parts.append(f"File: {file_path}\nImports: {', '.join(imports)}\n")
        
        return '\n'.join(context_parts)
    
    def _extract_imports(self, content: str, file_path: str) -> List[str]:
        """Extract import statements from file content."""
        imports = []
        lines = content.split('\n')
        
        for line in lines[:50]:  # Only check first 50 lines
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                imports.append(line)
            elif 'require(' in line and file_path.endswith('.js'):
                imports.append(line)
            elif line.startswith('#include') and file_path.endswith(('.c', '.cpp', '.h')):
                imports.append(line)
        
        return imports
    
    def _build_qa_context(self, repo_context: Dict[str, Any], file_contents: Dict[str, str], question: str) -> str:
        """Build context for Q&A based on the question."""
        context_parts = [
            f"Repository has {len(file_contents)} files",
            f"Main languages: {', '.join(repo_context.get('languages', []))}",
            f"Key directories: {', '.join(repo_context.get('directories', [])[:5])}"
        ]
        
        # Add relevant file contents based on question keywords
        question_lower = question.lower()
        relevant_files = []
        
        for file_path, content in file_contents.items():
            # Check if file is relevant to question
            if any(keyword in file_path.lower() or keyword in content.lower() 
                   for keyword in question_lower.split() if len(keyword) > 3):
                relevant_files.append(f"File {file_path}:\n{content[:800]}\n")
        
        if relevant_files:
            context_parts.extend(relevant_files[:5])  # Limit to 5 most relevant files
        
        return '\n'.join(context_parts)
    
    def _parse_analysis_response(self, response_text: str) -> Dict[str, Any]:
        """Parse and validate the analysis response from LLM."""
        try:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback: create structured response from text
                return {"raw_analysis": response_text}
        except:
            return {"raw_analysis": response_text}
    
    def _generate_fallback_analysis(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback analysis when LLM fails."""
        return {
            "overview": {
                "purpose": f"Repository with {context['total_files']} files",
                "type": "unknown",
                "architecture": "unknown",
                "tech_stack": list(context['languages'])
            },
            "structure": {
                "entry_points": [],
                "core_modules": [],
                "tests": [],
                "config": [],
                "documentation": []
            },
            "insights": {
                "code_quality": "Unable to analyze",
                "patterns": [],
                "dependencies": [],
                "complexity": "unknown"
            }
        }
    
    def _extract_relevant_files(self, response_text: str, repo_context: Dict[str, Any]) -> List[str]:
        """Extract file names mentioned in the LLM response."""
        # Simple implementation - look for common file patterns
        import re
        file_pattern = r'\b\w+\.\w+\b'
        potential_files = re.findall(file_pattern, response_text)
        
        # Filter to only actual files from the repository
        actual_files = []
        for file in potential_files:
            if any(file in path for path in repo_context.get('files', {})):
                actual_files.append(file)
        
        return actual_files[:5]  # Limit to 5 files
    
    def _estimate_confidence(self, response_text: str) -> float:
        """Estimate confidence based on response characteristics."""
        if 'I don\'t know' in response_text or 'cannot determine' in response_text:
            return 0.3
        elif 'might' in response_text or 'possibly' in response_text:
            return 0.6
        elif 'specifically' in response_text or 'file shows' in response_text:
            return 0.9
        else:
            return 0.7
    
    def _generate_exploration_suggestions(self, question: str, repo_context: Dict[str, Any]) -> List[str]:
        """Generate suggestions for further exploration."""
        suggestions = []
        
        if 'main' in question.lower():
            suggestions.append("Check the main entry point files")
        if 'how' in question.lower():
            suggestions.append("Look at the core business logic modules")
        if 'test' in question.lower():
            suggestions.append("Examine the test files for usage examples")
        if 'config' in question.lower():
            suggestions.append("Review configuration files")
        
        # Add general suggestions
        if len(suggestions) < 2:
            suggestions.extend([
                "Explore the README documentation",
                "Check the main source directories",
                "Look for entry point files"
            ])
        
        return suggestions[:3]