import os
from typing import Optional, Dict, Any, List
import hashlib
from .llm_service import LLMService

LANG_BY_EXT = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c-header",
}

ROLE_KEYWORDS = {
    "test": "test file",
    "spec": "test/spec file",
    "config": "configuration file",
    "readme": "documentation",
    "dockerfile": "container build config",
}

def detect_language(path: str) -> Optional[str]:
    _, ext = os.path.splitext(path)
    return LANG_BY_EXT.get(ext.lower())

def naive_summary(path: str, content: Optional[str]) -> str:
    """Fallback summary when LLM is not available."""
    name = os.path.basename(path).lower()
    for key, role in ROLE_KEYWORDS.items():
        if key in name:
            return f"Likely {role} for the project."
    if content:
        first_line = next((line.strip() for line in content.splitlines() if line.strip()), "")
        if len(first_line) > 0:
            return f"Appears to define or configure: {first_line[:140]}".strip()
    lang = detect_language(path)
    if lang:
        return f"{lang} source file."
    return "Project asset or metadata."


class EnhancedSummarizer:
    """Enhanced summarizer with LLM-powered analysis."""
    
    def __init__(self):
        """Initialize the enhanced summarizer."""
        try:
            self.llm_service = LLMService()
            self.llm_available = True
        except Exception as e:
            print(f"Warning: LLM service not available, using fallback summaries: {e}")
            self.llm_service = None
            self.llm_available = False
        
        self._repo_context = None  # Cache repository context
        # In-memory cache: content_hash -> summary
        self._summary_cache: Dict[str, str] = {}
    
    def set_repository_context(self, repo_path: str) -> None:
        """Set the repository context for intelligent summaries."""
        if not self.llm_available:
            return
            
        try:
            # Get comprehensive repository analysis
            analysis_result = self.llm_service.analyze_repository_structure(repo_path)
            
            if analysis_result.get("success"):
                self._repo_context = {
                    "analysis": analysis_result["analysis"],
                    "languages": analysis_result["analysis"].get("overview", {}).get("tech_stack", []),
                    "type": analysis_result["analysis"].get("overview", {}).get("type", "unknown"),
                    "directories": [],  # Will be populated from analysis
                    "files": {}  # File-level context
                }
                print(f"✅ Repository context loaded with LLM analysis")
            else:
                print(f"⚠️  LLM analysis failed, using fallback: {analysis_result.get('error')}")
                self._repo_context = analysis_result.get("fallback_analysis", {})
                
        except Exception as e:
            print(f"Warning: Failed to get repository context: {e}")
            self._repo_context = None
    
    def summarize_file(self, file_path: str, content: str) -> str:
        """Generate intelligent summary for a file using fallback (batch processing preferred)."""
        # Always use naive summary for individual files to avoid excessive LLM calls
        # Use batch_summarize_files for efficient LLM processing
        return naive_summary(file_path, content)
    
    def batch_summarize_files(self, files_data: List[Dict[str, str]]) -> Dict[str, str]:
        """Generate summaries for multiple files efficiently."""
        if not files_data:
            return {}

        # If LLM unavailable or no repo context, use fallback + cache
        if not self.llm_available or not self._repo_context:
            result: Dict[str, str] = {}
            for f in files_data:
                content = f.get('content', '') or ''
                content_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()
                cached = self._summary_cache.get(content_hash)
                if cached:
                    result[f['path']] = cached
                else:
                    summary = naive_summary(f['path'], content)
                    self._summary_cache[content_hash] = summary
                    result[f['path']] = summary
            return result

        try:
            # Separate cached vs uncached by content hash
            to_process: List[Dict[str, str]] = []
            result: Dict[str, str] = {}
            for f in files_data:
                content = f.get('content', '') or ''
                content_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()
                cached = self._summary_cache.get(content_hash)
                if cached:
                    result[f['path']] = cached
                else:
                    g = dict(f)
                    g['__hash'] = content_hash
                    to_process.append(g)

            if to_process:
                # Token-aware batching using content length budget
                batches: List[List[Dict[str, str]]] = []
                current: List[Dict[str, str]] = []
                budget = 8000  # approx chars per batch
                used = 0
                for f in to_process:
                    c = f.get('content', '') or ''
                    l = len(c)
                    if used + l > budget and current:
                        batches.append(current)
                        current = []
                        used = 0
                    current.append(f)
                    used += l
                if current:
                    batches.append(current)

                for batch in batches:
                    # Strip helper field before sending
                    clean_batch = [{k: v for k, v in f.items() if k != '__hash'} for f in batch]
                    batch_summaries = self.llm_service.generate_batch_summaries(clean_batch, self._repo_context)
                    # Store and cache
                    for f in batch:
                        path = f['path']
                        content_hash = f['__hash']
                        summary = batch_summaries.get(path) or naive_summary(path, f.get('content', ''))
                        result[path] = summary
                        self._summary_cache[content_hash] = summary

            # Fill any missing with fallback and cache them
            for f in files_data:
                if f['path'] not in result:
                    content = f.get('content', '') or ''
                    content_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()
                    summary = naive_summary(f['path'], content)
                    self._summary_cache[content_hash] = summary
                    result[f['path']] = summary

            return result

        except Exception as e:
            print(f"Warning: Batch LLM summary failed: {e}")
            # Fallback to naive summaries for all files (and cache)
            result: Dict[str, str] = {}
            for f in files_data:
                content = f.get('content', '') or ''
                content_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()
                summary = naive_summary(f['path'], content)
                self._summary_cache[content_hash] = summary
                result[f['path']] = summary
            return result
    
    def summarize_directory(self, dir_path: str, child_summaries: List[str]) -> str:
        """Generate summary for a directory based on its children."""
        if not child_summaries:
            return f"Empty directory"
        
        # Count different types of files
        file_count = len([s for s in child_summaries if 'file' in s.lower()])
        dir_count = len([s for s in child_summaries if 'directory' in s.lower()])
        
        # Basic directory summary
        parts = []
        if file_count > 0:
            parts.append(f"{file_count} files")
        if dir_count > 0:
            parts.append(f"{dir_count} subdirectories")
        
        base_summary = f"Directory containing {', '.join(parts) if parts else 'items'}."
        
        # Enhanced summary with LLM if available
        if self.llm_available and self._repo_context:
            try:
                dir_name = os.path.basename(dir_path)
                
                # Generate context-aware directory summary
                if dir_name in ['src', 'source', 'lib']:
                    return f"Source code directory containing core implementation files."
                elif dir_name in ['test', 'tests', '__tests__', 'spec']:
                    return f"Test directory containing test cases and specifications."
                elif dir_name in ['config', 'configs', 'configuration']:
                    return f"Configuration directory containing project settings and configs."
                elif dir_name in ['docs', 'documentation', 'doc']:
                    return f"Documentation directory containing project documentation."
                elif dir_name in ['utils', 'utilities', 'helpers']:
                    return f"Utilities directory containing helper functions and common utilities."
                elif dir_name in ['components', 'views', 'pages']:
                    return f"UI components directory containing interface elements."
                elif dir_name in ['api', 'services', 'controllers']:
                    return f"API/services directory containing business logic and endpoints."
                else:
                    return base_summary
                    
            except Exception as e:
                print(f"Warning: Enhanced directory summary failed: {e}")
        
        return base_summary
    
    def get_repository_insights(self) -> Dict[str, Any]:
        """Get comprehensive repository insights from LLM analysis."""
        if not self._repo_context:
            return {"available": False, "message": "No repository context available"}
        
        return {
            "available": True,
            "context": self._repo_context,
            "summary": self._repo_context.get("analysis", {})
        }


# Global instance for backward compatibility
_enhanced_summarizer = None

def get_enhanced_summarizer() -> EnhancedSummarizer:
    """Get or create the global enhanced summarizer instance."""
    global _enhanced_summarizer
    if _enhanced_summarizer is None:
        _enhanced_summarizer = EnhancedSummarizer()
    return _enhanced_summarizer

