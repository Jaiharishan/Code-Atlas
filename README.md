# Repo Insight MVP (FastAPI)

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

## Use

1. Start the server (see above).
2. Analyze a local path (example):

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d {path:/path/to/your/repo}
```

3. Poll the job status:

```bash
curl http://localhost:8000/jobs/<job_id>
```

4. Get the computed tree:

```bash
curl http://localhost:8000/repos/<job_id>/tree
```

Notes:
- MVP supports local filesystem path only. Add GitHub fetch in next step.
- Large/binary files are summarized minimally.
- Summaries are naive; replace with LLM calls later.

