# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Code Atlas is a repository analysis tool that identifies repo structure, languages, and generates intelligent summaries. The MVP supports GitHub URLs and local repositories, producing directory and file-level summaries with a collapsible tree interface and basic search capabilities.

**MVP Scope:**
- Identify repo structure and languages; ignore vendored/lock/build output
- Produce directory-level and file-level summaries; extract top functions/classes
- Render collapsible tree with explanations; download JSON report
- Basic search over summaries; RAG over embeddings for "What does X do?" queries
- Input: GitHub URL (public) or local zip; rate-limit safe, resumable jobs
- Target: small repos <1 min; medium repos <3-5 min

**Success Criteria:**
- 90%+ of files assigned to correct purpose buckets in 3 mixed-language repos
- ≥80% user rating that summaries are "useful" (≥4 on 5-point scale)
- Handle 99th percentile pathologically large files with timeouts/retries

## Development Commands

### Backend (FastAPI)
```bash
# Setup and run backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev        # Start development server with Turbopack
npm run build      # Build for production with Turbopack
npm run start      # Start production server
npm run lint       # Run ESLint
```

## API Design (MVP)

```bash
# Start analysis
POST /analyze { repo_url | upload_id }

# Check job progress
GET /jobs/{id} → { progress, stats }

# Get repository tree
GET /repos/{id}/tree → directory nodes with summaries

# Search repository
GET /repos/{id}/search?q=...

# Optional: dependency graph
GET /repos/{id}/graph
```

Example usage:
```bash
curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d '{"repo_url":"https://github.com/user/repo"}'
curl http://localhost:8000/jobs/<job_id>
curl http://localhost:8000/repos/<job_id>/tree
```

## Architecture

### High-Level Flow
1. **Ingestion**: GitHub fetcher or local upload → unpack → file walker with .gitignore + heuristics
2. **Parsing**: Language detect → lightweight parsers for symbols → chunking + embedding
3. **Analysis**: Heuristics + LLM calls for file/directory summaries → roll-up to repo summary
4. **Serving**: REST API for jobs/results + search/Q&A endpoint + frontend SPA

### Backend Structure
- **`backend/app/main.py`** - FastAPI application with CORS middleware and route handlers
- **`backend/app/jobs.py`** - Job management system with threading for background tasks
- **`backend/app/schemas.py`** - Pydantic models for requests/responses and repository tree structure
- **`backend/app/walker.py`** - Repository analysis logic with language detection
- **`backend/app/summarizer.py`** - LLM-powered file and directory summarization
- **`backend/app/utils/`** - Utility functions including ignore file handling

### Frontend Structure  
- **Next.js 15** with App Router architecture
- **Turbopack** for fast development and builds
- **Tailwind CSS** for styling with PostCSS configuration
- **TypeScript** for type safety
- **React Flow or Cytoscape.js** for dependency graphs (planned)
- MVP UI: repo input page → progress → explorer (tree + details panel) + search

### Data Model (MVP)
```
Repo: id, source, commit, status, settings
File: path, language, hash, size, role, summary, embedding_id
Directory: path, summary, children
Job: id, repo_id, state, progress, timings, errors
Edge: from_path, to_path, type (import, call, asset)
```

### Tech Stack
- **Backend**: FastAPI (Python) - richer parsing libs than TS
- **Workers**: Threading (current) → Celery/RQ with Redis (planned)
- **DB**: In-memory (current) → Postgres + pgvector (planned)
- **LLM**: Naive summaries (current) → GPT-4o/Claude 3.5 Sonnet (planned)
- **Embeddings**: None (current) → text-embedding-3-large (planned)
- **Parsers**: Basic detection → Tree-sitter for symbol extraction (planned)
- **Frontend**: Next.js + React + Tailwind

### Key Algorithms
- **Language-aware chunking**: Cut at function/class boundaries
- **Directory summarization**: Aggregate child summaries + filenames
- **Role classification**: Classify files (config, model, controller, test, script, infra, docs)
- **Dependency extraction**: Regex + parser-based import graphs
- **Quality gates**: Cap tokens, cache file hashes, retry with backoff, skip binaries

## Feature Roadmap

**MVP** (Current focus):
- Repo fetch (public GitHub/local), ignore rules, language detect
- Chunk + embed + summarize per directory/file
- Simple graph view, JSON export, basic Q&A

**v1**:
- Private repos via OAuth + Git provider apps
- Per-language analyzers (TS/JS, Python, Go, Java) with AST
- Dependency graphs (imports, services, DB) + cross-ref links
- Better UI: map view, breadcrumbs, diff-aware re-index

**v2+**:
- PR diffs explanation, architectural smells, ownership detection
- CI integration, badges, watch mode
- On-device redaction, SOC2 posture, team sharing

## Current State

This is an early MVP with basic local filesystem analysis. Key limitations:
- No GitHub URL support yet (local paths only)
- Naive file summaries (no LLM integration)
- No embedding/search capabilities
- No dependency graph extraction
- Simple threading (no job queues)
- In-memory storage (no persistence)
