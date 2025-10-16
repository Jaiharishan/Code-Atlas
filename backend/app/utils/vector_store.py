import os
from typing import List, Dict, Any, Optional

import chromadb
from chromadb.utils import embedding_functions


_client: Optional[chromadb.PersistentClient] = None
_embedding_fn = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        persist_dir = os.getenv("CHROMA_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.chroma")))
        os.makedirs(persist_dir, exist_ok=True)
        _client = chromadb.PersistentClient(path=persist_dir)
    return _client


def _get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is None:
        model_name = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=model_name)
    return _embedding_fn


def _collection_name(job_id: str) -> str:
    return f"job-{job_id}"


def index_summaries(job_id: str, items: List[Dict[str, Any]]) -> None:
    if not items:
        return
    client = _get_client()
    emb_fn = _get_embedding_fn()
    col = client.get_or_create_collection(name=_collection_name(job_id), embedding_function=emb_fn)
    ids = []
    documents = []
    metadatas = []
    for i, it in enumerate(items):
        # it: { path, summary }
        path = it.get("path")
        summary = it.get("summary")
        if not path or not summary:
            continue
        ids.append(f"{path}")
        documents.append(summary)
        metadatas.append({"path": path})
    if not ids:
        return
    # Upsert
    col.upsert(ids=ids, documents=documents, metadatas=metadatas)


def query(job_id: str, text: str, top_k: int = 8) -> List[Dict[str, Any]]:
    client = _get_client()
    emb_fn = _get_embedding_fn()
    col = client.get_or_create_collection(name=_collection_name(job_id), embedding_function=emb_fn)
    res = col.query(query_texts=[text], n_results=top_k)
    results: List[Dict[str, Any]] = []
    ids = res.get("ids", [[]])[0]
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    for i in range(len(ids)):
        results.append({
            "path": (metas[i] or {}).get("path", ids[i]),
            "summary": docs[i] or ""
        })
    return results
