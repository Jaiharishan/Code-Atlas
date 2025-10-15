import os
import json
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class LLMService:
    """Service for LLM-powered repository analysis using Google Gemini."""
    
    def __init__(self):
        """Initialize the LLM service with Google Gemini."""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError(
                "GOOGLE_API_KEY environment variable is required. "
                "Get your API key from https://makersuite.google.com/app/apikey"
            )
        
        genai.configure(api_key=api_key)
        
        # Use Gemini Pro model
        self.model = genai.GenerativeModel('gemini-pro')
        
        # Configuration for generation
        self.generation_config = genai.types.GenerationConfig(
            temperature=0.3,  # Lower temperature for more consistent analysis
            top_p=0.8,
            top_k=40,
            max_output_tokens=4096,
        )
    
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
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            # Parse the structured response
            analysis = self._parse_analysis_response(response.text)
            
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
        prompt = f"""
Analyze this file in the context of the repository and provide a concise, intelligent summary.

Repository Context:
- Main technologies: {', '.join(repo_context.get('languages', []))}
- Repository type: {repo_context.get('type', 'Unknown')}
- Key directories: {', '.join(repo_context.get('directories', []))}

File: {file_path}
Content (first 2000 chars):
```
{file_content[:2000]}
```

Provide a 1-2 sentence summary that explains:
1. What this file does
2. Its role in the project
3. Key functionality (if applicable)

Summary:"""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            # Fallback to simple summary
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
            response = self.model.generate_content(prompt)
            return json.loads(response.text.strip())
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
            response = self.model.generate_content(prompt)
            
            return {
                "question": question,
                "answer": response.text.strip(),
                "relevant_files": self._extract_relevant_files(response.text, repo_context),
                "confidence": self._estimate_confidence(response.text),
                "suggestions": self._generate_exploration_suggestions(question, repo_context)
            }
            
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