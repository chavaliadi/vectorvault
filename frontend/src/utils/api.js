const API_BASE_URL = "http://localhost:8000";

/**
 * Fetch the complete HNSW graph structure.
 * @returns {Promise<{nodes: Array, edges: Array}>}
 */
export async function fetchGraph() {
  const response = await fetch(`${API_BASE_URL}/graph`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph structure: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch global benchmark statistics.
 * @returns {Promise<{avg_hnsw_time_ms: number, avg_brute_force_time_ms: number, avg_recall: number, queries_run: number}>}
 */
export async function fetchBenchmark() {
  const response = await fetch(`${API_BASE_URL}/benchmark`);
  if (!response.ok) {
    throw new Error(`Failed to fetch benchmark statistics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Perform a vector search query.
 * @param {string} word
 * @param {number} k
 * @param {number} ef
 * @returns {Promise<object>}
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
    throw new Error(`Query search failed: ${response.statusText}`);
  }

  return response.json();
}
