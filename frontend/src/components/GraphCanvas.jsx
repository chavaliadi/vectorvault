import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { getNodeColor } from "../utils/nodeColor";

/**
 * GraphCanvas component.
 * Manages the D3 SVG force simulation canvas and node/edge highlights.
 * Dynamic layout is cooled down to keep rendering completely static after initial loading.
 * Provides a React -> D3 state bridge for dynamic coloring and active traversal edge highlighting.
 * 
 * Props
 * -----
 * graphData : { nodes, edges } | null
 * currentStep : TraversalStep | null
 * hnswResults : list
 * selectedNodeId : int | null
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
  const nodesRef = useRef([]);

  // 1. Initial graph layout rendering (Runs once when graphData updates)
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const width = 800;
    const height = 600;

    // Deep copy coordinates to protect state
    const nodes = graphData.nodes.map((d) => ({ ...d }));
    const edges = graphData.edges.map((d) => ({ ...d }));

    // Initialize force layout simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-20))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(5));

    // Offline pre-calculation to freeze positions statically
    simulation.alpha(1).restart();
    for (let i = 0; i < 110; i++) {
      simulation.tick();
    }
    simulation.stop();

    // Store mutated copy of nodes with computed x/y coordinates
    nodesRef.current = nodes;

    // Build SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clean container

    const g = svg.append("g").attr("class", "zoom-group");

    // Configure zoom and pan behavior
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));

    // Append active traversal edge element
    g.append("line")
      .attr("id", "active-traversal-link")
      .attr("stroke", "none")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "4 4");

    // Render permanent static Layer 1+ links
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

    // Render circle nodes
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

    // Reset selection on canvas backdrop click
    svg.on("click", () => {
      onSelectNode(null);
    });
  }, [graphData]);

  // 2. React -> D3 State Bridge (Runs on traversal progress, inspection changes, or query updates)
  useEffect(() => {
    if (!svgRef.current || nodesRef.current.length === 0) return;
    const svg = d3.select(svgRef.current);
    const nodes = nodesRef.current;

    // A. Update node color transitions dynamically
    svg.selectAll("circle.node")
      .transition()
      .duration(150)
      .attr("fill", (d) => getNodeColor(d, currentStep, hnswResults))
      .attr("r", (d) => {
        const isSelected = selectedNodeId === d.id;
        const maxLayer = d.layers && d.layers.length > 0 ? Math.max(...d.layers) : 0;
        return isSelected ? 8 : (maxLayer > 0 ? 6 : 4);
      })
      .attr("stroke", (d) => (selectedNodeId === d.id ? "#ffffff" : "#0f172a"))
      .attr("stroke-width", (d) => (selectedNodeId === d.id ? 2 : 1));

    // B. Draw/Highlight the active traversal edge between current and evaluating nodes
    const activeLink = svg.select("#active-traversal-link");
    if (currentStep && currentStep.current !== undefined && currentStep.evaluating !== undefined) {
      const srcNode = nodes.find((n) => n.id === currentStep.current);
      const dstNode = nodes.find((n) => n.id === currentStep.evaluating);

      if (srcNode && dstNode) {
        activeLink
          .attr("x1", srcNode.x)
          .attr("y1", srcNode.y)
          .attr("x2", dstNode.x)
          .attr("y2", dstNode.y)
          .attr("stroke", currentStep.accepted ? "#22C55E" : "#EF4444")
          .attr("stroke-width", 3);
      } else {
        activeLink.attr("stroke", "none");
      }
    } else {
      activeLink.attr("stroke", "none");
    }
  }, [currentStep, hnswResults, selectedNodeId]);

  return (
    <div className="graph-canvas-container">
      <svg ref={svgRef} className="graph-canvas-svg"></svg>
    </div>
  );
}
