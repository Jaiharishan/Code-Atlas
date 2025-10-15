from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import AnalyzeRequest, JobStatusResponse, RepoTreeResponse
from .jobs import JobManager
from .walker import analyze_repository

app = FastAPI(title="Repo Insight API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

job_manager = JobManager()

@app.post("/analyze", response_model=JobStatusResponse)
def start_analysis(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    if not req.path:
        raise HTTPException(status_code=400, detail="path is required for local analysis in MVP")
    job_id = job_manager.create_job(source=req.path)
    background_tasks.add_task(analyze_repository, req.path, job_id, job_manager)
    return job_manager.get_status(job_id)

@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str):
    status = job_manager.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="job not found")
    return status

@app.get("/repos/{job_id}/tree", response_model=RepoTreeResponse)
def get_tree(job_id: str):
    tree = job_manager.get_repo_tree(job_id)
    if tree is None:
        raise HTTPException(status_code=404, detail="tree not found or job incomplete")
    return RepoTreeResponse(job_id=job_id, tree=tree)

