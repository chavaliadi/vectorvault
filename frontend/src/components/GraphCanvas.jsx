import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getNodeColor } from "../utils/nodeColor";

export default function GraphCanvas({
  graphData,
  currentStep,
  currentStepIdx,
  steps = [],
  hnswResults = [],
  selectedNodeId,
  onSelectNode,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const simulationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle window resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 800,
          height: height || 600,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute active node IDs in the search path up to the current timeline playhead
  const activePathNodeIds = new Set();
  if (steps && currentStepIdx >= 0) {
    for (let i = 0; i <= currentStepIdx; i++) {
      const step = steps[i];
      activePathNodeIds.add(step.current);
      activePathNodeIds.add(step.evaluating);
    }
  }

  // Initialize and run the simulation once graph data is loaded
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const width = dimensions.width;
    const height = dimensions.height;

    // Create deep copy of graphData nodes and edges to prevent mutating original props
    const nodes = graphData.nodes.map((d) => ({ ...d }));
    const edges = graphData.edges.map((d) => ({ ...d }));

    // 1. Initialize static layout simulation using tick loop limits to cool CPU
    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d) => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-25))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(6));

    // Pre-calculate positions offline and freeze simulation
    simulation.alpha(1).restart();
    for (let i = 0; i < 100; i++) {
      simulation.tick();
    }
    simulation.stop();
    simulationRef.current = { nodes, edges };

    // Set up SVG container selections
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous nodes

    const g = svg.append("g").attr("class", "zoom-group");
    gRef.current = g;

    // 2. Set up Zoom and Pan boundary
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);

    // Initial zoom setting to fit the cluster layout
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));

    // 3. Render Link lines
    g.append("g")
      .attr("class", "links-group")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("class", (d) => `link layer-${d.layer}`)
      .attr("stroke", (d) => (d.layer > 0 ? "rgba(8, 145, 178, 0.4)" : "rgba(100, 116, 139, 0.08)"))
      .attr("stroke-width", (d) => (d.layer > 0 ? 1.5 : 1))
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    // 4. Render Node circles
    const nodeSelection = g
      .append("g")
      .attr("class", "nodes-group")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", (d) => {
        const maxLayer = d.layers && d.layers.length > 0 ? Math.max(...d.layers) : 0;
        return maxLayer > 0 ? 6 : 4; // Make upper layer portal nodes slightly larger
      })
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("fill", (d) => getNodeColor(d, null, []))
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectNode(d.id);
      })
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 2);
        // Tooltip rendering
        const tooltip = d3.select("#graph-tooltip");
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.word}</strong> (Layers: ${d.layers.join(", ")})`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#0f172a").attr("stroke-width", 1);
        d3.select("#graph-tooltip").style("opacity", 0);
      });

    // Reset Zoom action on canvas background click
    svg.on("click", () => {
      onSelectNode(null);
    });

  }, [graphData, dimensions.width, dimensions.height]);

  // Recolor nodes and toggle link displays based on animation timeline state changes
  useEffect(() => {
    if (!simulationRef.current || !gRef.current) return;
    const { nodes, edges } = simulationRef.current;

    const g = gRef.current;

    // 1. Recolor nodes using direct DOM manipulation (fast 60fps path)
    g.selectAll("circle")
      .data(nodes)
      .transition()
      .duration(200)
      .attr("fill", (d) => getNodeColor(d, currentStep, hnswResults))
      .attr("r", (d) => {
        const isFinal = hnswResults.some((res) => res.id === d.id);
        const isActive = currentStep && (currentStep.current === d.id || currentStep.evaluating === d.id);
        if (isFinal || isActive) return 8; // Highlight active timeline items
        const maxLayer = d.layers && d.layers.length > 0 ? Math.max(...d.layers) : 0;
        return maxLayer > 0 ? 6 : 4;
      });

    // 2. Hide Layer 0 hairballs; only render connections that are part of the active trajectory
    g.selectAll("line")
      .data(edges)
      .transition()
      .duration(200)
      .attr("stroke", (d) => {
        const srcId = d.source.id;
        const dstId = d.target.id;

        // Check if the edge is the active traversal edge in the current step
        const isCurrentStepEdge =
          currentStep &&
          ((currentStep.current === srcId && currentStep.evaluating === dstId) ||
            (currentStep.current === dstId && currentStep.evaluating === srcId));

        if (isCurrentStepEdge) {
          return currentStep.accepted ? "#22C55E" : "#EF4444"; // Bold Traversal link
        }

        // Check if connection is part of the traversed path
        const isPathLink = activePathNodeIds.has(srcId) && activePathNodeIds.has(dstId);
        if (isPathLink) {
          return "rgba(34, 197, 94, 0.4)"; // Soft path color
        }

        // Check if connected to inspected node
        if (selectedNodeId !== null && (srcId === selectedNodeId || dstId === selectedNodeId)) {
          return "rgba(56, 189, 248, 0.7)"; // Highlighting neighbor edges
        }

        // Render sparse upper layers
        if (d.layer > 0) {
          return "rgba(8, 145, 178, 0.3)";
        }

        // Base Layer 0 edges are hidden unless involved in active path
        return "rgba(100, 116, 139, 0.0)";
      })
      .attr("stroke-width", (d) => {
        const srcId = d.source.id;
        const dstId = d.target.id;
        const isCurrentStepEdge =
          currentStep &&
          ((currentStep.current === srcId && currentStep.evaluating === dstId) ||
            (currentStep.current === dstId && currentStep.evaluating === srcId));
        if (isCurrentStepEdge) return 3;
        if (selectedNodeId !== null && (srcId === selectedNodeId || dstId === selectedNodeId)) return 2;
        return d.layer > 0 ? 1.5 : 1;
      });
  }, [currentStepIdx, currentStep, hnswResults, selectedNodeId]);

  return (
    <div className="graph-canvas-container" ref={containerRef}>
      <svg ref={svgRef} className="graph-svg"></svg>
      <div id="graph-tooltip" className="graph-tooltip" style={{ opacity: 0 }}></div>
      <div className="legend-overlay">
        <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#1E293B" }}></span>Layer 0</div>
        <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#0D9488" }}></span>Layer 1</div>
        <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#0891B2" }}></span>Layer 2</div>
        {steps.length > 0 && (
          <>
            <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#EAB308" }}></span>Current Node</div>
            <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#22C55E" }}></span>Accepted Node</div>
            <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#EF4444" }}></span>Rejected Node</div>
            <div className="legend-item"><span className="legend-color" style={{ backgroundColor: "#3B82F6" }}></span>Top-k Result</div>
          </>
        )}
      </div>
    </div>
  );
}
