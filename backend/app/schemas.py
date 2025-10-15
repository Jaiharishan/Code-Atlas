from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    path: Optional[str] = None

class JobStatusResponse(BaseModel):
    job_id: str
    state: str
    progress: float
    message: Optional[str] = None

class Node(BaseModel):
    path: str
    name: str
    type: str
    language: Optional[str] = None
    size: Optional[int] = None
    summary: Optional[str] = None
    children: Optional[List[Node]] = None

class RepoTreeResponse(BaseModel):
    job_id: str
    tree: Node

