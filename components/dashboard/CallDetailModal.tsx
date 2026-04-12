"use client";

import { useMemo, useState } from "react";
import { PlayCircle, Waves } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CallRecord } from "@/lib/types";
import { getAudioPath, getSpectrogramAfter, getSpectrogramBefore } from "@/lib/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CallDetailModalProps {
  record: CallRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 py-2">
      <span className="font-body text-sm text-zinc-400">{label}</span>
      <span className="font-metric-number text-sm text-foreground">{value}</span>
    </div>
  );
}

function SpectrogramCompare({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) {
  const [position, setPosition] = useState(55);
  const clipPath = `inset(0 ${100 - position}% 0 0)`;

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="relative aspect-[16/8] overflow-hidden rounded-[18px]">
        <img
          src={beforeSrc}
          alt="Before cleaning spectrogram"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = "/spectrograms/before-sample.jpg";
          }}
        />
        <img
          src={afterSrc}
          alt="After cleaning spectrogram"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath }}
          onError={(event) => {
            event.currentTarget.src = "/spectrograms/after-sample.jpg";
          }}
        />
        <div className="absolute inset-y-0" style={{ left: `${position}%` }}>
          <div className="h-full w-0.5 bg-primary shadow-[0_0_16px_rgba(0,255,136,0.8)]" />
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

export function CallDetailModal({ record, open, onOpenChange }: CallDetailModalProps) {
  const audioSrc = useMemo(() => (record ? getAudioPath(record.selection) : null), [record]);
  const chartData = record
    ? [
        { name: "HNR Before", value: record.hnrBefore },
        { name: "HNR After", value: record.hnrAfter },
        { name: "SNR Gain", value: record.snrImprovement },
      ]
    : [];

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-primary/20 bg-[#12122a] p-0 text-foreground">
        <DialogHeader className="border-b border-white/10 px-6 py-5">
          <DialogTitle className="font-logo text-3xl capitalize">
            Selection {record.selection} • {record.callType}
          </DialogTitle>
          <DialogDescription className="font-body text-zinc-400">
            Before/after spectrogram review, cleaned audio playback, and extracted call features.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <Tabs defaultValue="compare" className="gap-4">
            <TabsList className="bg-white/[0.04]">
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="signal">Signal</TabsTrigger>
            </TabsList>

            <TabsContent value="compare" className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
              <SpectrogramCompare
                beforeSrc={getSpectrogramBefore(record.selection)}
                afterSrc={getSpectrogramAfter(record.selection)}
              />
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-feature-label text-primary">Cleaned Audio</h3>
                </div>
                <div className="mt-4">
                  {audioSrc ? (
                    <audio key={audioSrc} controls className="w-full">
                      <source src={audioSrc} type="audio/wav" />
                    </audio>
                  ) : (
                    <p className="font-body text-sm text-zinc-500">
                      Cleaned audio is not available in the shipped public assets for this selection.
                    </p>
                  )}
                </div>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-feature-label text-zinc-500">Selection Summary</p>
                  <p className="mt-2 font-body text-sm text-zinc-300">
                    Noise profile: {record.noiseType}. Multiple callers: {record.multipleCallers ? "yes" : "no"}.
                    Cleanup score landed at {record.cleanabilityScore}.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <h3 className="font-feature-label text-primary">Feature Table</h3>
                <div className="mt-3">
                  <FeatureRow label="Fundamental Frequency" value={`${record.f0.toFixed(1)} Hz`} />
                  <FeatureRow label="Harmonic Count" value={String(record.harmonicCount)} />
                  <FeatureRow label="HNR Before" value={`${record.hnrBefore.toFixed(1)} dB`} />
                  <FeatureRow label="HNR After" value={`${record.hnrAfter.toFixed(1)} dB`} />
                  <FeatureRow label="SNR Improvement" value={`${record.snrImprovement.toFixed(1)} dB`} />
                  <FeatureRow label="FM Depth" value={`${record.fmDepth.toFixed(1)} Hz`} />
                  <FeatureRow label="Spectral Centroid" value={`${record.spectralCentroid.toFixed(1)} Hz`} />
                  <FeatureRow label="Duration" value={`${record.duration.toFixed(2)} s`} />
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <Waves className="h-5 w-5 text-primary" />
                  <h3 className="font-feature-label text-primary">Signal Improvement</h3>
                </div>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(245,158,11,0.2)" }} />
                      <Bar dataKey="value" fill="#00ff88" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signal">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <h3 className="font-feature-label text-primary">Operational Notes</h3>
                <p className="mt-3 font-body text-sm leading-6 text-zinc-300">
                  This selection shows a {record.cleanabilityScore >= 70 ? "strong" : "limited"} cleanup outcome.
                  The cleaned view is generated from the existing public asset set without rerunning any backend steps.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
