import re
import os
from typing import List, Dict, Set, Any
from .jobs import JobManager
from .llm_service import LLMService


class DependencyAnalyzer:
    """Analyzes dependencies and relationships in repositories."""
    
    def __init__(self, job_manager: JobManager):
        self.job_manager = job_manager
        try:
            self.llm_service = LLMService()
            self.llm_available = True
        except Exception as e:
            print(f"Warning: LLM service not available for dependency analysis, using fallback: {e}")
            self.llm_service = None
            self.llm_available = False
    
    def generate_dependency_graph(self, job_id: str) -> Dict[str, Any]:
        """
        Generate a dependency graph for the analyzed repository.
        
        Args:
            job_id: The job ID of the analyzed repository
            
        Returns:
            Dict containing nodes and edges for the dependency graph
        """
        job = self.job_manager.get_job(job_id)
        if not job or not job.tree:
            return {"nodes": [], "edges": []}
        
        # Use LLM service for intelligent dependency analysis if available
        if self.llm_available:
            try:
                # Build file contents from tree for LLM analysis
                file_contents = self._extract_file_contents_from_tree(job.tree)
                repo_path = job.tree.path if hasattr(job.tree, 'path') else "/tmp"
                
                # Use LLM to generate intelligent dependency graph
                result = self.llm_service.generate_dependency_graph(repo_path, file_contents)
                
                # Ensure we have the expected structure
                if "nodes" in result and "edges" in result:
                    return result
                else:
                    print("Warning: LLM returned unexpected dependency graph format")
                    
            except Exception as e:
                print(f"Warning: LLM dependency analysis failed, using fallback: {e}")
        
        # Fallback to basic analysis
        nodes = []
        edges = []
        
        # Extract nodes and dependencies from the tree
        self._extract_nodes_recursive(job.tree, nodes)
        self._extract_dependencies_recursive(job.tree, edges)
        
        return {
            "nodes": nodes,
            "edges": edges,
            "insights": {
                "main_entry_points": [],
                "core_modules": [],
                "circular_dependencies": [],
                "architecture_pattern": "unknown"
            }
        }
    
    def _extract_nodes_recursive(self, tree: Any, nodes: List[Dict[str, str]]) -> None:
        """Extract nodes from the repository tree."""
        if hasattr(tree, 'type') and tree.type == 'file':
            # Only include source files, not config or binary files
            if self._is_source_file(tree.name):
                node_type = self._get_node_type(tree)
                nodes.append({
                    "id": tree.path,
                    "label": tree.name,
                    "type": node_type
                })
        
        # Recurse through children
        if hasattr(tree, 'children') and tree.children:
            for child in tree.children:
                self._extract_nodes_recursive(child, nodes)
    
    def _extract_dependencies_recursive(self, tree: Any, edges: List[Dict[str, str]]) -> None:
        """Extract dependency relationships from files."""
        if hasattr(tree, 'type') and tree.type == 'file' and self._is_source_file(tree.name):
            # For now, create simple placeholder dependencies
            # In a real implementation, this would parse file contents
            if 'main' in tree.name.lower():
                # Main files often depend on other modules
                edges.append({
                    "from": tree.path,
                    "to": f"{os.path.dirname(tree.path)}/utils",
                    "type": "import"
                })
        
        # Recurse through children
        if hasattr(tree, 'children') and tree.children:
            for child in tree.children:
                self._extract_dependencies_recursive(child, edges)
    
    def _is_source_file(self, filename: str) -> bool:
        """Check if file is a source code file."""
        source_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', 
            '.rs', '.cpp', '.c', '.h', '.cs', '.php', '.rb'
        }
        
        _, ext = os.path.splitext(filename)
        return ext.lower() in source_extensions
    
    def _get_node_type(self, tree: Any) -> str:
        """Determine the type of node based on file characteristics."""
        name_lower = tree.name.lower()
        
        if 'test' in name_lower or 'spec' in name_lower:
            return 'test'
        elif 'main' in name_lower or 'index' in name_lower:
            return 'entry'
        elif 'util' in name_lower or 'helper' in name_lower:
            return 'utility'
        elif 'config' in name_lower or 'setting' in name_lower:
            return 'config'
        else:
            return 'module'
    
    def _extract_file_contents_from_tree(self, tree: Any) -> Dict[str, str]:
        """Extract file contents/summaries from the tree for LLM analysis."""
        file_contents = {}
        self._collect_file_summaries_recursive(tree, file_contents)
        return file_contents
    
    def _collect_file_summaries_recursive(self, tree: Any, file_contents: Dict[str, str]) -> None:
        """Recursively collect file summaries as content for analysis."""
        if hasattr(tree, 'type') and tree.type == 'file':
            if self._is_source_file(tree.name) and hasattr(tree, 'summary'):
                # Use summary as content since we don't store full file contents
                file_contents[tree.path] = tree.summary or f"Source file: {tree.name}"
        
        if hasattr(tree, 'children') and tree.children:
            for child in tree.children:
                self._collect_file_summaries_recursive(child, file_contents)
