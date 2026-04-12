"use client";

import type { CallRecord } from "@/lib/types";
import { getCallTypeTone, getNoiseTone } from "@/lib/dashboard";

interface CallMetadataRowProps {
  record: CallRecord;
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_0_10px_rgba(0,255,136,0.15)]">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="mt-1 stat-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

export function CallMetadataRow({ record }: CallMetadataRowProps) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge-neon rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${getCallTypeTone(record.callType)}`}>
          {record.callType}
        </span>
        <span className={`badge-neon rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${getNoiseTone(record.noiseType)}`}>
          {record.noiseType}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <MetaStat label="f0" value={`${record.f0.toFixed(1)} Hz`} />
        <MetaStat label="Harmonics" value={String(record.harmonicCount)} />
        <MetaStat label="HNR Before" value={`${record.hnrBefore.toFixed(1)} dB`} />
        <MetaStat label="HNR After" value={`${record.hnrAfter.toFixed(1)} dB`} />
        <MetaStat label="Duration" value={`${record.duration.toFixed(2)} s`} />
        <MetaStat label="FM Depth" value={`${record.fmDepth.toFixed(1)} Hz`} />
        <MetaStat label="Spectral Centroid" value={`${record.spectralCentroid.toFixed(1)} Hz`} />
        <MetaStat label="Energy" value={`${record.energyDb.toFixed(1)} dB`} />
      </div>
    </div>
  );
}
