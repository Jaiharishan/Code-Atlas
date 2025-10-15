import os
from typing import Optional

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

