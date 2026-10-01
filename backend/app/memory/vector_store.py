import math
import os
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger

from app.core.config import settings

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False


class ChromaVectorStore:
    """
    Manages vector embeddings storage and semantic similarity search using ChromaDB,
    with an in-memory fallback vector index.
    """

    COLLECTION_NAME = "agentic_memories"

    def __init__(self, persist_directory: Optional[str] = None):
        self.persist_directory = persist_directory or settings.chroma_persist_directory
        self._fallback_store: Dict[str, Dict[str, Any]] = {}
        self._collection = None
        self._init_chroma()

    def _init_chroma(self) -> None:
        if not HAS_CHROMADB:
            logger.info("ChromaDB package not installed; using in-memory vector store fallback.")
            return

        import sys
        if sys.platform == "win32" and sys.version_info >= (3, 13):
            logger.warning("Windows Python 3.13 detected; using in-memory vector store fallback to prevent C++ DLL Access Violation.")
            self._collection = None
            return

        try:
            os.makedirs(self.persist_directory, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
                embedding_function=None,
            )
            logger.info(f"Initialized ChromaDB persistent client at '{self.persist_directory}'.")
        except Exception as e:
            logger.warning(f"Failed to initialize ChromaDB ({e}); falling back to in-memory vector store.")
            self._collection = None

    def add_vector(
        self,
        memory_id: str,
        embedding: List[float],
        metadata: Dict[str, Any],
        document_text: str = "",
    ) -> None:
        """Insert or update a memory vector record."""
        # Sanitize metadata values to primitive types for ChromaDB compatibility
        chroma_metadata = {}
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                chroma_metadata[k] = v
            else:
                chroma_metadata[k] = str(v)

        if self._collection is not None:
            try:
                self._collection.upsert(
                    ids=[memory_id],
                    embeddings=[embedding],
                    metadatas=[chroma_metadata],
                    documents=[document_text or " "],
                )
                return
            except Exception as e:
                import traceback
                print(f"UPSERT EXCEPTION: {e}", flush=True)
                traceback.print_exc()
                logger.error(f"Error upserting vector into ChromaDB: {e}")

        # Fallback storage
        self._fallback_store[memory_id] = {
            "embedding": embedding,
            "metadata": chroma_metadata,
            "document": document_text,
        }

    def query_similar(
        self,
        query_embedding: List[float],
        user_id: str,
        agent_id: Optional[str] = None,
        memory_type: Optional[str] = None,
        limit: int = 10,
        min_similarity: float = 0.0,
    ) -> List[Tuple[str, float]]:
        """
        Query top-k most similar vector records matching user_id and optional agent_id / memory_type filters.
        Returns a list of tuples: (memory_id, similarity_score).
        """
        # Build Chroma metadata filter
        where_conditions = [{"user_id": user_id}]
        if agent_id:
            where_conditions.append({"agent_id": agent_id})
        if memory_type:
            where_conditions.append({"memory_type": memory_type})

        where_clause = (
            where_conditions[0]
            if len(where_conditions) == 1
            else {"$and": where_conditions}
        )

        if self._collection is not None:
            try:
                if self._collection.count() > 0:
                    results = self._collection.query(
                        query_embeddings=[query_embedding],
                        n_results=limit,
                        where=where_clause,
                        include=["distances"],
                    )

                    matches = []
                    ids = results.get("ids", [[]])[0]
                    distances = results.get("distances", [[]])[0]

                    for mid, dist in zip(ids, distances):
                        # Chroma cosine space distance = 1 - cosine_similarity
                        similarity = max(0.0, min(1.0, 1.0 - float(dist)))
                        if similarity >= min_similarity:
                            matches.append((mid, similarity))
                    return matches

            except Exception as e:
                logger.warning(f"ChromaDB query failed ({e}); using fallback search.")

        # Fallback cosine search
        matches = []
        for mid, data in self._fallback_store.items():
            meta = data["metadata"]
            if meta.get("user_id") != user_id:
                continue
            if agent_id and meta.get("agent_id") != agent_id:
                continue
            if memory_type and meta.get("memory_type") != memory_type:
                continue

            sim = self._cosine_similarity(query_embedding, data["embedding"])
            if sim >= min_similarity:
                matches.append((mid, sim))

        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[:limit]

    def delete_vector(self, memory_id: str) -> None:
        """Delete a vector record by memory_id."""
        if self._collection is not None:
            try:
                self._collection.delete(ids=[memory_id])
            except Exception as e:
                logger.error(f"Error deleting vector from ChromaDB: {e}")

        self._fallback_store.pop(memory_id, None)

    def delete_vectors_by_user(self, user_id: str, memory_type: Optional[str] = None) -> None:
        """Delete all vector records for a given user_id and optional memory_type."""
        where_conditions = [{"user_id": user_id}]
        if memory_type:
            where_conditions.append({"memory_type": memory_type})

        where_clause = (
            where_conditions[0]
            if len(where_conditions) == 1
            else {"$and": where_conditions}
        )

        if self._collection is not None:
            try:
                self._collection.delete(where=where_clause)
            except Exception as e:
                logger.error(f"Error bulk deleting vectors from ChromaDB: {e}")

        # Delete from fallback
        keys_to_del = [
            mid
            for mid, data in self._fallback_store.items()
            if data["metadata"].get("user_id") == user_id
            and (not memory_type or data["metadata"].get("memory_type") == memory_type)
        ]
        for k in keys_to_del:
            self._fallback_store.pop(k, None)

    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two float vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot = sum(a * b for a, b in zip(vec1, vec2))
        mag1 = math.sqrt(sum(a * a for a in vec1))
        mag2 = math.sqrt(sum(b * b for b in vec2))
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (mag1 * mag2)))


vector_store = ChromaVectorStore()
