import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { getNodeColor } from "../utils/nodeColor";

/**
 * GraphCanvas component.
 * Manages the D3 SVG force simulation canvas and node/edge highlights.
 * Dynamic layout is cooled down to keep rendering completely static after initial loading.
 * 
 * Props
 * -----
 * graphData : { nodes, edges } | null
 * currentStep : TraversalStep | null (unused in Phase 4B)
 * hnswResults : list (unused in Phase 4B)
 * selectedNodeId : int | null (unused in Phase 4B rendering)
 * onSelectNode : (nodeId) => void
 */
export default function GraphCanvas({
  graphData,
  currentStep,
  hnswResults,
  selectedNodeId,
  onSelectNode,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const width = 800;
    const height = 600;

    // Deep copy coordinates to protect state
    const nodes = graphData.nodes.map((d) => ({ ...d }));
    const edges = graphData.edges.map((d) => ({ ...d }));

    // 1. Initialize simulation with all HNSW links to semantic cluster
    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-20))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(5));

    // 2. Pre-calculate layout and freeze simulation to keep graph static
    simulation.alpha(1).restart();
    for (let i = 0; i < 110; i++) {
      simulation.tick();
    }
    simulation.stop();

    // Select container elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous nodes

    const g = svg.append("g").attr("class", "zoom-group");

    // 3. Zoom and Pan
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);

    // Initial transform offset
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));

    // 4. Render only upper layer links (Layer 1+), hiding Layer 0 entirely
    const activeEdges = edges.filter((e) => e.layer > 0);
    g.append("g")
      .attr("class", "links-group")
      .selectAll("line")
      .data(activeEdges)
      .enter()
      .append("line")
      .attr("stroke", "rgba(8, 145, 178, 0.4)")
      .attr("stroke-width", 1.5)
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    // 5. Render nodes colored by layer height
    g.append("g")
      .attr("class", "nodes-group")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", (d) => {
        const maxLayer = d.layers && d.layers.length > 0 ? Math.max(...d.layers) : 0;
        return maxLayer > 0 ? 6 : 4;
      })
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("fill", (d) => getNodeColor(d, null, []))
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectNode(d.id);
      });

    // Reset selection on background clicks
    svg.on("click", () => {
      onSelectNode(null);
    });
  }, [graphData]);

  return (
    <div className="graph-canvas-container" style={{ width: "100%", height: "500px", background: "#020617" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
    </div>
  );
}
