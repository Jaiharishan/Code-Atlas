import os
from typing import Set

DEFAULT_IGNORES: Set[str] = {
    "node_modules",
    "dist",
    "build",
    ".git",
    ".hg",
    ".svn",
    "venv",
    "__pycache__",
    ".mypy_cache",
}

BINARY_EXTS: Set[str] = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".zip", ".gz", ".tar", ".xz",
    ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".mov", ".avi",
}

TEXT_LIKE_EXTS: Set[str] = {
    ".txt", ".md", ".rst", ".csv", ".json", ".yml", ".yaml", ".toml",
}

def should_skip_dir(name: str) -> bool:
    return name in DEFAULT_IGNORES or name.startswith(".") and name not in {".github"}

def is_binary_file(path: str) -> bool:
    _, ext = os.path.splitext(path)
    return ext.lower() in BINARY_EXTS

