import React, { Component } from "react";
import * as d3 from "d3";

class InteractiveStreamGraph extends Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.tooltipRef = React.createRef();
  }

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.renderChart();
  }

  renderChart() {
    const chartData = this.props.csvData;
    console.log("Rendering chart with data:", chartData);
    
    // Don't render if data is empty
    if (!chartData || chartData.length === 0) {
        return;
    }
    
    // Define the LLM model names to visualize
    const llmModels = ["GPT-4", "Gemini", "PaLM-2", "Claude", "LLaMA-3.1"];
    
    // Write the D3.js code to create the interactive streamgraph visualization here

    // Define colors
    const colors = {
      "GPT-4": "#e41a1c",
      "Gemini": "#377eb8",
      "PaLM-2": "#4daf4a",
      "Claude": "#984ea3",
      "LLaMA-3.1": "#ff7f00"
    };

    // Clear previous render
    d3.select(this.svgRef.current).selectAll("*").remove();
    d3.select(this.tooltipRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 220, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(this.svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data
    const data = chartData.map(d => {
      const obj = { date: d.Date };
      llmModels.forEach(model => {
        obj[model] = d[model] || 0;
      });
      return obj;
    });

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);

    // Stack data
    const stack = d3.stack()
      .keys(llmModels)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetWiggle);

    const stackedData = stack(data);

    // Calculate y 
    const yMin = d3.min(stackedData, d => d3.min(d, v => v[0]));
    const yMax = d3.max(stackedData, d => d3.max(d, v => v[1]));

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height, 0]);

    // Create area generator
    const area = d3.area()
      .x(d => xScale(d.data.date))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis);

    // Draw streamgraph 
    g.selectAll(".stream")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", "stream")
      .attr("fill", d => colors[d.key])
      .attr("d", area)
      .on("mouseover", function(event, d) {
        showTooltip(event, d);
      })
      .on("mousemove", function(event, d) {
        updateTooltip(event, d);
      })
      .on("mouseout", function() {
        hideTooltip();
      });

    // Add x-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat("%b"))
      .tickPadding(8);
    
    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    
    // Style x-axis
    xAxisGroup.selectAll("text")
      .style("text-anchor", "middle")
      .attr("dy", "0.5em");
    
    // Style x-axis line
    xAxisGroup.select(".domain")
      .style("stroke", "#000");


    // Create legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width + margin.left + 30}, ${margin.top})`);

    // Fix order
    const legendModels = [...llmModels].reverse();

    const legendItems = legend.selectAll(".legend-item")
      .data(legendModels)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", d => colors[d]);

    legendItems.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text(d => d);

    // Tooltip
      const tooltip = d3.select(this.tooltipRef.current)
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("border", "2px solid #333")
        .style("padding", "15px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
        .style("pointer-events", "none")
        .style("z-index", "1000");

      const containerNode = this.svgRef.current.parentNode;

    let currentModel = null;

    function showTooltip(event, d) {
      const model = d.key;
      
      if (currentModel !== model) {
        currentModel = model;
        const modelData = data.map(row => ({
          date: row.date,
          value: row[model]
        }));

        // Tooltip dimensions
        const tooltipWidth = 280;
        const tooltipHeight = 200;
        const tooltipMargin = { top: 25, right: 25, bottom: 35, left: 50 };
        const chartWidth = tooltipWidth - tooltipMargin.left - tooltipMargin.right;
        const chartHeight = tooltipHeight - tooltipMargin.top - tooltipMargin.bottom;

        tooltip.html("");

        // Tooltip SVG
        const tooltipSvg = tooltip.append("svg")
          .attr("width", tooltipWidth)
          .attr("height", tooltipHeight);

        const tooltipG = tooltipSvg.append("g")
          .attr("transform", `translate(${tooltipMargin.left},${tooltipMargin.top})`);

        // Scales for mini bar chart
        const tooltipXScale = d3.scaleTime()
          .domain(d3.extent(modelData, d => d.date))
          .range([0, chartWidth]);

        const tooltipYScale = d3.scaleLinear()
          .domain([0, d3.max(modelData, d => d.value)])
          .range([chartHeight, 0]);

        // Create bars
        tooltipG.selectAll(".bar")
          .data(modelData)
          .enter()
          .append("rect")
          .attr("class", "bar")
          .attr("x", d => tooltipXScale(d.date))
          .attr("width", chartWidth / modelData.length - 2)
          .attr("y", d => tooltipYScale(d.value))
          .attr("height", d => chartHeight - tooltipYScale(d.value))
          .attr("fill", colors[model]);

        // Tooltip x-axis
        const tooltipXAxis = d3.axisBottom(tooltipXScale)
          .tickFormat(d3.timeFormat("%b"));
        const xAxisGroup = tooltipG.append("g")
          .attr("transform", `translate(0,${chartHeight})`)
          .call(tooltipXAxis);
        
        xAxisGroup.selectAll("text")
          .style("font-size", "12px")
          .style("font-weight", "500");
        
        xAxisGroup.selectAll(".domain, .tick line")
          .style("stroke", "#333")
          .style("stroke-width", "1.5px");

        // Tooltip y-axis
        const tooltipYAxis = d3.axisLeft(tooltipYScale);
        const yAxisGroup = tooltipG.append("g")
          .call(tooltipYAxis);
        
        yAxisGroup.selectAll("text")
          .style("font-size", "12px")
          .style("font-weight", "500");
        
        yAxisGroup.selectAll(".domain, .tick line")
          .style("stroke", "#333")
          .style("stroke-width", "1.5px");
      }


      updateTooltip(event, d);
    }

    function updateTooltip(event, d) {
        const rect = containerNode.getBoundingClientRect();
        const left = event.clientX - rect.left;
        const top = event.clientY - rect.top + 12; 

        tooltip
          .style("left", left + "px")
          .style("top", top + "px")
          .style("visibility", "visible");
    }

    function hideTooltip() {
      tooltip.style("visibility", "hidden");
      currentModel = null;
    }
  }

  render() {
    return (
      <div style={{ position: "relative", marginTop: "100px" }}>
        <svg ref={this.svgRef} className="svg_parent"></svg>
        <div ref={this.tooltipRef}></div>
      </div>
    );
  }
}

export default InteractiveStreamGraph;