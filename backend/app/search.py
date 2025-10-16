import re
from typing import List, Optional, Dict, Any
from .jobs import JobManager
from .llm_service import LLMService


class RepositorySearch:
    """Handles search and Q&A functionality for analyzed repositories."""
    
    def __init__(self, job_manager: JobManager):
        self.job_manager = job_manager
        try:
            self.llm_service = LLMService()
            self.llm_available = True
        except Exception as e:
            print(f"Warning: LLM service not available for search, using fallback: {e}")
            self.llm_service = None
            self.llm_available = False
    
    def search_repository(self, job_id: str, query: str) -> Dict[str, Any]:
        """
        Search through repository content and provide intelligent answers.
        
        Args:
            job_id: The job ID of the analyzed repository
            query: The search query or question
            
        Returns:
            Dict containing answer, relevant files, and confidence
        """
        job = self.job_manager.get_job(job_id)
        if not job or not job.tree:
            return {
                "question": query,
                "answer": "Repository analysis not found or incomplete. Please ensure the repository has been analyzed successfully.",
                "relevant_files": [],
                "confidence": 0.0
            }
        
        # Use LLM service for intelligent Q&A if available
        if self.llm_available:
            try:
                # Build repository context from tree
                repo_context = self._build_repo_context_from_tree(job.tree)
                file_contents = self._extract_file_contents_from_tree(job.tree)
                
                # Use LLM for intelligent answer
                result = self.llm_service.answer_repository_question(query, repo_context, file_contents)
                return result
                
            except Exception as e:
                print(f"Warning: LLM search failed, using fallback: {e}")
                # Fall back to original method
        
        # Fallback to original search method
        is_question = self._is_question(query)
        if is_question:
            return self._answer_question(query, job.tree)
        else:
            return self._search_content(query, job.tree)
    
    def _is_question(self, query: str) -> bool:
        """Determine if the query is a question."""
        question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'does', 'is', 'can', 'should', 'will', 'do']
        query_lower = query.lower().strip()
        
        # Check for question words at the start or question mark
        has_question_word = any(query_lower.startswith(word + ' ') for word in question_words)
        has_question_mark = '?' in query
        
        return has_question_word or has_question_mark
    
    def _answer_question(self, question: str, tree: Any) -> Dict[str, Any]:
        """Answer a question about the repository."""
        question_lower = question.lower().strip()
        
        # Extract mentioned files from the question
        mentioned_files = self._extract_file_names(question)
        relevant_files = []
        answer_parts = []
        
        # Find files that match mentioned names
        if mentioned_files:
            for file_name in mentioned_files:
                file_info = self._find_file_by_name(tree, file_name)
                if file_info:
                    relevant_files.append(file_info['path'])
                    if file_info['summary']:
                        answer_parts.append(f"{file_info['name']}: {file_info['summary']}")
        
        # If no specific files mentioned, provide general repository overview
        if not answer_parts:
            if 'main' in question_lower or 'entry' in question_lower or 'start' in question_lower:
                # Look for main files
                main_files = self._find_main_files(tree)
                if main_files:
                    relevant_files.extend([f['path'] for f in main_files])
                    for file_info in main_files:
                        if file_info['summary']:
                            answer_parts.append(f"{file_info['name']}: {file_info['summary']}")
            
            elif 'structure' in question_lower or 'organize' in question_lower:
                # Describe repository structure
                structure_info = self._describe_structure(tree)
                answer_parts.append(structure_info)
            
            elif 'language' in question_lower or 'tech' in question_lower:
                # Describe languages used
                languages = self._get_languages(tree)
                if languages:
                    answer_parts.append(f"This repository uses: {', '.join(languages)}")
            
            else:
                # General repository summary
                repo_summary = self._get_repository_summary(tree)
                answer_parts.append(repo_summary)
        
        # Construct answer
        if answer_parts:
            answer = " ".join(answer_parts)
            confidence = 0.8 if relevant_files else 0.6
        else:
            answer = "I couldn't find specific information to answer your question. You might want to explore the repository structure or ask about specific files."
            confidence = 0.2
        
        return {
            "question": question,
            "answer": answer,
            "relevant_files": relevant_files,
            "confidence": confidence
        }
    
    def _search_content(self, query: str, tree: Any) -> Dict[str, Any]:
        """Search for content matching the query."""
        results = []
        relevant_files = []
        
        # Search through all files and summaries
        self._search_tree_recursive(tree, query.lower(), results, relevant_files)
        
        if results:
            answer = f"Found {len(results)} matches: " + "; ".join(results[:5])  # Limit to top 5
            if len(results) > 5:
                answer += f" and {len(results) - 5} more matches."
            confidence = 0.9
        else:
            answer = f"No matches found for '{query}'. Try searching for file names, languages, or general terms."
            confidence = 0.1
        
        return {
            "question": query,
            "answer": answer,
            "relevant_files": relevant_files[:10],  # Limit relevant files
            "confidence": confidence
        }
    
    def _extract_file_names(self, text: str) -> List[str]:
        """Extract potential file names from text."""
        # Look for common file patterns
        file_patterns = [
            r'\b\w+\.[a-zA-Z0-9]+\b',  # filename.extension
            r'\b[a-zA-Z0-9_-]+\.py\b',  # Python files
            r'\b[a-zA-Z0-9_-]+\.js\b',  # JavaScript files
            r'\b[a-zA-Z0-9_-]+\.ts\b',  # TypeScript files
            r'\b[a-zA-Z0-9_-]+\.java\b',  # Java files
            r'\bmain\b',  # Common main file
            r'\bindex\b',  # Common index file
        ]
        
        file_names = set()
        for pattern in file_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            file_names.update(matches)
        
        return list(file_names)
    
    def _find_file_by_name(self, tree: Any, target_name: str) -> Optional[Dict[str, Any]]:
        """Find a file by name in the tree (supports dict or object nodes)."""
        name = self._get(tree, 'name')
        if isinstance(name, str) and target_name.lower() in name.lower():
            return {
                'path': self._get(tree, 'path'),
                'name': name,
                'summary': self._get(tree, 'summary'),
                'language': self._get(tree, 'language')
            }

        children = self._children(tree)
        for child in children:
            result = self._find_file_by_name(child, target_name)
            if result:
                return result
        return None
    
    def _find_main_files(self, tree: Any) -> List[Dict[str, Any]]:
        """Find main entry point files."""
        main_patterns = ['main', 'index', 'app', 'server', '__init__']
        main_files = []
        
        self._find_files_by_patterns(tree, main_patterns, main_files)
        return main_files
    
    def _find_files_by_patterns(self, tree: Any, patterns: List[str], results: List[Dict[str, Any]]) -> None:
        """Recursively find files matching patterns (supports dict or object nodes)."""
        node_type = self._type_of(tree)
        if node_type == 'file':
            node_name = self._get(tree, 'name') or ''
            name_lower = node_name.lower()
            for pattern in patterns:
                if pattern in name_lower:
                    results.append({
                        'path': self._get(tree, 'path'),
                        'name': node_name,
                        'summary': self._get(tree, 'summary'),
                        'language': self._get(tree, 'language')
                    })
                    break

        for child in self._children(tree):
            self._find_files_by_patterns(child, patterns, results)
    
    def _describe_structure(self, tree: Any) -> str:
        """Describe the repository structure."""
        children = self._children(tree)
        if not children:
            return "This appears to be a simple repository with minimal structure."
        
        dirs = []
        files = []
        
        for child in children:
            child_type = self._type_of(child)
            child_name = self._get(child, 'name')
            if child_type in ('directory', 'dir'):
                dirs.append(child_name)
            else:
                files.append(child_name)
        
        structure_parts = []
        if dirs:
            structure_parts.append(f"Contains {len(dirs)} directories: {', '.join(dirs[:5])}")
        if files:
            structure_parts.append(f"Contains {len(files)} files at the root level")
        
        return ". ".join(structure_parts) + "."
    
    def _get_languages(self, tree: Any) -> List[str]:
        """Get all languages used in the repository."""
        languages = set()
        self._collect_languages_recursive(tree, languages)
        return sorted(list(languages))
    
    def _collect_languages_recursive(self, tree: Any, languages: set) -> None:
        """Recursively collect all languages (supports dict or object nodes)."""
        lang = self._get(tree, 'language')
        if lang:
            languages.add(lang)
        for child in self._children(tree):
            self._collect_languages_recursive(child, languages)
    
    def _get_repository_summary(self, tree: Any) -> str:
        """Get a general repository summary."""
        summary = self._get(tree, 'summary')
        if summary:
            return summary
        
        # Generate basic summary
        languages = self._get_languages(tree)
        file_count = self._count_files(tree)
        
        summary_parts = [f"This repository contains {file_count} files"]
        if languages:
            summary_parts.append(f"primarily using {', '.join(languages[:3])}")
        
        return " ".join(summary_parts) + "."
    
    def _count_files(self, tree: Any) -> int:
        """Count total files in the repository."""
        count = 0
        if self._type_of(tree) == 'file':
            count = 1
        for child in self._children(tree):
            count += self._count_files(child)
        
        return count
    
    def _search_tree_recursive(self, tree: Any, query: str, results: List[str], relevant_files: List[str]) -> None:
        """Recursively search through the tree (supports dict or object nodes)."""
        name = (self._get(tree, 'name') or '').lower()
        path = self._get(tree, 'path') or ''
        summary = (self._get(tree, 'summary') or '').lower()
        language = (self._get(tree, 'language') or '')

        # Check file/directory name
        if name and query in name:
            results.append(f"File: {name}")
            if path:
                relevant_files.append(path)

        # Check summary
        if summary and query in summary:
            display_name = self._get(tree, 'name') or ''
            results.append(f"{display_name}: {summary[:100]}...")
            if path:
                relevant_files.append(path)

        # Check language
        if language and query in language.lower():
            display_name = self._get(tree, 'name') or ''
            results.append(f"{display_name} ({language})")
            if path:
                relevant_files.append(path)

        for child in self._children(tree):
            self._search_tree_recursive(child, query, results, relevant_files)
    
    def _build_repo_context_from_tree(self, tree: Any) -> Dict[str, Any]:
        """Build repository context from the analyzed tree."""
        languages = self._get_languages(tree)
        file_count = self._count_files(tree)
        directories = self._get_directories(tree)
        
        return {
            "languages": languages,
            "file_count": file_count,
            "directories": directories,
            "files": {}  # Will be populated by extract_file_contents
        }
    
    def _extract_file_contents_from_tree(self, tree: Any) -> Dict[str, str]:
        """Extract file contents from tree summaries for LLM context."""
        file_contents = {}
        self._collect_file_contents_recursive(tree, file_contents)
        return file_contents
    
    def _collect_file_contents_recursive(self, tree: Any, file_contents: Dict[str, str]) -> None:
        """Recursively collect file summaries as content (supports dict or object nodes)."""
        if self._type_of(tree) == 'file':
            summary = self._get(tree, 'summary')
            path = self._get(tree, 'path')
            if summary and path:
                file_contents[path] = summary
        for child in self._children(tree):
            self._collect_file_contents_recursive(child, file_contents)
    
    def _get_directories(self, tree: Any) -> List[str]:
        """Get all directory names from the tree."""
        directories = []
        self._collect_directories_recursive(tree, directories)
        return directories
    
    def _collect_directories_recursive(self, tree: Any, directories: List[str]) -> None:
        """Recursively collect directory names (supports dict or object nodes)."""
        if self._type_of(tree) in ('directory', 'dir'):
            name = self._get(tree, 'name')
            if name:
                directories.append(name)
        for child in self._children(tree):
            self._collect_directories_recursive(child, directories)

    # ------------------------
    # Helpers for node access
    # ------------------------
    def _get(self, node: Any, key: str):
        """Safely get a field from dict or object node."""
        if isinstance(node, dict):
            return node.get(key)
        return getattr(node, key, None)

    def _children(self, node: Any) -> List[Any]:
        """Get children array from dict or object node."""
        if isinstance(node, dict):
            children = node.get('children')
        else:
            children = getattr(node, 'children', None)
        return children or []

    def _type_of(self, node: Any) -> Optional[str]:
        """Get normalized node type (file/directory)."""
        t = self._get(node, 'type')
        if isinstance(t, str):
            return t
        return None
