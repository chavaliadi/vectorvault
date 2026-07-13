"""Vector mathematical utilities and GloVe embeddings loader.

Provides functions to parse pre-trained word embedding files,
compute normalized cosine distance, and map vocabulary tokens.
"""

import os
import logging
import numpy as np

logger = logging.getLogger(__name__)


def load_glove(path: str, max_words: int = 5000) -> tuple[list[str], np.ndarray]:
    """Load GloVe word vectors from a text file.

    Complexity: O(N * D) where N is max_words and D is vector dimension (50).

    Parameters
    ----------
    path : str
        The file path to the GloVe text file.
    max_words : int, optional
        The maximum number of words to load, by default 5000.

    Returns
    -------
    tuple[list[str], np.ndarray]
        A tuple containing:
        - A list of words (length up to max_words).
        - A 2D NumPy array of shape (len(words), 50) containing the vectors.

    Raises
    ------
    FileNotFoundError
        If the file at the specified path does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"GloVe file not found at: {path}")

    words: list[str] = []
    vectors_list: list[np.ndarray] = []
    expected_dim = 50

    with open(path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            if len(words) >= max_words:
                break

            parts = line.strip().split()
            if not parts:
                continue

            word = parts[0]
            vector_str = parts[1:]

            if len(vector_str) != expected_dim:
                logger.warning(
                    "Line %d in %s was skipped: expected %d dimensions, got %d.",
                    line_num,
                    path,
                    expected_dim,
                    len(vector_str),
                )
                continue

            try:
                vector = np.array([float(x) for x in vector_str], dtype=np.float32)
                words.append(word)
                vectors_list.append(vector)
            except ValueError as e:
                logger.warning(
                    "Line %d in %s was skipped due to parsing error: %s",
                    line_num,
                    path,
                    e,
                )
                continue

    if not words:
        return words, np.empty((0, expected_dim), dtype=np.float32)

    vectors = np.array(vectors_list, dtype=np.float32)
    return words, vectors


def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    """Compute the cosine distance between two vectors.

    Complexity: O(D) where D is the dimension of the vectors.

    Parameters
    ----------
    a : np.ndarray
        First vector of shape (D,).
    b : np.ndarray
        Second vector of shape (D,).

    Returns
    -------
    float
        The cosine distance between a and b, defined as 1 - cosine_similarity.
        Returns 1.0 if either vector has a norm near zero.
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a < 1e-9 or norm_b < 1e-9:
        return 1.0

    dot_product = np.dot(a, b)
    similarity = dot_product / (norm_a * norm_b)

    # Clip similarity to avoid floating point precision issues outside [-1.0, 1.0]
    similarity = np.clip(similarity, -1.0, 1.0)

    return float(1.0 - similarity)


def word_to_vector(
    word: str, words: list[str], vectors: np.ndarray
) -> np.ndarray | None:
    """Retrieve the vector representation of a word.

    Complexity: O(N) where N is the number of words.

    Parameters
    ----------
    word : str
        The word to search for.
    words : list[str]
        List of words in the vocabulary.
    vectors : np.ndarray
        The array of corresponding vector embeddings.

    Returns
    -------
    np.ndarray | None
        The 50-dimensional vector if the word is in the vocabulary,
        otherwise None.
    """
    try:
        idx = words.index(word)
        return vectors[idx]
    except ValueError:
        return None
