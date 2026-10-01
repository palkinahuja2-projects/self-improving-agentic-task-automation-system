import hashlib
import math
from typing import List


class EmbeddingService:
    """
    Generates normalized numerical vector embeddings for text strings.
    Uses a fast, deterministic feature-hashing embedding generator with 64 dimensions,
    ensuring zero external latency, offline readiness, and consistent similarity properties.
    """

    DIMENSION: int = 64

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """Convert a single text string into a normalized floating point vector."""
        if not text:
            return [0.0] * cls.DIMENSION

        text_clean = text.strip().lower()
        vector = [0.0] * cls.DIMENSION

        # Tokenize words and hash tokens into vector bins
        tokens = text_clean.split()
        for token in tokens:
            for char_idx, char in enumerate(token):
                bin_idx = (ord(char) * (char_idx + 1)) % cls.DIMENSION
                val = (int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16) % 100) / 100.0
                vector[bin_idx] += val

        # Add n-gram frequency signals
        for i in range(len(text_clean) - 2):
            trigram = text_clean[i : i + 3]
            bin_idx = int(hashlib.sha256(trigram.encode('utf-8')).hexdigest(), 16) % cls.DIMENSION
            vector[bin_idx] += 1.0

        # Normalize vector to unit length
        magnitude = math.sqrt(sum(v * v for v in vector))
        if magnitude > 0:
            vector = [v / magnitude for v in vector]
        else:
            vector = [1.0 / math.sqrt(cls.DIMENSION)] * cls.DIMENSION

        return vector

    @classmethod
    def generate_embeddings(cls, texts: List[str]) -> List[List[float]]:
        """Convert a batch of text strings into vector embeddings."""
        return [cls.generate_embedding(t) for t in texts]


embedding_service = EmbeddingService()
