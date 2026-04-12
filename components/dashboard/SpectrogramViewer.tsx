"use client";

import { useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import type { CallRecord, NoiseType } from "@/lib/types";
import {
  getAudioPath,
  getNoiseTone,
  getSelectionLabel,
  getSpectrogramAfter,
  getSpectrogramBefore,
} from "@/lib/dashboard";

interface SpectrogramViewerProps {
  record: CallRecord;
  records: CallRecord[];
}

const noiseOrder: NoiseType[] = ["generator", "vehicle", "airplane", "mixed"];

function SpectrogramCompare({ selection }: { selection: number }) {
  const [position, setPosition] = useState(50);
  const beforeSrc = getSpectrogramBefore(selection);
  const afterSrc = getSpectrogramAfter(selection);

  return (
    <div className="rounded-xl border border-border bg-black p-4 shadow-[0_0_10px_rgba(0,255,136,0.2)]">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-black">
        <img
          src={beforeSrc}
          alt={`Selection ${selection} before cleaning spectrogram`}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          src={afterSrc}
          alt={`Selection ${selection} after cleaning spectrogram`}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <div className="absolute inset-y-0 z-10" style={{ left: `${position}%` }}>
          <div className="h-full w-0.5 bg-primary shadow-[0_0_12px_rgba(0,255,136,0.7)]" />
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="mt-4 w-full accent-[#00ff88]"
      />
    </div>
  );
}

export function SpectrogramViewer({ record, records }: SpectrogramViewerProps) {
  const [openRecord, setOpenRecord] = useState<CallRecord | null>(null);
  const grouped = useMemo(
    () =>
      noiseOrder.map((noiseType) => ({
        noiseType,
        records: records.filter((entry) => entry.noiseType === noiseType),
      })),
    [records]
  );

  const modalRecord = openRecord ?? record;
  const audioSrc = modalRecord ? getAudioPath(modalRecord.selection) : null;

  return (
    <>
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Spectrogram Viewer</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Default selection loaded: {getSelectionLabel(record.selection)}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground btn-glow-cyan transition hover:opacity-90"
            onClick={() => setOpenRecord(record)}
          >
            <Play className="h-4 w-4" />
            Clean &amp; Analyze
          </button>
        </div>

        <div className="grid gap-4">
          {grouped.map(({ noiseType, records: groupRecords }) =>
            groupRecords.length ? (
              <div key={noiseType} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{noiseType}</h3>
                  <span className={`badge-neon rounded-full border px-3 py-1 text-xs uppercase ${getNoiseTone(noiseType)}`}>
                    {groupRecords.length} calls
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupRecords.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setOpenRecord(entry)}
                      className={`rounded-xl border bg-[#0b0b16] p-3 text-left transition hover:border-primary/40 ${
                        entry.id === record.id ? "border-primary shadow-[0_0_10px_rgba(0,255,136,0.3)]" : "border-border"
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-black p-2">
                          <img
                            src={getSpectrogramBefore(entry.selection)}
                            alt={`Selection ${entry.selection} before spectrogram`}
                            className="h-28 w-full object-contain"
                          />
                        </div>
                        <div className="rounded-lg bg-black p-2">
                          <img
                            src={getSpectrogramAfter(entry.selection)}
                            alt={`Selection ${entry.selection} after spectrogram`}
                            className="h-28 w-full object-contain"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="stat-mono text-sm text-foreground">SEL {getSelectionLabel(entry.selection)}</p>
                          <p className="mt-1 text-xs text-muted-foreground capitalize">{entry.noiseType}</p>
                        </div>
                        <span className={`badge-neon rounded-full border px-2.5 py-1 text-xs uppercase ${getNoiseTone(entry.noiseType)}`}>
                          {entry.noiseType}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>

      {openRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl p-5">
            <button
              type="button"
              onClick={() => setOpenRecord(null)}
              className="absolute right-4 top-4 rounded-full border border-border bg-card p-2 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5">
              <h3 className="text-xl font-semibold text-foreground">
                Selection {getSelectionLabel(modalRecord.selection)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Before/after spectrogram slider with cleaned audio for {modalRecord.sound_file}
              </p>
            </div>

            <SpectrogramCompare selection={modalRecord.selection} />

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">Cleaned Audio</p>
              {audioSrc ? (
                <audio controls className="w-full">
                  <source src={audioSrc} type="audio/wav" />
                </audio>
              ) : (
                <p className="text-sm text-muted-foreground">No cleaned audio asset is available for this selection.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
