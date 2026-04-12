"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Headphones, SlidersHorizontal, Waves, X } from "lucide-react";
import { CleanabilityRing } from "@/components/dashboard/CleanabilityRing";
import { GeminiBehaviorPanel } from "@/components/dashboard/GeminiBehaviorPanel";
import type { CallRecord, NoiseType, SummaryRecord } from "@/lib/types";
import {
  getAudioPath,
  getQualityFlag,
  getSelectionLabel,
  getSpectrogramAfter,
  getSpectrogramBefore,
} from "@/lib/dashboard";

type Placement = { x: number; y: number; scale: number };
type QualityFilter = "all" | "excellent" | "good" | "fair" | "poor";
type HerdRecord = CallRecord & { placement: Placement; quality: ReturnType<typeof getQualityFlag> };

const placements: Placement[] = [
  { x: 18, y: 62, scale: 1.15 },
  { x: 28, y: 76, scale: 1.05 },
  { x: 44, y: 70, scale: 1.08 },
  { x: 59, y: 62, scale: 1.02 },
  { x: 72, y: 78, scale: 0.96 },
  { x: 84, y: 60, scale: 1.1 },
  { x: 22, y: 50, scale: 1.02 },
  { x: 36, y: 84, scale: 1.0 },
  { x: 49, y: 87, scale: 0.98 },
  { x: 66, y: 50, scale: 1.12 },
  { x: 82, y: 70, scale: 1.04 },
  { x: 60, y: 80, scale: 0.94 },
  { x: 76, y: 85, scale: 1.02 },
  { x: 41, y: 56, scale: 0.96 },
  { x: 88, y: 47, scale: 1.0 },
];

const noiseTone: Record<NoiseType, string> = {
  generator: "#4ade80",
  vehicle: "#f59e0b",
  airplane: "#6366f1",
  mixed: "#7dd3fc",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, min: number, max: number) {
  return clamp((value - min) / (max - min || 1), 0, 1);
}

function percentToRatio(value: number) {
  return clamp(value, 0, 1);
}

function qualityAura(quality: ReturnType<typeof getQualityFlag>) {
  if (quality === "excellent") return "drop-shadow-[0_0_20px_rgba(74,222,128,0.5)] excellent-aura";
  if (quality === "good" || quality === "fair") return "drop-shadow-[0_0_16px_rgba(251,191,36,0.3)]";
  return "drop-shadow-[0_0_18px_rgba(239,68,68,0.4)] poor-shake";
}

function Bird({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 34 20" className={`bird-drift ${className}`} aria-hidden="true">
      <path
        d="M4 15c4-5 7-7 12-7 2 0 5 1 11 7M11 12l5-4m2 0 5 4"
        stroke="#4a5568"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <div className={`relative cloud-soft ${className}`}>
      <div className="absolute left-[8%] top-[22%] h-[44%] w-[34%] rounded-full bg-[rgba(255,255,255,0.95)]" />
      <div className="absolute left-[28%] top-[6%] h-[56%] w-[38%] rounded-full bg-[rgba(255,255,255,0.95)]" />
      <div className="absolute left-[52%] top-[20%] h-[40%] w-[30%] rounded-full bg-[rgba(255,255,255,0.95)]" />
      <div className="absolute inset-x-[10%] bottom-[18%] h-[36%] rounded-full bg-[rgba(255,255,255,0.95)]" />
    </div>
  );
}

function AcaciaTree({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-hidden="true">
      <rect x="83" y="78" width="14" height="72" rx="6" fill="#8B5E3C" />
      <ellipse cx="90" cy="68" rx="64" ry="26" fill="#4a9a1a" />
      <ellipse cx="90" cy="61" rx="48" ry="14" fill="#7dc242" opacity="0.92" />
      <ellipse cx="74" cy="53" rx="26" ry="9" fill="rgba(255,255,255,0.26)" />
    </svg>
  );
}

