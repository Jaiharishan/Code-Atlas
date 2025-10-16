import os
from typing import Dict, Any, List, Optional
from .utils.ignore import should_skip_dir, is_binary_file
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    """Enhanced directory walker with efficient batch LLM processing."""
    
    # First pass: collect all files for batch processing
    manager.update_progress(job_id, 0.4, "scanning", "Collecting files for analysis")
    all_files = []
    file_nodes = {}  # Store file nodes temporarily
    
    def read_file_data(path: str) -> Dict[str, Any]:
        name = os.path.basename(path) or os.path.basename(os.path.dirname(path))
        lang = detect_language(path)
        size = os.path.getsize(path)
        content = None
        if size <= MAX_FILE_BYTES and not is_binary_file(path):
            content = read_text_prefix(path, MAX_FILE_BYTES)
        return {
            "path": path,
            "name": name,
            "lang": lang,
            "size": int(size),
            "content": content or "",
        }

    def collect_files(path: str) -> Node:
        name = os.path.basename(path) or os.path.basename(os.path.dirname(path))
        
        if os.path.isdir(path):
            children = []
            entries = sorted(os.listdir(path))
            for entry in entries:
                child_path = os.path.join(path, entry)
                if os.path.isdir(child_path) and should_skip_dir(entry):
                    continue
                child_node = collect_files(child_path)
                children.append(child_node)
            
            return {
                "path": path,
                "name": name,
                "type": "directory",
                "language": None,
                "size": None,
                "summary": None,  # Will be filled later
                "children": children,
            }
        else:
            # File processing - collect for batch (IO parallelized later)
            meta = read_file_data(path)
            file_data = {
                "path": meta["path"],
                "content": meta["content"],
                "language": meta["lang"],
                "size": meta["size"],
            }
            all_files.append(file_data)

            node = {
                "path": meta["path"],
                "name": meta["name"],
                "type": "file",
                "language": meta["lang"],
                "size": meta["size"],
                "summary": None,
                "children": None,
            }
            file_nodes[meta["path"]] = node
            return node
    
    # Collect all files first
    tree = collect_files(root)
    
    # Second pass: batch process file summaries
    if all_files:
        manager.update_progress(job_id, 0.6, "analyzing", f"Generating summaries for {len(all_files)} files")
        
        # Note: read_file_data already fetched content; in larger repos, consider parallel IO at collection stage
        # Use batch processing to minimize LLM calls (now token-aware + cached)
        batch_summaries = enhanced_summarizer.batch_summarize_files(all_files)
        
        # Apply summaries to file nodes
        for file_path, summary in batch_summaries.items():
            if file_path in file_nodes:
                file_nodes[file_path]['summary'] = summary
        
        # Fill in any missing summaries with naive fallback
        for file_data in all_files:
            file_path = file_data['path']
            if file_path in file_nodes and file_nodes[file_path]['summary'] is None:
                file_nodes[file_path]['summary'] = naive_summary(file_path, file_data.get('content'))
    
    # Third pass: generate directory summaries
    def finalize_directory_summaries(node: Node) -> None:
        if node['type'] == 'directory':
            child_summaries = []
            if node.get('children'):
                for child in node['children']:
                    finalize_directory_summaries(child)
                    if child.get('summary'):
                        child_summaries.append(child['summary'])
            
            # Generate directory summary
            node['summary'] = enhanced_summarizer.summarize_directory(node['path'], child_summaries)
    
    manager.update_progress(job_id, 0.8, "finalizing", "Generating directory summaries")
    finalize_directory_summaries(tree)
    
    return tree


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

