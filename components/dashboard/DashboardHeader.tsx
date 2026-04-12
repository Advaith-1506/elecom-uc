"use client";

import Link from "next/link";
import type { SummaryRecord } from "@/lib/types";

interface DashboardHeaderProps {
  summary: SummaryRecord;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="mt-1 stat-mono text-lg text-foreground">{value}</p>
    </div>
  );
}

export function DashboardHeader({ summary }: DashboardHeaderProps) {
  return (
    <header className="glass-strong scanlines rounded-2xl px-6 py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-2xl shadow-[0_0_10px_rgba(0,255,136,0.3)]">
            🐘
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-glow-cyan text-primary">
              Elecom
            </h1>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Elephant Call Isolation &amp; Analysis
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/map"
              className="rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-[0_0_10px_rgba(0,255,136,0.18)]"
            >
              Map View
            </Link>
            <Link
              href="/"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-[0_0_10px_rgba(0,255,136,0.12)]"
            >
              Research Dashboard
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Processed" value={String(summary.totalCallsProcessed)} />
          <StatTile label="Avg Cleanability" value={summary.avgCleanabilityScore.toFixed(1)} />
          <StatTile label="Avg SNR" value={`${summary.avgSnrImprovement.toFixed(1)} dB`} />
          <StatTile label="Avg F0" value={`${summary.avgF0Hz.toFixed(1)} Hz`} />
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs text-muted-foreground">Pipeline Active</span>
            </div>
            <div className="mt-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Session</p>
              <p className="stat-mono text-sm text-primary">EC-2026-0412</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
