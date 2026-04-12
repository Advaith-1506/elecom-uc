"use client";

import { AlertTriangle, Users } from "lucide-react";
import type { CallType, NoiseType } from "@/lib/types";

const callTypeBadge: Record<CallType, string> = {
  rumble: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  trumpet: "bg-violet-400/15 text-violet-300 border-violet-400/30",
  roar: "bg-amber-400/15 text-amber-300 border-amber-400/30",
};

const noiseTypeBadge: Record<NoiseType, string> = {
  wind: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  vehicle: "bg-red-400/15 text-red-300 border-red-400/30",
  rain: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  insects: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
};

interface CallMetadataRowProps {
  callType: CallType;
  noiseType: NoiseType;
  multipleCallers: boolean;
}

export function CallMetadataRow({ callType, noiseType, multipleCallers }: CallMetadataRowProps) {
  return (
    <div className="glass rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="font-status text-muted-foreground">Call Type</span>
        <span
          className={`font-badge px-3 py-1 rounded-full border ${callTypeBadge[callType]}`}
        >
          {callType}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="font-status text-muted-foreground">Noise Type</span>
        <span
          className={`font-badge px-3 py-1 rounded-full border ${noiseTypeBadge[noiseType]}`}
        >
          {noiseType}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-status text-muted-foreground">Multiple Callers</span>
        {multipleCallers ? (
          <span className="flex items-center gap-1 font-badge px-2.5 py-1 rounded-full border bg-amber-400/15 text-amber-300 border-amber-400/30">
            <AlertTriangle className="w-3 h-3" />
            Detected
          </span>
        ) : (
          <span className="font-badge px-2.5 py-1 rounded-full border bg-emerald-400/15 text-emerald-300 border-emerald-400/30">
            Clear
          </span>
        )}
      </div>
    </div>
  );
}
