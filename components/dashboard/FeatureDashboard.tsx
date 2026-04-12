"use client";

import { CleanabilityRing } from "./CleanabilityRing";
import type { CallRecord } from "@/lib/types";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  accent?: "cyan" | "emerald" | "violet" | "amber";
}

const accentClasses = {
  cyan: "text-cyan-300 border-cyan-400/20 bg-cyan-400/5",
  emerald: "text-emerald-300 border-emerald-400/20 bg-emerald-400/5",
  violet: "text-violet-300 border-violet-400/20 bg-violet-400/5",
  amber: "text-amber-300 border-amber-400/20 bg-amber-400/5",
};

function MetricCard({ label, value, unit, delta, accent = "cyan" }: MetricCardProps) {
  return (
    <div
      className={`glass rounded-xl p-4 border flex flex-col gap-1 ${accentClasses[accent]}`}
    >
      <span className="font-feature-label text-muted-foreground">{label}</span>
      <div className="flex items-end gap-1.5">
        <span className={`text-2xl font-metric-number ${accentClasses[accent].split(" ")[0]}`}>
          {typeof value === "number" ? value.toFixed(value < 100 ? 1 : 0) : value}
        </span>
        {unit && <span className="font-body text-xs text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {delta && (
        <span className="font-status text-emerald-400">{delta}</span>
      )}
    </div>
  );
}

interface FeatureDashboardProps {
  record: CallRecord;
}

export function FeatureDashboard({ record }: FeatureDashboardProps) {
  const hnrDelta = (record.hnrAfter - record.hnrBefore).toFixed(1);

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="font-section-header text-foreground">
        Extracted Features
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Fundamental Frequency"
          value={record.f0}
          unit="Hz"
          accent="cyan"
        />
        <MetricCard
          label="Harmonic Count"
          value={record.harmonicCount}
          accent="emerald"
        />
        <MetricCard
          label="HNR"
          value={record.hnrAfter}
          unit="dB"
          delta={`+${hnrDelta} dB vs raw`}
          accent="cyan"
        />
        <MetricCard
          label="SNR Improvement"
          value={record.snrImprovement}
          unit="dB"
          accent="emerald"
        />
        <MetricCard
          label="FM Depth"
          value={record.fmDepth}
          unit="Hz"
          accent="violet"
        />
        <MetricCard
          label="Spectral Centroid"
          value={record.spectralCentroid}
          unit="Hz"
          accent="violet"
        />
        <MetricCard
          label="Duration"
          value={record.duration}
          unit="s"
          accent="amber"
        />

        {/* Cleanability ring card */}
        <div className="glass rounded-xl p-4 border border-primary/20 bg-primary/5 flex items-center justify-center">
          <CleanabilityRing score={record.cleanabilityScore} size={88} />
        </div>
      </div>
    </div>
  );
}
