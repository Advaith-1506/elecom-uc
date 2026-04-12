"use client";

import type { CallRecord } from "@/lib/types";
import { CleanabilityRing } from "@/components/dashboard/CleanabilityRing";
import { getCallTypeTone, getNoiseTone, getQualityFlag, getScoreTone } from "@/lib/dashboard";

interface CallCardProps {
  record: CallRecord;
  active: boolean;
  onSelect: (record: CallRecord) => void;
}

export function CallCard({ record, active, onSelect }: CallCardProps) {
  const qualityFlag = getQualityFlag(record.cleanabilityScore);

  return (
    <button
      type="button"
      onClick={() => onSelect(record)}
      className={`glass rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 ${
        active ? "border-primary/50 bg-primary/[0.08]" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-feature-label text-primary">Selection {record.selection}</p>
          <p className="mt-2 font-logo text-xl text-foreground capitalize">{record.callType}</p>
          <p className="mt-1 font-body text-sm text-zinc-400">
            {record.duration.toFixed(2)}s clip • f0 {record.f0.toFixed(1)} Hz
          </p>
        </div>
        <CleanabilityRing score={record.cleanabilityScore} size={76} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full border px-2.5 py-1 font-badge uppercase ${getCallTypeTone(record.callType)}`}>
          {record.callType}
        </span>
        <span className={`rounded-full border px-2.5 py-1 font-badge uppercase ${getNoiseTone(record.noiseType)}`}>
          {record.noiseType}
        </span>
        <span className={`rounded-full border px-2.5 py-1 font-badge uppercase ${getScoreTone(record.cleanabilityScore)}`}>
          {qualityFlag}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="font-feature-label text-zinc-500">HNR After</p>
          <p className="mt-1 font-metric-number text-sm text-foreground">{record.hnrAfter.toFixed(1)} dB</p>
        </div>
        <div>
          <p className="font-feature-label text-zinc-500">SNR Gain</p>
          <p className="mt-1 font-metric-number text-sm text-primary">{record.snrImprovement.toFixed(1)} dB</p>
        </div>
        <div>
          <p className="font-feature-label text-zinc-500">Callers</p>
          <p className="mt-1 font-metric-number text-sm text-foreground">{record.multipleCallers ? "Multi" : "Single"}</p>
        </div>
      </div>
    </button>
  );
}
