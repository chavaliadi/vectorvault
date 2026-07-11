const API_BASE_URL = "http://localhost:8000";

/**
 * Fetch the complete HNSW graph structure (nodes and edges).
 * @returns {Promise<{nodes: Array, edges: Array}>}
 */
export async function fetchGraph() {
  const response = await fetch(`${API_BASE_URL}/graph`);
  if (!response.ok) {
    throw new Error("Failed to fetch graph structure from API.");
  }
  return response.json();
}

/**
 * Fetch global benchmark statistics from the backend.
 * @returns {Promise<{avg_hnsw_time_ms: number, avg_brute_force_time_ms: number, avg_recall: number, queries_run: number}>}
 */
export async function fetchBenchmark() {
  const response = await fetch(`${API_BASE_URL}/benchmark`);
  if (!response.ok) {
    throw new Error("Failed to fetch benchmark statistics.");
  }
  return response.json();
}

/**
 * Perform a vector search query for a word.
 * @param {string} word - The query word.
 * @param {number} k - Top-k results.
 * @param {number} ef - Search beam size.
 * @returns {Promise<object>} Response payload containing steps, results, and stats.
 */
export async function searchWord(word, k = 10, ef = 50) {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      word: word.trim().toLowerCase(),
      k,
      ef,
    }),
  });

  if (response.status === 404) {
    throw new Error(`Word "${word}" not found in vocabulary.`);
  }

  if (!response.ok) {
    throw new Error("Query failed due to a server error.");
  }

  return response.json();
}
