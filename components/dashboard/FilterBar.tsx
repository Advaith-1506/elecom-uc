"use client";

import type { CallRecord, NoiseType, QualityFlag } from "@/lib/types";

interface FilterState {
  noiseType: NoiseType | "all";
  qualityFlag: QualityFlag | "all";
  callType: CallRecord["callType"] | "all";
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const baseSelect =
  "h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none shadow-[0_0_10px_rgba(0,255,136,0.15)] transition focus:border-primary";

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Filter Batch</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Focus the dashboard by noise source, quality band, and call type.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            className={baseSelect}
            value={filters.noiseType}
            onChange={(e) => onChange({ ...filters, noiseType: e.target.value as FilterState["noiseType"] })}
          >
            <option value="all">All noise types</option>
            <option value="generator">Generator</option>
            <option value="vehicle">Vehicle</option>
            <option value="airplane">Airplane</option>
            <option value="mixed">Mixed</option>
          </select>

          <select
            className={baseSelect}
            value={filters.qualityFlag}
            onChange={(e) => onChange({ ...filters, qualityFlag: e.target.value as FilterState["qualityFlag"] })}
          >
            <option value="all">All quality flags</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          <select
            className={baseSelect}
            value={filters.callType}
            onChange={(e) => onChange({ ...filters, callType: e.target.value as FilterState["callType"] })}
          >
            <option value="all">All call types</option>
            <option value="rumble">Rumble</option>
            <option value="trumpet">Trumpet</option>
            <option value="roar">Roar</option>
          </select>

          <button
            type="button"
            onClick={() => onChange({ noiseType: "all", qualityFlag: "all", callType: "all" })}
            className="h-11 rounded-xl border border-primary/40 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,255,136,0.5)] transition hover:opacity-90"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </section>
  );
}

export type { FilterState };
