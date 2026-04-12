"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { CallRecord, CallType } from "@/lib/types";

type SortKey = "selection" | "callType" | "noiseType" | "f0" | "hnrAfter" | "snrImprovement" | "cleanabilityScore";
type SortDir = "asc" | "desc";

const callTypeColors: Record<CallType, string> = {
  rumble: "text-cyan-300",
  trumpet: "text-violet-300",
  roar: "text-amber-300",
};

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-400/15 border-emerald-400/30";
  if (score >= 50) return "bg-yellow-400/15 border-yellow-400/30";
  return "bg-red-400/15 border-red-400/30";
}

interface SortIconProps {
  column: SortKey;
  active: SortKey;
  dir: SortDir;
}

function SortIcon({ column, active, dir }: SortIconProps) {
  if (column !== active) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

const columns: { key: SortKey; label: string; align: string }[] = [
  { key: "selection", label: "#", align: "text-left" },
  { key: "callType", label: "Call Type", align: "text-left" },
  { key: "noiseType", label: "Noise Type", align: "text-left" },
  { key: "f0", label: "f₀ (Hz)", align: "text-right" },
  { key: "hnrAfter", label: "HNR (dB)", align: "text-right" },
  { key: "snrImprovement", label: "SNR Δ (dB)", align: "text-right" },
  { key: "cleanabilityScore", label: "Cleanability", align: "text-center" },
];

interface BatchResultsTableProps {
  records: CallRecord[];
  selectedId: string;
  onSelect: (record: CallRecord) => void;
}

export function BatchResultsTable({ records, selectedId, onSelect }: BatchResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("selection");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...records].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-section-header text-foreground">
          Batch Results
        </h2>
        <span className="font-status text-muted-foreground">{records.length} calls</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-table-header text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${col.align}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "text-right" ? "justify-end" : col.align === "text-center" ? "justify-center" : ""}`}>
                    <span>{col.label}</span>
                    <SortIcon column={col.key} active={sortKey} dir={sortDir} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => {
              const isSelected = record.id === selectedId;
              return (
                <tr
                  key={record.id}
                  onClick={() => onSelect(record)}
                  className={`border-b border-border/30 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-muted/20"
                  }`}
                >
                  <td className="px-4 py-3 font-status text-muted-foreground">
                    {record.selection.padStart(3, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-badge capitalize ${callTypeColors[record.callType]}`}>
                      {record.callType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-muted-foreground capitalize">{record.noiseType}</td>
                  <td className="px-4 py-3 text-right font-status">{record.f0.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-status">{record.hnrAfter.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-status text-emerald-400">
                    +{record.snrImprovement.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block font-metric-number px-2.5 py-0.5 rounded-full border ${scoreColor(record.cleanabilityScore)} ${scoreBg(record.cleanabilityScore)}`}
                    >
                      {record.cleanabilityScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
