import os
from typing import Dict, Any, List, Optional
from .utils.ignore import should_skip_dir, is_binary_file
from .summarizer import detect_language, naive_summary, get_enhanced_summarizer
from .jobs import JobManager

MAX_FILE_BYTES = 200_000

Node = Dict[str, Any]


def read_text_prefix(path: str, max_bytes: int) -> Optional[str]:
    try:
        with open(path, "rb") as f:
            data = f.read(max_bytes)
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return None


def walk_dir(root: str) -> Node:
    def build_node(path: str) -> Node:
        name = os.path.basename(path) or os.path.basename(os.path.dirname(path))
        if os.path.isdir(path):
            children: List[Node] = []
            for entry in sorted(os.listdir(path)):
                child_path = os.path.join(path, entry)
                if os.path.isdir(child_path) and should_skip_dir(entry):
                    continue
                children.append(build_node(child_path))
            summary = f"Directory containing {len(children)} items."
            return {
                "path": path,
                "name": name,
                "type": "dir",
                "language": None,
                "size": None,
                "summary": summary,
                "children": children,
            }
        else:
            lang = detect_language(path)
            size = os.path.getsize(path)
            content = None if size > MAX_FILE_BYTES or is_binary_file(path) else read_text_prefix(path, MAX_FILE_BYTES)
            summary = naive_summary(path, content)
            return {
                "path": path,
                "name": name,
                "type": "file",
                "language": lang,
                "size": int(size),
                "summary": summary,
                "children": None,
            }

    return build_node(root)


def walk_dir_enhanced(root: str, enhanced_summarizer, manager: JobManager, job_id: str) -> Node:
    """Enhanced directory walker with LLM-powered summaries."""
    
    def build_node_enhanced(path: str, depth: int = 0) -> Node:
        name = os.path.basename(path) or os.path.basename(os.path.dirname(path))
        
        if os.path.isdir(path):
            children: List[Node] = []
            child_summaries: List[str] = []
            
            # Update progress based on depth
            if depth == 0:
                manager.update_progress(job_id, 0.4, "scanning", f"Analyzing directory: {name}")
            
            for entry in sorted(os.listdir(path)):
                child_path = os.path.join(path, entry)
                if os.path.isdir(child_path) and should_skip_dir(entry):
                    continue
                
                child_node = build_node_enhanced(child_path, depth + 1)
                children.append(child_node)
                if child_node.get('summary'):
                    child_summaries.append(child_node['summary'])
            
            # Generate enhanced directory summary
            summary = enhanced_summarizer.summarize_directory(path, child_summaries)
            
            return {
                "path": path,
                "name": name,
                "type": "directory",  # Use consistent naming
                "language": None,
                "size": None,
                "summary": summary,
                "children": children,
            }
        else:
            # File processing
            lang = detect_language(path)
            size = os.path.getsize(path)
            
            # Read content for analysis
            content = None
            if size <= MAX_FILE_BYTES and not is_binary_file(path):
                content = read_text_prefix(path, MAX_FILE_BYTES)
            
            # Generate enhanced file summary
            if content:
                summary = enhanced_summarizer.summarize_file(path, content)
            else:
                summary = naive_summary(path, content)
            
            return {
                "path": path,
                "name": name,
                "type": "file",
                "language": lang,
                "size": int(size),
                "summary": summary,
                "children": None,
            }
    
    return build_node_enhanced(root)


def analyze_repository(local_path: str, job_id: str, manager: JobManager) -> None:
    """Analyze repository with enhanced LLM-powered summaries."""
    manager.update_progress(job_id, 0.05, "initializing", "Starting repository analysis")
    
    if not os.path.exists(local_path):
        manager.update(job_id, state="failed", progress=1.0, message="Path does not exist")
        return
    
    try:
        # Initialize enhanced summarizer with repository context
        manager.update_progress(job_id, 0.1, "analyzing", "Loading repository context with LLM")
        enhanced_summarizer = get_enhanced_summarizer()
        enhanced_summarizer.set_repository_context(local_path)
        
        # Walk directory with enhanced analysis
        manager.update_progress(job_id, 0.3, "scanning", "Scanning repository structure")
        tree = walk_dir_enhanced(local_path, enhanced_summarizer, manager, job_id)
        
        # Final processing
        manager.update_progress(job_id, 0.9, "finalizing", "Finalizing analysis")
        
        # Store the tree and mark as completed
        manager.update(job_id, state="completed", progress=1.0, message="Analysis completed successfully", tree=tree)
        
    except Exception as e:
        error_msg = f"Analysis failed: {str(e)}"
        print(f"Error in analyze_repository: {error_msg}")
        manager.update(job_id, state="failed", progress=1.0, message=error_msg)

