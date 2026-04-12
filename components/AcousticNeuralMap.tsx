'use client';

import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import featuresData from '@/data/features.json';

interface CallNode {
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
  x: number;
  y: number;
}

// Mock node positions (replace with actual data)
const mockNodes: CallNode[] = [
  {
    id: '1',
    selection: '001',
    callType: 'rumble',
    noiseType: 'generator',
    f0: 13.8,
    harmonicCount: 8,
    hnrBefore: 12.3,
    hnrAfter: 18.9,
    snrImprovement: 7.1,
    fmDepth: 2.1,
    spectralCentroid: 45.2,
    duration: 2.3,
    cleanabilityScore: 82,
    multipleCallers: false,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 200,
    y: 300,
  },
  {
    id: '2',
    selection: '002',
    callType: 'rumble',
    noiseType: 'vehicle',
    f0: 24.6,
    harmonicCount: 5,
    hnrBefore: 8.1,
    hnrAfter: 10.2,
    snrImprovement: -8.5,
    fmDepth: 0.8,
    spectralCentroid: 72.1,
    duration: 1.8,
    cleanabilityScore: 23,
    multipleCallers: true,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 400,
    y: 200,
  },
  {
    id: '13',
    selection: '013',
    callType: 'rumble',
    noiseType: 'airplane',
    f0: 16.4,
    harmonicCount: 10,
    hnrBefore: 15.2,
    hnrAfter: 19.8,
    snrImprovement: 19.4,
    fmDepth: 3.2,
    spectralCentroid: 51.5,
    duration: 3.1,
    cleanabilityScore: 76,
    multipleCallers: false,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 600,
    y: 400,
  },
  {
    id: '14',
    selection: '014',
    callType: 'rumble',
    noiseType: 'generator',
    f0: 13.8,
    harmonicCount: 7,
    hnrBefore: 11.5,
    hnrAfter: 16.2,
    snrImprovement: 7.1,
    fmDepth: 1.9,
    spectralCentroid: 46.8,
    duration: 2.0,
    cleanabilityScore: 57,
    multipleCallers: false,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 300,
    y: 500,
  },
  {
    id: '85',
    selection: '085',
    callType: 'rumble',
    noiseType: 'generator',
    f0: 12.9,
    harmonicCount: 9,
    hnrBefore: 13.8,
    hnrAfter: 17.5,
    snrImprovement: 5.2,
    fmDepth: 2.0,
    spectralCentroid: 44.1,
    duration: 2.5,
    cleanabilityScore: 71,
    multipleCallers: false,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 700,
    y: 300,
  },
  {
    id: '90',
    selection: '090',
    callType: 'rumble',
    noiseType: 'vehicle',
    f0: 12.6,
    harmonicCount: 4,
    hnrBefore: 7.2,
    hnrAfter: 9.1,
    snrImprovement: -3.1,
    fmDepth: 0.6,
    spectralCentroid: 68.5,
    duration: 1.5,
    cleanabilityScore: 18,
    multipleCallers: true,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 500,
    y: 150,
  },
  {
    id: '19',
    selection: '019',
    callType: 'rumble',
    noiseType: 'airplane',
    f0: 16.8,
    harmonicCount: 11,
    hnrBefore: 16.1,
    hnrAfter: 20.2,
    snrImprovement: 15.2,
    fmDepth: 3.5,
    spectralCentroid: 52.8,
    duration: 3.2,
    cleanabilityScore: 69,
    multipleCallers: false,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 800,
    y: 450,
  },
  {
    id: '22',
    selection: '022',
    callType: 'rumble',
    noiseType: 'airplane',
    f0: 18.2,
    harmonicCount: 12,
    hnrBefore: 14.8,
    hnrAfter: 19.5,
    snrImprovement: 11.4,
    fmDepth: 2.8,
    spectralCentroid: 58.2,
    duration: 2.8,
    cleanabilityScore: 61,
    multipleCallers: false,
    spectrogramBefore: '/spectrograms/before-sample.jpg',
    spectrogramAfter: '/spectrograms/after-sample.jpg',
    x: 150,
    y: 450,
  },
];

const noiseTypeColors: Record<
  string,
  { border: string; glow: string; background: string }
> = {
  generator: {
    border: '#f77f00',
    glow: '#f77f00',
    background: 'rgba(247, 127, 0, 0.15)',
  },
  vehicle: {
    border: '#e63946',
    glow: '#e63946',
    background: 'rgba(230, 57, 70, 0.15)',
  },
  airplane: {
    border: '#00b4d8',
    glow: '#00b4d8',
    background: 'rgba(0, 180, 216, 0.15)',
  },
  background: {
    border: '#90e0ef',
    glow: '#90e0ef',
    background: 'rgba(144, 224, 239, 0.15)',
  },
  mixed: {
    border: '#7b2d8b',
    glow: '#7b2d8b',
    background: 'rgba(123, 45, 139, 0.15)',
  },
};

