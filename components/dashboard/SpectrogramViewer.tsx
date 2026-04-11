"use client";

import { useState } from "react";
import Image from "next/image";
import { Zap, Play, Pause, Volume2 } from "lucide-react";

interface SpectrogramViewerProps {
  beforeSrc?: string;
  afterSrc?: string;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

function MockAudioPlayer({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const bars = [4, 7, 5, 9, 6, 8, 4, 10, 5, 7, 6, 9, 4, 8, 5];

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40 border border-border/50">
      <button
        onClick={() => setPlaying((p) => !p)}
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          playing ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-primary"
        }`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>

      <div className="flex-1 flex items-center gap-1 h-4">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`rounded-full transition-all ${playing ? "bg-primary" : "bg-muted-foreground/40"}`}
            style={{
              width: "3px",
              height: `${playing ? h * 6 : h * 3}%`,
              minHeight: "2px",
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Volume2 className="w-3 h-3" />
        <span className="font-mono">{label}</span>
      </div>
    </div>
  );
}

export function SpectrogramViewer({
  beforeSrc = "/spectrograms/before-sample.jpg",
  afterSrc = "/spectrograms/after-sample.jpg",
  onAnalyze,
  isAnalyzing = false,
}: SpectrogramViewerProps) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
          Spectrogram Viewer
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">0–500 Hz</span>
          <div className="h-3 w-px bg-border" />
          <span className="font-mono">48 kHz SR</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-medium text-foreground uppercase tracking-wider">Before Cleaning</span>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-[2/1] bg-muted/30">
            <Image
              src={beforeSrc}
              alt="Spectrogram before noise cleaning"
              fill
              className="object-cover"
            />
            {/* Axis labels overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none">
              <span className="text-[9px] font-mono text-white/60 self-end">500 Hz</span>
              <span className="text-[9px] font-mono text-white/60 self-end">0 Hz</span>
            </div>
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
              <span className="text-[9px] font-mono text-amber-300">Noisy</span>
            </div>
          </div>
          <MockAudioPlayer label="raw.wav" />
        </div>

        {/* After */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground uppercase tracking-wider">After Cleaning</span>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-primary/20 aspect-[2/1] bg-muted/30 glow-cyan">
            <Image
              src={afterSrc}
              alt="Spectrogram after noise cleaning"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none">
              <span className="text-[9px] font-mono text-white/60 self-end">500 Hz</span>
              <span className="text-[9px] font-mono text-white/60 self-end">0 Hz</span>
            </div>
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30">
              <span className="text-[9px] font-mono text-primary">Clean</span>
            </div>
          </div>
          <MockAudioPlayer label="clean.wav" />
        </div>
      </div>

      {/* Clean & Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 
          bg-primary text-primary-foreground btn-glow-cyan
          hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        <Zap className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
        {isAnalyzing ? "Analyzing…" : "Clean & Analyze"}
      </button>
    </div>
  );
}
