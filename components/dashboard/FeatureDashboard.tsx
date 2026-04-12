"use client";

import type { CallRecord, SummaryRecord } from "@/lib/types";
import { CleanabilityRing } from "./CleanabilityRing";

interface FeatureDashboardProps {
  record: CallRecord;
  records: CallRecord[];
  summary: SummaryRecord;
}

function MetricCard({
  label,
  value,
  unit,
  accentClass,
}: {
  label: string;
  value: string;
  unit?: string;
  accentClass: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 shadow-[0_0_10px_rgba(0,255,136,0.15)] ${accentClass}`}>
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end gap-1">
        <span className="stat-mono text-2xl">{value}</span>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  );
}

export function FeatureDashboard({ record, records, summary }: FeatureDashboardProps) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Extracted Features</h2>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Batch Avg F0</p>
            <p className="stat-mono text-sm text-primary">{summary.avgF0Hz.toFixed(1)} Hz</p>
          </div>
          <CleanabilityRing score={Math.round(record.cleanabilityScore)} size={88} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Selection" value={String(record.selection)} accentClass="border-primary/30 text-primary" />
        <MetricCard label="SNR Improvement" value={record.snrImprovement.toFixed(1)} unit="dB" accentClass="border-primary/30 text-primary" />
        <MetricCard label="HNR Improvement" value={record.hnrImprovement.toFixed(1)} unit="dB" accentClass="border-secondary/30 text-secondary" />
        <MetricCard label="Mask Tier" value={String(record.maskTierUsed)} accentClass="border-accent/30 text-accent" />
        <MetricCard label="Loaded Calls" value={String(records.length)} accentClass="border-primary/30 text-primary" />
      </div>
    </div>
  );
}