const animationDurations = [6, 7, 8, 9, 10];

export default function AcousticNeuralMap() {
  const [selectedNode, setSelectedNode] = useState<CallNode | null>(null);
  const [constellationMode, setConstellationMode] = useState(false);
  const [stormMode, setStormMode] = useState(false);

  const nodes = mockNodes;

  const stats = useMemo(() => {
    return {
      calls: nodes.length,
      avgClean: Math.round(
        nodes.reduce((sum, n) => sum + n.cleanabilityScore, 0) / nodes.length
      ),
      avgSnr: (nodes.reduce((sum, n) => sum + n.snrImprovement, 0) / nodes.length).toFixed(1),
      avgF0: (nodes.reduce((sum, n) => sum + n.f0, 0) / nodes.length).toFixed(1),
    };
  }, []);

  // Generate constellation links (nodes with f0 within 2Hz)
  const constellationLinks = useMemo(() => {
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.abs(nodes[i].f0 - nodes[j].f0) < 2) {
          links.push({ source: nodes[i], target: nodes[j] });
        }
      }
    }
    return links;
  }, []);

  const poorNodes = nodes.filter((n) => n.cleanabilityScore < 30);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full opacity-4 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #00b4d8 0%, transparent 70%)',
            top: '10%',
            left: '15%',
            animation: 'aurora1 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-96 h-96 rounded-full opacity-4 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #0077b6 0%, transparent 70%)',
            bottom: '15%',
            right: '10%',
            animation: 'aurora2 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-3 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #023e8a 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            animation: 'aurora3 16s ease-in-out infinite',
          }}
        />
      </div>

      {/* SVG for constellation lines */}
      {constellationMode && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {constellationLinks.map((link, i) => (
            <line
              key={i}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="rgba(144, 224, 239, 0.4)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
        </svg>
      )}

      {/* Nodes */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {nodes.map((node, idx) => {
          const colors = noiseTypeColors[node.noiseType] || noiseTypeColors.generator;
          const diameter = node.cleanabilityScore / 3 + 20;
          const duration = animationDurations[idx % animationDurations.length];
          const isLowQuality = node.cleanabilityScore < 30;

          return (
            <div
              key={node.id}
              className="absolute cursor-pointer transition-transform hover:scale-110"
              style={{
                width: diameter,
                height: diameter,
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                zIndex: selectedNode?.id === node.id ? 10 : 3,
              }}
              onClick={() => setSelectedNode(node)}
            >
              {/* Floating animation */}
              <style>{`
                @keyframes float-${idx} {
                  0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
                  50% { transform: translate(-50%, -50%) translateY(-15px); }
                }
              `}</style>

              {/* Storm mode red particles */}
              {stormMode && isLowQuality && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(8)].map((_, pi) => {
                    const angle = (pi / 8) * Math.PI * 2;
                    const orbitRadius = diameter / 2 + 25;
                    const px = Math.cos(angle) * orbitRadius;
                    const py = Math.sin(angle) * orbitRadius;
                    return (
                      <div
                        key={pi}
                        className="absolute w-1 h-1 rounded-full bg-destructive"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(${px}px, ${py}px)`,
                          animation: `spin 2s linear infinite`,
                          animationDelay: `${-pi * 0.25}s`,
                          opacity: 0.6,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Glass bubble node */}
              <div
                className="absolute inset-0 rounded-full border"
                style={{
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${colors.background})`,
                  borderColor: colors.border,
                  boxShadow: `0 0 20px ${colors.glow}88, inset 0 0 10px rgba(255,255,255,0.1)`,
                  animation: `float-${idx} ${duration}s ease-in-out infinite`,
                  borderWidth: '1px',
                }}
              />

              {/* Highlight arc */}
              <div
                className="absolute rounded-full"
                style={{
                  width: diameter * 0.8,
                  height: diameter * 0.8,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: `1.5px solid rgba(255,255,255,0.4)`,
                  borderRadius: '50%',
                  borderRight: 'transparent',
                  borderBottom: 'transparent',
                  animation: `float-${idx} ${duration}s ease-in-out infinite`,
                }}
              />

              {/* Call number label */}
              <div
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
                style={{
                  animation: `float-${idx} ${duration}s ease-in-out infinite`,
                }}
              >
                <p className="font-status text-foreground text-xs">
                  {node.selection}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 pointer-events-auto">
        <h1 className="font-logo text-2xl text-primary text-glow-cyan">Elecom</h1>

        <div className="flex gap-3">
          {[
            { label: 'Calls', value: stats.calls },
            { label: 'Avg Clean', value: stats.avgClean },
            { label: 'Avg SNR', value: `+${stats.avgSnr}` },
            { label: 'Avg f0', value: `${stats.avgF0} Hz` },
          ].map((stat, i) => (
            <div
              key={i}
              className="glass rounded-xl px-4 py-2 text-center text-nowrap"
            >
              <div className="font-metric-number text-primary text-lg">
                {stat.value}
              </div>
              <div className="font-feature-label text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setConstellationMode(!constellationMode)}
            className={`glass px-3 py-1 rounded-lg font-badge transition-colors ${
              constellationMode
                ? 'bg-primary/20 text-primary'
                : 'text-foreground hover:bg-muted/30'
            }`}
          >
            ★ Constellation
          </button>
          <button
            onClick={() => setStormMode(!stormMode)}
            className={`glass px-3 py-1 rounded-lg font-badge transition-colors ${
              stormMode
                ? 'bg-destructive/20 text-destructive'
                : 'text-foreground hover:bg-muted/30'
            }`}
          >
            ⚡ Storm
          </button>
        </div>
      </div>

      {/* Right side panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 h-screen w-96 glass-strong overflow-y-auto z-30 p-6 flex flex-col gap-4 border-l border-primary/30 pointer-events-auto">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 p-1 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Call info */}
          <div className="mt-4">
            <h3 className="font-section-header text-foreground mb-3">
              Selection {selectedNode.selection}
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-status text-muted-foreground">
                <span className="font-badge text-foreground">
                  {selectedNode.callType}
                </span>{' '}
                • {selectedNode.noiseType}
              </p>
              <p className="font-status text-muted-foreground">
                Duration:{' '}
                <span className="text-foreground">
                  {selectedNode.duration.toFixed(2)}s
                </span>
              </p>
            </div>
          </div>

          {/* Spectrograms */}
          <div>
            <h4 className="font-feature-label text-foreground mb-3">
              Spectrograms
            </h4>
            <div className="space-y-3">
              {[
                {
                  label: 'Before',
                  src: selectedNode.spectrogramBefore,
                  color: 'border-amber-500/30',
                },
                {
                  label: 'After',
                  src: selectedNode.spectrogramAfter,
                  color: 'border-emerald-500/30',
                },
              ].map((spec) => (
                <div key={spec.label}>
                  <p className="font-status text-muted-foreground mb-2 text-xs">
                    {spec.label}
                  </p>
                  <div
                    className={`glass rounded-lg p-2 aspect-video bg-muted/20 border ${spec.color}`}
                  >
                    <img
                      src={spec.src}
                      alt={spec.label}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics bars */}
          <div>
            <h4 className="font-feature-label text-foreground mb-3">Metrics</h4>
            <div className="space-y-3">
              {[
                { name: 'HNR Before', val: selectedNode.hnrBefore, max: 20 },
                { name: 'HNR After', val: selectedNode.hnrAfter, max: 20 },
                { name: 'SNR Δ', val: selectedNode.snrImprovement, max: 20 },
                {
                  name: 'Harmonic Ct',
                  val: selectedNode.harmonicCount,
                  max: 15,
                },
              ].map((m) => (
                <div key={m.name}>
                  <p className="font-status text-muted-foreground text-xs mb-1.5">
                    {m.name}
                  </p>
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
          <div className="flex justify-center pt-2">
            <svg className="w-28 h-28">
              <circle
                cx="56"
                cy="56"
                r="48"
                className="score-ring-track"
                fill="none"
                strokeWidth="4"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                className="score-ring-fill"
                fill="none"
                strokeWidth="4"
                strokeDasharray={`${
                  (selectedNode.cleanabilityScore / 100) * (Math.PI * 2 * 48)
                } ${Math.PI * 2 * 48}`}
              />
              <text
                x="56"
                y="56"
                textAnchor="middle"
                dy="0.3em"
                className="font-metric-number text-primary text-xl"
                fill="currentColor"
              >
                {selectedNode.cleanabilityScore}
              </text>
            </svg>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aurora1 {
          0%, 100% { transform: translateX(0) translateY(0); opacity: 0.04; }
          50% { transform: translateX(20px) translateY(-20px); opacity: 0.06; }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translateX(0) translateY(0); opacity: 0.04; }
          50% { transform: translateX(-20px) translateY(20px); opacity: 0.06; }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.03; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.05; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
