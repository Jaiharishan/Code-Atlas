from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, validator

class AnalyzeRequest(BaseModel):
    path: Optional[str] = None
    repo_url: Optional[str] = None
    upload_id: Optional[str] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        # Validate that exactly one input is provided
        inputs = [self.path, self.repo_url, self.upload_id]
        provided_inputs = [inp for inp in inputs if inp is not None]
        
        if len(provided_inputs) != 1:
            raise ValueError('Exactly one of path, repo_url, or upload_id must be provided')

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

class SearchResponse(BaseModel):
    question: str
    answer: str
    relevant_files: Optional[List[str]] = None
    confidence: Optional[float] = None

class GraphNode(BaseModel):
    id: str
    label: str
    type: str

class GraphEdge(BaseModel):
    from_: str = None  # 'from' is reserved keyword
    to: str
    type: str
    
    class Config:
        fields = {'from_': 'from'}

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    size: int
    message: str

