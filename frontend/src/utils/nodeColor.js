/**
 * Determines the color value for a node based on its active visualization role.
 *
 * @param {object} node - The node object containing id and layers list.
 * @param {object|null} currentStep - The active step dict in traversal trajectory.
 * @param {Array} hnswResults - List of final HNSW SearchResult matches.
 * @returns {string} The HEX or HSL CSS color value.
 */
export function getNodeColor(node, currentStep, hnswResults = []) {
  const nodeId = node.id;

  // 1. Check if node is in the final top-k search results (Blue)
  const isFinalResult = hnswResults.some((res) => res.id === nodeId);
  if (isFinalResult) {
    return "#3B82F6"; // Royal Blue
  }

  // 2. Traversal State Highlights
  if (currentStep) {
    // Current hop node being evaluated (Yellow)
    if (currentStep.current === nodeId) {
      return "#EAB308";
    }

    // Evaluating neighbor check
    if (currentStep.evaluating === nodeId) {
      return currentStep.accepted ? "#22C55E" : "#EF4444"; // Accepted: Green, Rejected: Red
    }
  }

  // 3. Static Layer Color Coding
  const maxLayer = node.layers && node.layers.length > 0 ? Math.max(...node.layers) : 0;
  switch (maxLayer) {
    case 0:
      return "#1E293B"; // Dark Slate (dense baseline layer 0)
    case 1:
      return "#0D9488"; // Teal
    case 2:
      return "#0891B2"; // Cyan
    case 3:
      return "#2563EB"; // Blue
    default:
      return "#8B5CF6"; // Violet (top layer levels)
  }
}
