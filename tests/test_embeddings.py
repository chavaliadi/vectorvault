"""Unit tests for the embeddings module."""

import os
import tempfile
import pytest
import numpy as np

from backend.embeddings import load_glove, cosine_distance, word_to_vector


def test_load_glove_success():
    """Test loading valid GloVe embeddings file."""
    mock_data = (
        "the 0.418 0.249 -0.412 0.121 0.345 0.1 -0.2 0.3 -0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5\n"
        "and 0.013 0.423 -0.007 0.981 0.111 0.1 -0.2 0.3 -0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5\n"
    )

    with tempfile.NamedTemporaryFile(
        mode="w+", delete=False, encoding="utf-8"
    ) as temp_file:
        temp_file.write(mock_data)
        temp_file_path = temp_file.name

    try:
        words, vectors = load_glove(temp_file_path, max_words=2)
        assert words == ["the", "and"]
        assert vectors.shape == (2, 50)
        assert vectors.dtype == np.float32
        assert np.allclose(vectors[0][:5], [0.418, 0.249, -0.412, 0.121, 0.345])
    finally:
        os.remove(temp_file_path)


def test_load_glove_malformed_skipped():
    """Test that malformed lines are skipped and logged, not causing a crash."""
    mock_data = (
        "the 0.418 0.249 -0.412\n"  # Too short, should be skipped
        "and 0.013 0.423 -0.007 0.981 0.111 0.1 -0.2 0.3 -0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5\n"  # Valid
        "badword not_a_float 0.423 -0.007 0.981 0.111 0.1 -0.2 0.3 -0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5 "
        "0.1 0.2 0.3 0.4 0.5 0.1 0.2 0.3 0.4 0.5\n"  # Invalid float, skipped
    )

    with tempfile.NamedTemporaryFile(
        mode="w+", delete=False, encoding="utf-8"
    ) as temp_file:
        temp_file.write(mock_data)
        temp_file_path = temp_file.name

    try:
        words, vectors = load_glove(temp_file_path, max_words=3)
        assert words == ["and"]
        assert vectors.shape == (1, 50)
    finally:
        os.remove(temp_file_path)


def test_load_glove_file_not_found():
    """Test that load_glove raises FileNotFoundError when file doesn't exist."""
    with pytest.raises(FileNotFoundError):
        load_glove("non_existent_file_path_12345.txt")


def test_cosine_distance_identical():
    """Test cosine distance between identical vectors."""
    a = np.array([1.0, 2.0, 3.0, 4.0, 5.0], dtype=np.float32)
    b = np.array([1.0, 2.0, 3.0, 4.0, 5.0], dtype=np.float32)
    assert pytest.approx(cosine_distance(a, b), abs=1e-6) == 0.0


def test_cosine_distance_orthogonal():
    """Test cosine distance between orthogonal vectors."""
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    assert pytest.approx(cosine_distance(a, b), abs=1e-6) == 1.0


def test_cosine_distance_opposite():
    """Test cosine distance between opposite vectors."""
    a = np.array([1.0, -1.0, 2.0], dtype=np.float32)
    b = np.array([-1.0, 1.0, -2.0], dtype=np.float32)
    assert pytest.approx(cosine_distance(a, b), abs=1e-6) == 2.0


def test_cosine_distance_zero_vector():
    """Test cosine distance handling of near-zero vectors."""
    a = np.array([0.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    assert cosine_distance(a, b) == 1.0

    a_tiny = np.array([1e-10, 0.0, 0.0], dtype=np.float32)
    assert cosine_distance(a_tiny, b) == 1.0


def test_word_to_vector_found():
    """Test looking up an existing word's vector."""
    words = ["apple", "banana", "cherry"]
    vectors = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]], dtype=np.float32)

    vec = word_to_vector("banana", words, vectors)
    assert vec is not None
    assert np.array_equal(vec, np.array([3.0, 4.0], dtype=np.float32))


def test_word_to_vector_not_found():
    """Test looking up a non-existent word."""
    words = ["apple", "banana", "cherry"]
    vectors = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]], dtype=np.float32)

    vec = word_to_vector("dragonfruit", words, vectors)
    assert vec is None