function Elephant({
  color,
  quality,
}: {
  color: string;
  quality: ReturnType<typeof getQualityFlag>;
}) {
  return (
    <svg viewBox="0 0 190 118" className={`h-full w-full ${qualityAura(quality)}`} aria-hidden="true">
      <defs>
        <linearGradient id={`ele-body-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bbc3d0" />
          <stop offset="100%" stopColor="#969faf" />
        </linearGradient>
      </defs>
      <g>
        <ellipse cx="86" cy="60" rx="58" ry="33" fill={`url(#ele-body-${color.replace("#", "")})`} />
        <circle cx="129" cy="58" r="23" fill="#a6afbd" />
        <circle cx="117" cy="51" r="18" fill="#b3bdca" />
        <ellipse cx="108" cy="52" rx="15" ry="18" fill="#9ea8b7" />
        <path d="M145 67c12 8 14 20 8 34-2 5 0 8 4 8 5 0 8-4 10-10 4-16 0-30-13-40l-9 8Z" fill="#9ca6b3" />
        <path d="M149 68c8 0 14 4 18 11" stroke="#fffef7" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <path d="M146 73c7 0 13 3 17 9" stroke="#fffef7" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <circle cx="136" cy="54" r="1.9" fill="#ffffff" />
        <path d="M40 57c-8-4-14-3-18 0 7 0 12 2 17 7" stroke="#7f8a9a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="48" y="84" width="11" height="26" rx="2" fill="#7e8898" />
        <rect x="72" y="84" width="11" height="26" rx="2" fill="#7e8898" />
        <rect x="99" y="84" width="11" height="26" rx="2" fill="#7e8898" />
        <rect x="123" y="84" width="11" height="26" rx="2" fill="#7e8898" />
        <path d="M42 98h12m14 0h12m16 0h12m15 0h12" stroke="#6d7686" strokeWidth="4" strokeLinecap="round" />
        <path d="M48 49c18-3 40-3 59 1m-49 14c22 4 50 4 70 0" stroke="rgba(79,88,101,0.34)" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M66 41c19-4 31-4 43-1" stroke="rgba(255,255,255,0.16)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="93" cy="49" r="6" fill={color} />
        <circle cx="93" cy="47" r="3.2" fill="rgba(255,255,255,0.38)" />
      </g>
    </svg>
  );
}

function WaterHole() {
  return (
    <div className="absolute left-[7%] bottom-[9.5%] h-[16%] w-[13%]">
      <div className="absolute inset-0 rounded-[58%_42%_55%_45%/52%_48%_52%_48%] bg-[radial-gradient(circle_at_35%_30%,rgba(198,240,255,0.95),rgba(112,184,235,0.88)_38%,rgba(74,144,214,0.96)_78%,rgba(66,118,192,1)_100%)] shadow-[0_14px_36px_rgba(72,136,201,0.24)]" />
      <div className="water-shimmer absolute inset-[14%] rounded-[50%] bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.18)_35%,transparent_62%)]" />
      <div className="ripple-ring absolute left-[46%] top-[48%] h-6 w-6 rounded-full border border-white/40" />
      <div className="ripple-ring absolute left-[46%] top-[48%] h-6 w-6 rounded-full border border-white/28" />
      <div className="ripple-ring absolute left-[46%] top-[48%] h-6 w-6 rounded-full border border-white/22" />
      <div className="absolute -left-1 bottom-4 h-10 w-2 rounded-full bg-[#5f8e29]" />
      <div className="absolute left-2 bottom-3 h-12 w-2 rounded-full bg-[#78aa36]" />
      <div className="absolute right-1 bottom-4 h-9 w-2 rounded-full bg-[#6a9833]" />
    </div>
  );
}

function SonicLens({ selection }: { selection: number }) {
  const [position, setPosition] = useState(58);

  return (
    <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/55">Sonic Lens</p>
          <p className="mt-1 text-sm text-white/72">Slide the field curtain to compare raw and cleaned energy.</p>
        </div>
        <div className="rounded-full border border-white/14 bg-white/[0.06] px-3 py-1 text-xs text-white/82">
          {position}% Cleaned
        </div>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-[#081114]">
        <img src={getSpectrogramBefore(selection)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <img
          src={getSpectrogramAfter(selection)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <div className="absolute inset-y-0 z-10" style={{ left: `${position}%` }}>
          <div className="h-full w-0.5 bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
          <div className="absolute left-1/2 top-4 h-8 w-8 -translate-x-1/2 rounded-full border border-white/55 bg-white/10 backdrop-blur">
            <SlidersHorizontal className="mx-auto mt-2 h-4 w-4 text-white" />
          </div>
        </div>
        <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/80">
          Before
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-emerald-50">
          Cleaned
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="mt-4 w-full accent-[#88fff0]"
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
      <span className="text-xs uppercase tracking-[0.24em] text-white/55">{label}</span>
      <span className="stat-mono text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function MetricBar({ label, value, width, tone }: { label: string; value: string; width: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.66rem] uppercase tracking-[0.22em] text-white/58">{label}</span>
        <span className="stat-mono text-xs font-semibold text-white">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-black/20">
        <div className="h-full rounded-full shadow-[0_0_18px_rgba(255,255,255,0.18)]" style={{ width: `${width * 100}%`, background: tone }} />
      </div>
    </div>
  );
}

export function HerdMapScene({ records, summary }: { records: CallRecord[]; summary: SummaryRecord }) {
  const enriched = useMemo<HerdRecord[]>(
    () =>
      records.map((record, index) => ({
        ...record,
        placement: placements[index % placements.length],
        quality: getQualityFlag(record.cleanabilityScore),
      })),
    [records]
  );

  const [selected, setSelected] = useState<HerdRecord | null>(null);
  const [noiseFilter, setNoiseFilter] = useState<NoiseType | "all">("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");

  const filtered = useMemo(
    () =>
      enriched.filter((record) => {
        if (noiseFilter !== "all" && record.noiseType !== noiseFilter) return false;
        if (qualityFilter !== "all" && record.quality !== qualityFilter) return false;
        return true;
      }),
    [enriched, noiseFilter, qualityFilter]
  );

  useEffect(() => {
    if (selected && !filtered.some((record) => record.id === selected.id)) {
      setSelected(null);
    }
  }, [filtered, selected]);

  const activeAudio = selected ? getAudioPath(selected.selection) : null;
  const noiseOptions: Array<NoiseType | "all"> = ["all", "generator", "vehicle", "airplane"];
  const qualityOptions: QualityFilter[] = ["all", "excellent", "good", "fair", "poor"];

  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative h-screen min-h-[860px] overflow-hidden">
        <div className="herd-sky absolute inset-x-0 top-0 h-[35%]" />
        <div className="absolute inset-x-0 top-[35%] h-[65%] savanna-ground" />
        <div className="horizon-rainbow absolute inset-x-0 top-[34.4%] h-5" />
        <div className="heat-shimmer absolute inset-x-0 top-[32.5%] h-[8%]" />
        <div className="absolute right-[7%] top-[7%] h-10 w-10 rounded-full bg-[radial-gradient(circle,rgba(255,246,184,0.95),rgba(255,231,120,0.88)_60%,rgba(255,227,110,0)_72%)] shadow-[0_0_40px_rgba(255,220,50,0.6),0_0_80px_rgba(255,220,50,0.3)]" />

        <Cloud className="absolute left-[6%] top-[9%] h-20 w-32" />
        <Cloud className="absolute left-[39%] top-[12%] h-14 w-24 opacity-90" />
        <Cloud className="absolute right-[7%] top-[11%] h-24 w-40" />

        <Bird className="absolute left-[18%] top-[18%] h-7 w-10" />
        <Bird className="absolute left-[63%] top-[15%] h-8 w-12 [animation-delay:1.5s]" />

        <AcaciaTree className="absolute left-[2%] top-[47%] h-44 w-32" />
        <AcaciaTree className="absolute left-[78%] top-[44%] h-48 w-36" />
        <AcaciaTree className="absolute left-[90%] top-[62%] h-32 w-24 opacity-90" />

        <div className="premium-pill absolute left-1/2 top-6 z-20 flex w-[min(94vw,980px)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/30 bg-[rgba(190,230,255,0.18)] px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.1] px-5 py-3">
            <span className="logo-unbounded text-[2rem] font-black tracking-tight text-white drop-shadow-[0_2px_18px_rgba(255,255,255,0.22)]">Elecom</span>
            <div className="opacity-90">
              <svg viewBox="0 0 32 18" className="elephant-walk h-[10px] w-[18px]" aria-hidden="true">
                <g fill="#ffffff" opacity="0.95">
                  <path d="M5 8c0-3 2-5 6-6 4-1 8-1 11 1 2 1 3 3 3 6v4c0 1-1 2-2 2H10c-3 0-5-2-5-4V8Z" />
                  <path d="M7 6c2-3 4-4 7-4-2 2-4 3-6 4H7Z" />
                  <path d="M24 9c2 1 3 3 3 4s-1 3-3 4l-2-2V9h2Z" />
                  <path d="M8 14h2v4H8zm5 0h2v4h-2zm6 0h2v4h-2zm4 0h2v4h-2z" />
                </g>
              </svg>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-4 gap-3">
            {[
              { label: "calls", value: filtered.length.toString() },
              { label: "clean", value: summary.avgCleanabilityScore.toFixed(1) },
              { label: "snr", value: `${summary.avgSnrImprovement >= 0 ? "+" : ""}${summary.avgSnrImprovement.toFixed(1)}` },
              { label: "avg f0", value: summary.avgF0Hz.toFixed(1) },
            ].map((item) => (
              <div key={item.label} className="rounded-full border border-white/24 bg-white/10 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                <div className="stat-mono text-[1.85rem] font-black leading-none text-white">{item.value}</div>
                <div className="mt-1 text-[0.63rem] uppercase tracking-[0.28em] text-white/66">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Link
              href="/map"
              className="rounded-full border border-white/30 bg-white/16 px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
            >
              Map View
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/18 bg-white/8 px-4 py-2 text-sm font-semibold text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              Research Dashboard
            </Link>
          </div>
        </div>

        <div className="absolute left-1/2 top-[14.5%] z-20 flex w-[min(72vw,560px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/16 bg-[rgba(255,255,255,0.07)] px-3 py-1.5 backdrop-blur-lg">
          <div className="mr-2 flex items-center gap-2 text-white/75">
            <Waves className="h-4 w-4" />
            <span className="text-[0.64rem] uppercase tracking-[0.26em]">filters</span>
          </div>
          {noiseOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setNoiseFilter(option)}
              className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] transition ${
                noiseFilter === option ? "border-white/50 bg-white/18 text-white" : "border-white/14 bg-white/[0.04] text-white/70"
              }`}
            >
              {option}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-white/15" />
          {qualityOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setQualityFilter(option)}
              className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] transition ${
                qualityFilter === option ? "border-white/50 bg-white/18 text-white" : "border-white/14 bg-white/[0.04] text-white/70"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <WaterHole />

        <div className="absolute bottom-5 left-5 z-20 rounded-2xl border border-white/12 border-l-[3px] border-l-[#00ff88] bg-[rgba(18,18,42,0.9)] px-4 py-3 shadow-[0_0_18px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          <p className="text-xs font-semibold text-white">🐘 ElephantVoices Research Data</p>
          <p className="mt-1 text-[0.7rem] text-white/72">44 recordings • Amboseli, Kenya</p>
          <p className="mt-1 text-[0.7rem] text-white/58">Loaded via Google Drive API</p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[11%] bg-[#507f24]" />

        {filtered.map((record) => (
          <button
            key={record.id}
            type="button"
            onClick={() => setSelected(record)}
            className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 transition hover:scale-[1.03]"
            style={{
              left: `${record.placement.x}%`,
              top: `${record.placement.y}%`,
              width: `${126 * record.placement.scale}px`,
            }}
          >
            <div className="relative">
              <Elephant color={noiseTone[record.noiseType]} quality={record.quality} />
            </div>
            <span className="rounded-full border border-white/25 bg-white/[0.12] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/92">
              {record.callType}
            </span>
          </button>
        ))}

        {selected ? (
          <aside className="panel-slide absolute right-0 top-0 z-40 h-full w-[min(96vw,520px)] overflow-y-auto border-l border-white/20 bg-[rgba(22,40,52,0.8)] p-5 shadow-[-20px_0_70px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/55">Selection {getSelectionLabel(selected.selection)}</p>
                <h2 className="mt-2 text-3xl font-black text-white">Herd Field Station</h2>
                <p className="mt-1 text-sm text-white/72">{selected.sound_file}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-white/20 bg-white/[0.08] p-2 text-white/75 transition hover:bg-white/12 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-[1.1fr_0.9fr] gap-3">
              <div className="rounded-2xl border border-amber-200/22 bg-white/[0.08] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/70">noise</div>
                <div className="mt-2 text-xl font-bold capitalize text-white">{selected.noiseType}</div>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/70">quality</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="stat-mono text-2xl font-black text-white">{selected.cleanabilityScore.toFixed(1)}</span>
                  <div className="origin-center animate-[panel-in_420ms_cubic-bezier(0.16,1,0.3,1)]">
                    <CleanabilityRing score={selected.cleanabilityScore} size={68} />
                  </div>
                </div>
              </div>
            </div>

            <SonicLens selection={selected.selection} />

            <div className="mt-5 rounded-[24px] border border-white/12 bg-white/[0.07] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Headphones className="h-4 w-4 text-emerald-200" />
                <p className="text-xs uppercase tracking-[0.28em] text-white/60">Cleaned Audio Relay</p>
              </div>
              {activeAudio ? (
                <audio key={activeAudio} controls className="w-full">
                  <source src={activeAudio} type="audio/wav" />
                </audio>
              ) : (
                <div className="rounded-xl border border-dashed border-white/20 px-3 py-6 text-center text-sm text-white/66">
                  Cleaned audio placeholder
                </div>
              )}
            </div>

            <GeminiBehaviorPanel call={selected} />

            <div className="mt-5 grid gap-3">
              <MetricBar label="harmonic retention" value={`${((selected.harmonicRetention ?? 1) * 100).toFixed(0)}%`} width={percentToRatio(selected.harmonicRetention ?? 1)} tone="linear-gradient(90deg,#b9ffcd,#4dff98)" />
              <MetricBar label="adaptive blend" value={`${((selected.blendAlpha ?? 0.7) * 100).toFixed(0)}%`} width={normalize(selected.blendAlpha ?? 0.7, 0.35, 0.95)} tone="linear-gradient(90deg,#b1f2ff,#66c7ff)" />
              <MetricBar label="noise stationarity" value={(selected.noiseStationarity ?? 0).toFixed(2)} width={normalize(selected.noiseStationarity ?? 0, 0.2, 1.3)} tone="linear-gradient(90deg,#ffe5b3,#ff9959)" />
              <MetricBar label="wiener strength" value={(selected.wienerStrength ?? 0).toFixed(2)} width={normalize(selected.wienerStrength ?? 0, 0.4, 1)} tone="linear-gradient(90deg,#d7c2ff,#887dff)" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailRow label="f0 hz" value={selected.f0.toFixed(1)} />
              <DetailRow label="snr" value={`${selected.snrImprovement >= 0 ? "+" : ""}${selected.snrImprovement.toFixed(1)} dB`} />
              <DetailRow label="hnr" value={`${selected.hnrImprovement >= 0 ? "+" : ""}${selected.hnrImprovement.toFixed(1)} dB`} />
              <DetailRow label="harmonics" value={`${selected.harmonicCount}/${selected.harmonicCountPreFilter ?? selected.harmonicCount}`} />
              <DetailRow label="duration" value={`${selected.duration.toFixed(2)} s`} />
              <DetailRow label="centroid" value={`${selected.spectralCentroid.toFixed(1)} Hz`} />
              <DetailRow label="energy" value={`${selected.energyDb.toFixed(1)} dB`} />
              <DetailRow label="tier" value={`Tier ${selected.maskTierUsed}`} />
            </div>

          </aside>
        ) : null}
      </section>
    </main>
  );
}
