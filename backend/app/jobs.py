import threading
import uuid
from typing import Dict, Optional, Any

class Job:
    def __init__(self, source: str):
        self.id = str(uuid.uuid4())
        self.source = source
        self.state = "queued"
        self.progress = 0.0
        self.message = "queued"
        self.tree = None
        self._lock = threading.Lock()

class JobManager:
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()

    def create_job(self, source: str) -> str:
        job = Job(source)
        with self._lock:
            self._jobs[job.id] = job
        return job.id

    def update(self, job_id: str, *, state: Optional[str] = None, progress: Optional[float] = None, message: Optional[str] = None, tree: Optional[Any] = None) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return
        with job._lock:
            if state is not None:
                job.state = state
            if progress is not None:
                job.progress = progress
            if message is not None:
                job.message = message
            if tree is not None:
                job.tree = tree

    def get_status(self, job_id: str):
        job = self._jobs.get(job_id)
        if not job:
            return None
        return {
            "job_id": job.id,
            "state": job.state,
            "progress": job.progress,
            "message": job.message,
        }

    def get_repo_tree(self, job_id: str):
        job = self._jobs.get(job_id)
        if not job:
            return None
        return job.tree

