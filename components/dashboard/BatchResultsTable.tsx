"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { CallRecord } from "@/lib/types";
import { getQualityFlag, getScoreTone, getSelectionLabel } from "@/lib/dashboard";

type SortKey =
  | "selection"
  | "callType"
  | "noiseType"
  | "f0"
  | "hnrAfter"
  | "snrImprovement"
  | "cleanabilityScore"
  | "qualityFlag";
type SortDir = "asc" | "desc";

interface BatchResultsTableProps {
  records: CallRecord[];
  selectedId: string;
  onSelect: (record: CallRecord) => void;
}

const columns: { key: SortKey; label: string; align: string }[] = [
  { key: "selection", label: "Selection", align: "text-left" },
  { key: "callType", label: "Call Type", align: "text-left" },
  { key: "noiseType", label: "Noise Type", align: "text-left" },
  { key: "f0", label: "f0", align: "text-right" },
  { key: "hnrAfter", label: "HNR After", align: "text-right" },
  { key: "snrImprovement", label: "SNR Δ", align: "text-right" },
  { key: "cleanabilityScore", label: "Cleanability", align: "text-right" },
  { key: "qualityFlag", label: "Quality Flag", align: "text-center" },
];

function SortIcon({ column, active, dir }: { column: SortKey; active: SortKey; dir: SortDir }) {
  if (column !== active) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
}

export function BatchResultsTable({ records, selectedId, onSelect }: BatchResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("selection");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const av = sortKey === "qualityFlag" ? getQualityFlag(a.cleanabilityScore) : a[sortKey];
      const bv = sortKey === "qualityFlag" ? getQualityFlag(b.cleanabilityScore) : b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [records, sortDir, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Batch Results</h2>
        <span className="stat-mono text-xs text-muted-foreground">{records.length} calls</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer px-4 py-3 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground ${col.align}`}
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
              const qualityFlag = getQualityFlag(record.cleanabilityScore);
              const isSelected = record.id === selectedId;

              return (
                <tr
                  key={record.id}
                  onClick={() => onSelect(record)}
                  className={`cursor-pointer border-b border-border/60 transition ${
                    isSelected ? "bg-primary/10 shadow-[inset_3px_0_0_0_#00ff88]" : "hover:bg-white/5"
                  }`}
                >
                  <td className="px-4 py-3 stat-mono text-muted-foreground">{getSelectionLabel(record.selection)}</td>
                  <td className="px-4 py-3 capitalize text-foreground">{record.callType}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{record.noiseType}</td>
                  <td className="px-4 py-3 text-right stat-mono text-foreground">{record.f0.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right stat-mono text-foreground">{record.hnrAfter.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right stat-mono text-primary">{record.snrImprovement.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right stat-mono text-foreground">{record.cleanabilityScore.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge-neon inline-block rounded-full border px-2.5 py-1 text-xs uppercase tracking-wider ${getScoreTone(record.cleanabilityScore)}`}>
                      {qualityFlag}
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
