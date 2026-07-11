/**
 * Utility to map nodes to their layer-based base colors.
 * Traversal colors are NOT implemented in Phase 4B.
 */

/**
 * Returns a layer-specific color for a node.
 * @param {object} node
 * @param {object|null} currentStep
 * @param {Array} hnswResults
 * @returns {string}
 */
export function getNodeColor(node, currentStep, hnswResults = []) {
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
