from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .schemas import AnalyzeRequest, JobStatusResponse, RepoTreeResponse, SearchResponse, GraphResponse, UploadResponse
from .jobs import JobManager
from .utils.redis_cache import set_tree as redis_set_tree, get_tree as redis_get_tree
from .walker import analyze_repository
from .github_fetcher import GitHubFetcher
from .search import RepositorySearch
from .dependency_analyzer import DependencyAnalyzer

app = FastAPI(title="Repo Insight API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

job_manager = JobManager()
repository_search = RepositorySearch(job_manager)
dependency_analyzer = DependencyAnalyzer(job_manager)

@app.post("/analyze", response_model=JobStatusResponse)
def start_analysis(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    # Determine the source and create job
    if req.path:
        source = req.path
        job_id = job_manager.create_job(source=source)
        background_tasks.add_task(analyze_repository, source, job_id, job_manager)
    elif req.repo_url:
        source = req.repo_url
        job_id = job_manager.create_job(source=source)
        background_tasks.add_task(analyze_github_repository, source, job_id, job_manager)
    elif req.upload_id:
        # TODO: Implement upload handling
        raise HTTPException(status_code=501, detail="File upload analysis not yet implemented")
    else:
        raise HTTPException(status_code=400, detail="One of path, repo_url, or upload_id is required")
    
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
        cached = redis_get_tree(job_id)
        if cached is not None:
            tree = cached
    if tree is None:
        raise HTTPException(status_code=404, detail="tree not found or job incomplete")
    return RepoTreeResponse(job_id=job_id, tree=tree)

@app.get("/repos/{job_id}/search", response_model=SearchResponse)
def search_repository(job_id: str, q: str):
    """Search repository content and provide AI-powered answers."""
    try:
        result = repository_search.search_repository(job_id, q)
        return SearchResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/repos/{job_id}/graph", response_model=GraphResponse)
def get_dependency_graph(job_id: str):
    """Get dependency graph for the repository."""
    try:
        result = dependency_analyzer.generate_dependency_graph(job_id)
        return GraphResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph generation failed: {str(e)}")

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a ZIP file for analysis."""
    # TODO: Implement file upload handling
    raise HTTPException(status_code=501, detail="File upload not yet implemented")


# Background task functions
def analyze_github_repository(repo_url: str, job_id: str, job_manager: JobManager):
    """Background task to analyze a GitHub repository."""
    temp_path = None
    
    def progress_callback(progress: float, message: str):
        job_manager.update_progress(job_id, progress, "downloading", message)
    
    try:
        job_manager.update_progress(job_id, 0.0, "initializing", "Starting GitHub repository analysis")
        
        # Fetch the repository
        temp_path = GitHubFetcher.fetch_repository(repo_url, progress_callback)
        job_manager.set_temp_path(job_id, temp_path)
        
        # Now analyze the downloaded repository
        job_manager.update_progress(job_id, 0.9, "analyzing", "Analyzing repository structure")
        analyze_repository(temp_path, job_id, job_manager)
        # Persist tree to Redis if available
        try:
            tree = job_manager.get_repo_tree(job_id)
            if tree:
                redis_set_tree(job_id, tree)
        except Exception:
            pass
        
    except Exception as e:
        job_manager.update(job_id, state="failed", message=str(e))
        # Clean up on error
        if temp_path:
            try:
                import shutil
                shutil.rmtree(temp_path)
            except:
                pass

# --- Realtime updates via WebSocket ---
@app.websocket("/ws/jobs/{job_id}")
async def job_updates_ws(websocket: WebSocket, job_id: str):
    await websocket.accept()
    import asyncio
    try:
        last_payload = None
        while True:
            status = job_manager.get_status(job_id)
            if not status:
                await websocket.send_json({"type": "error", "message": "job not found"})
                await asyncio.sleep(0.5)
                continue

            payload = {"type": "status", **status}
            # Send only if changed to avoid chatty updates
            if payload != last_payload:
                await websocket.send_json(payload)
                last_payload = payload

            # On completion or failure, send terminal event and optionally the tree
            if status["state"] in ("completed", "failed"):
                terminal = {"type": status["state"], **status}
                if status["state"] == "completed":
                    tree = job_manager.get_repo_tree(job_id)
                    if tree is not None:
                        terminal["tree"] = tree
                await websocket.send_json(terminal)
                break

            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        # Client disconnected; nothing to do
        return

