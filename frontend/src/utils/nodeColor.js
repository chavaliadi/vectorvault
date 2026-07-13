/**
 * Utility to map nodes to their layer-based base colors or active traversal colors.
 */

/**
 * Returns color for a node based on search trajectory or layers.
 * @param {object} node
 * @param {object|null} currentStep
 * @param {Array} hnswResults
 * @returns {string}
 */
export function getNodeColor(node, currentStep, hnswResults = []) {
  const nodeId = node.id;

  // 1. Check if node is in the final top-k search results (Blue)
  const isFinalResult = hnswResults && hnswResults.some((res) => res.id === nodeId);
  if (isFinalResult) {
    return "#3B82F6"; // Royal Blue
  }

  // 2. Traversal State Highlights
  if (currentStep) {
    // Current node -> Yellow
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
      return "#1E293B"; // Slate (Layer 0)
    case 1:
      return "#0D9488"; // Teal (Layer 1)
    case 2:
      return "#0891B2"; // Cyan (Layer 2)
    case 3:
      return "#2563EB"; // Blue (Layer 3)
    default:
      return "#8B5CF6"; // Violet (Layer 4+)
  }
}
