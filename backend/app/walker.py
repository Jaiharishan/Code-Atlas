import os
from typing import Dict, Any, List, Optional
from .utils.ignore import should_skip_dir, is_binary_file
from .summarizer import detect_language, naive_summary
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


def analyze_repository(local_path: str, job_id: str, manager: JobManager) -> None:
    manager.update(job_id, state="running", progress=0.05, message="walking repository")
    if not os.path.exists(local_path):
        manager.update(job_id, state="failed", progress=1.0, message="path does not exist")
        return
    tree = walk_dir(local_path)
    manager.update(job_id, progress=0.8, message="summarizing")
    manager.update(job_id, state="completed", progress=1.0, message="done", tree=tree)

