'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { X, Play, Pause } from 'lucide-react';
import featuresData from '@/data/features.json';

interface BaseCallData {
  id: string;
  selection: string;
  callType: string;
  noiseType: string;
  f0: number;
  harmonicCount: number;
  hnrBefore: number;
  hnrAfter: number;
  snrImprovement: number;
  fmDepth: number;
  spectralCentroid: number;
  duration: number;
  cleanabilityScore: number;
  multipleCallers: boolean;
  spectrogramBefore: string;
  spectrogramAfter: string;
}

interface CallNode extends BaseCallData {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: CallNode;
  target: CallNode;
}

const noiseTypeColors: Record<string, { color: string; glow: string }> = {
  wind: { color: '#f77f00', glow: '#00b4d8' },
  vehicle: { color: '#e63946', glow: '#00b4d8' },
  rain: { color: '#00b4d8', glow: '#ffffff' },
  insects: { color: '#90e0ef', glow: '#ffffff' },
};

export default function AcousticNeuralMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<CallNode | null>(null);
  const [constellationMode, setConstellationMode] = useState(false);
  const [stormMode, setStormMode] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [nodes, setNodes] = useState<CallNode[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const simulationRef = useRef<d3.Simulation<CallNode, Link> | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);

  // Initialize nodes and links
  useEffect(() => {
    const nodeData: CallNode[] = featuresData.map((d) => ({
      ...d,
      x: Math.random() * 800,
      y: Math.random() * 600,
    }));

    const linkData: Link[] = [];
    const fileGroups: Record<string, CallNode[]> = {};

    nodeData.forEach((node) => {
      const fileKey = node.selection;
      if (!fileGroups[fileKey]) {
        fileGroups[fileKey] = [];
      }
      fileGroups[fileKey].push(node);
    });

    Object.values(fileGroups).forEach((group) => {
      for (let i = 0; i < group.length - 1; i++) {
        linkData.push({ source: group[i], target: group[i + 1] });
      }
    });

    setNodes(nodeData);
    setLinks(linkData);
  }, []);

  // D3 force simulation
  useEffect(() => {
    if (nodes.length === 0 || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => 8 + (d.cleanabilityScore / 100) * 8))
      .on('tick', () => {
        setNodes([...nodes]);
        if (canvasRef.current) {
          drawParticles();
        }
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  // Storm mode particles
  const drawParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(10, 15, 30, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!stormMode) return;

    const poorNodes = nodes.filter((n) => n.cleanabilityScore < 50);
    if (particlesRef.current.length === 0) {
      poorNodes.forEach(() => {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        });
      });
    }

    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.fillStyle = 'rgba(230, 57, 70, 0.6)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(drawParticles);
  };

  // Draw SVG elements
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Define glow filters
    const defs = svg.selectAll('defs').data([null]);
    defs.enter().append('defs');

    const filters = svg.select('defs').selectAll('filter').data(Object.entries(noiseTypeColors), ([key]) => key);
    filters.exit().remove();
    const filtersEnter = filters
      .enter()
      .append('filter')
      .attr('id', ([key]) => `glow-${key}`)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filtersEnter
      .append('feGaussianBlur')
      .attr('stdDeviation', 3)
      .attr('result', 'coloredBlur');

    filtersEnter
      .append('feMerge')
      .selectAll('feMergeNode')
      .data([0, 1])
      .enter()
      .append('feMergeNode')
      .attr('in', (d) => (d === 0 ? 'coloredBlur' : 'SourceGraphic'));

    // Links
    const linkElements = svg.selectAll('line.link').data(links, (d: any) => `${d.source.id}-${d.target.id}`);
    linkElements.exit().remove();
    linkElements
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', 'rgba(0, 180, 216, 0.3)')
      .attr('stroke-width', 1)
      .merge(linkElements)
      .attr('x1', (d) => (d.source as any).x || 0)
      .attr('y1', (d) => (d.source as any).y || 0)
      .attr('x2', (d) => (d.target as any).x || 0)
      .attr('y2', (d) => (d.target as any).y || 0);

    // Constellation mode lines
    if (constellationMode) {
      const constellationLinks = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (Math.abs(nodes[i].f0 - nodes[j].f0) < 20) {
            constellationLinks.push({ source: nodes[i], target: nodes[j] });
          }
        }
      }

      const constElements = svg.selectAll('line.constellation').data(constellationLinks, (d: any) => `${d.source.id}-${d.target.id}`);
      constElements.exit().remove();
      constElements
        .enter()
        .append('line')
        .attr('class', 'constellation')
        .attr('stroke', 'rgba(0, 180, 216, 0.15)')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '4,4')
        .merge(constElements)
        .attr('x1', (d) => (d.source as any).x || 0)
        .attr('y1', (d) => (d.source as any).y || 0)
        .attr('x2', (d) => (d.target as any).x || 0)
        .attr('y2', (d) => (d.target as any).y || 0);
    } else {
      svg.selectAll('line.constellation').remove();
    }

    // Nodes
    const nodeElements = svg.selectAll('g.node').data(nodes, (d: any) => d.id);
    nodeElements.exit().remove();

    const nodeEnter = nodeElements.enter().append('g').attr('class', 'node');

    // Glow bubble background
    nodeEnter
      .append('circle')
      .attr('class', 'glow')
      .attr('r', (d) => 8 + (d.cleanabilityScore / 100) * 8)
      .attr('fill', (d) => {
        const colorData = noiseTypeColors[d.noiseType] || noiseTypeColors.wind;
        return colorData.color;
      })
      .attr('filter', (d) => `url(#glow-${d.noiseType || 'wind'})`)
      .attr('opacity', 0.8);

    // White highlight arc (glass effect)
    nodeEnter
      .append('circle')
      .attr('class', 'highlight')
      .attr('r', (d) => 6 + (d.cleanabilityScore / 100) * 6)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.4)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d) => {
        const r = 6 + (d.cleanabilityScore / 100) * 6;
        return `${(Math.PI * r) / 3} ${(Math.PI * r * 2) / 3}`;
      });

    nodeEnter.on('click', (event, d) => {
      setSelectedNode(d);
    });

    nodeElements
      .merge(nodeEnter)
      .attr('transform', (d) => `translate(${(d as any).x || 0},${(d as any).y || 0})`)
      .attr('cursor', 'pointer');
  }, [nodes, links, constellationMode, stormMode]);

  const stats = useMemo(() => {
    if (nodes.length === 0) return { calls: 0, avgClean: 0, avgSnr: 0, avgF0: 0 };
    return {
      calls: nodes.length,
      avgClean: Math.round(nodes.reduce((sum, n) => sum + n.cleanabilityScore, 0) / nodes.length),
      avgSnr: (nodes.reduce((sum, n) => sum + n.snrImprovement, 0) / nodes.length).toFixed(1),
      avgF0: (nodes.reduce((sum, n) => sum + n.f0, 0) / nodes.length).toFixed(1),
    };
  }, [nodes]);

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Aurora background animation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 animate-pulse" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(0, 180, 216, 0.04) 0%, transparent 50%)',
          animation: 'aurora 8s ease-in-out infinite',
        }} />
      </div>

      {/* Canvas for particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        width={1400}
        height={900}
      />

      {/* Main SVG visualization */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'transparent' }}
      />

      {/* Top bar with stats */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6">
        <div className="font-logo text-2xl text-glow-cyan text-primary">Elecom</div>

        <div className="flex gap-4">
          {[
            { label: 'Calls', value: stats.calls },
            { label: 'Avg Clean', value: stats.avgClean },
            { label: 'Avg SNR', value: `+${stats.avgSnr}` },
            { label: 'Avg f0', value: `${stats.avgF0} Hz` },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-xl px-4 py-2 text-center">
              <div className="font-metric-number text-primary text-lg">{stat.value}</div>
              <div className="font-feature-label text-muted-foreground text-[0.6rem]">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setConstellationMode(!constellationMode)}
            className="glass px-3 py-1 rounded-lg font-badge text-foreground hover:bg-primary/20 transition-colors"
          >
            ★ Constellation
          </button>
          <button
            onClick={() => setStormMode(!stormMode)}
            className="glass px-3 py-1 rounded-lg font-badge text-foreground hover:bg-destructive/20 transition-colors"
          >
            ⚡ Storm
          </button>
        </div>
      </div>

      {/* Side panel for selected node */}
      {selectedNode && (
        <div className="absolute right-0 top-0 h-full w-96 glass-strong rounded-l-2xl overflow-y-auto z-20 p-6 flex flex-col gap-4 border-l border-primary/30">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 p-1 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Call info */}
          <div>
            <h3 className="font-section-header text-foreground mb-2">Selection {selectedNode.selection}</h3>
            <div className="space-y-1 text-sm">
              <p className="font-status text-muted-foreground">
                <span className="text-foreground font-badge">{selectedNode.callType}</span> • {selectedNode.noiseType}
              </p>
              <p className="font-status text-muted-foreground">
                Duration: <span className="text-foreground">{selectedNode.duration.toFixed(2)}s</span>
              </p>
            </div>
          </div>

          {/* Spectrograms */}
          <div>
            <h4 className="font-feature-label text-foreground mb-2">Spectrograms</h4>
            <div className="space-y-2">
              {[
                { label: 'Before', src: selectedNode.spectrogramBefore },
                { label: 'After', src: selectedNode.spectrogramAfter },
              ].map((spec) => (
                <div key={spec.label}>
                  <p className="font-status text-muted-foreground mb-1">{spec.label}</p>
                  <div className="glass rounded-lg p-2 aspect-video bg-muted/20">
                    <img src={spec.src} alt={spec.label} className="w-full h-full object-cover rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature metrics as bar charts */}
          <div>
            <h4 className="font-feature-label text-foreground mb-2">Metrics</h4>
            <div className="space-y-2">
              {[
                { name: 'HNR Before', val: selectedNode.hnrBefore, max: 20 },
                { name: 'HNR After', val: selectedNode.hnrAfter, max: 20 },
                { name: 'SNR Δ', val: selectedNode.snrImprovement, max: 12 },
                { name: 'Harmonic Ct', val: selectedNode.harmonicCount, max: 15 },
              ].map((m) => (
                <div key={m.name}>
                  <p className="font-status text-muted-foreground text-xs mb-1">{m.name}</p>
                  <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(m.val / m.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cleanability ring */}
          <div className="flex justify-center">
            <svg className="w-24 h-24">
              <circle cx="48" cy="48" r="40" className="score-ring-track" strokeWidth="3" />
              <circle
                cx="48"
                cy="48"
                r="40"
                className="score-ring-fill"
                strokeWidth="3"
                strokeDasharray={`${(selectedNode.cleanabilityScore / 100) * (Math.PI * 2 * 40)} ${Math.PI * 2 * 40}`}
                strokeDashoffset="0"
              />
              <text
                x="48"
                y="48"
                textAnchor="middle"
                dy="0.3em"
                className="font-metric-number text-primary text-xl"
              >
                {selectedNode.cleanabilityScore}
              </text>
            </svg>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aurora {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.08; }
        }
      `}</style>
    </div>
  );
}
