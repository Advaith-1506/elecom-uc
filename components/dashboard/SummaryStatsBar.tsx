"use client";

import { useMemo } from "react";
import type { CallRecord, CallType, NoiseType } from "@/lib/types";

interface SummaryStatsBarProps {
  records: CallRecord[];
}

const callTypeColors: Record<CallType, string> = {
  rumble: "bg-cyan-400",
  trumpet: "bg-violet-400",
  roar: "bg-amber-400",
};

const noiseTypeColors: Record<NoiseType, string> = {
  wind: "bg-slate-400",
  vehicle: "bg-red-400",
  rain: "bg-blue-400",
  insects: "bg-emerald-400",
};

function MiniBar({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-body text-muted-foreground capitalize w-16 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-status text-muted-foreground w-4 flex-shrink-0">{count}</span>
    </div>
  );
}

export function SummaryStatsBar({ records }: SummaryStatsBarProps) {
  const stats = useMemo(() => {
    const total = records.length;
    const avgClean = total > 0 ? records.reduce((s, r) => s + r.cleanabilityScore, 0) / total : 0;
    const avgSnr = total > 0 ? records.reduce((s, r) => s + r.snrImprovement, 0) / total : 0;

    const byCallType = records.reduce(
      (acc, r) => { acc[r.callType] = (acc[r.callType] || 0) + 1; return acc; },
      {} as Record<string, number>
    );
    const byNoiseType = records.reduce(
      (acc, r) => { acc[r.noiseType] = (acc[r.noiseType] || 0) + 1; return acc; },
      {} as Record<string, number>
    );

    return { total, avgClean, avgSnr, byCallType, byNoiseType };
  }, [records]);

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="font-section-header text-foreground">
        Summary Statistics
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Total calls */}
        <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <span className="text-3xl font-metric-number text-primary">{stats.total}</span>
          <span className="font-feature-label text-muted-foreground text-center">Total Calls Processed</span>
        </div>

        {/* Avg cleanability */}
        <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/15">
          <span className="text-3xl font-metric-number text-emerald-400">{stats.avgClean.toFixed(0)}</span>
          <span className="font-feature-label text-muted-foreground text-center">Avg Cleanability</span>
        </div>

        {/* Avg SNR */}
        <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-violet-400/5 border border-violet-400/15">
          <span className="text-3xl font-metric-number text-violet-400">+{stats.avgSnr.toFixed(1)}</span>
          <span className="font-feature-label text-muted-foreground text-center">Avg SNR Δ (dB)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* By call type */}
        <div className="flex flex-col gap-2.5">
          <span className="font-feature-label text-muted-foreground">By Call Type</span>
          {(["rumble", "trumpet", "roar"] as CallType[]).map((ct) => (
            <MiniBar
              key={ct}
              label={ct}
              count={stats.byCallType[ct] || 0}
              total={stats.total}
              colorClass={callTypeColors[ct]}
            />
          ))}
        </div>

        {/* By noise type */}
        <div className="flex flex-col gap-2.5">
          <span className="font-feature-label text-muted-foreground">By Noise Type</span>
          {(["wind", "vehicle", "rain", "insects"] as NoiseType[]).map((nt) => (
            <MiniBar
              key={nt}
              label={nt}
              count={stats.byNoiseType[nt] || 0}
              total={stats.total}
              colorClass={noiseTypeColors[nt]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
