"use client";

import type { CallRecord, SummaryRecord, NoiseType } from "@/lib/types";

interface SummaryStatsBarProps {
  records: CallRecord[];
  summary: SummaryRecord;
}

const noiseOrder: NoiseType[] = ["generator", "vehicle", "airplane", "mixed"];

const noiseColor: Record<NoiseType, string> = {
  generator: "bg-primary",
  vehicle: "bg-secondary",
  airplane: "bg-accent",
  mixed: "bg-white",
};

function MiniBar({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 truncate text-xs capitalize text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-mono w-8 text-right text-xs text-foreground">{count}</span>
    </div>
  );
}

export function SummaryStatsBar({ records, summary }: SummaryStatsBarProps) {
  const byNoiseType = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.noiseType] = (acc[record.noiseType] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground">
        Summary Statistics
      </h2>

      <div className="grid gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Total Calls Processed</p>
          <p className="mt-2 stat-mono text-3xl text-primary">{summary.totalCallsProcessed}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Average Cleanability</p>
          <p className="mt-2 stat-mono text-3xl text-primary">{summary.avgCleanabilityScore.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Average SNR Improvement</p>
          <p className="mt-2 stat-mono text-3xl text-primary">{summary.avgSnrImprovement.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Average F0</p>
          <p className="mt-2 stat-mono text-3xl text-primary">{summary.avgF0Hz.toFixed(1)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">By Noise Type</p>
        {noiseOrder.map((noiseType) => (
          <MiniBar
            key={noiseType}
            label={noiseType}
            count={byNoiseType[noiseType] ?? 0}
            total={records.length}
            colorClass={noiseColor[noiseType]}
          />
        ))}
      </div>
    </div>
  );
}
