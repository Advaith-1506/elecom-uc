"use client";

import { useMemo, useState } from "react";
import type { CallRecord } from "@/lib/types";
import {
  analyzeSpectrogramImage,
  GEMINI_FALLBACK_MODEL,
  GEMINI_PRIMARY_MODEL,
  getGeminiDisplayError,
} from "@/lib/gemini";
import { getSelectionLabel, getSpectrogramAfter } from "@/lib/dashboard";

type ParsedSpectrogram = {
  harmonicStructure: string;
  noiseRemovalQuality: string;
  signalIntegrity: string;
  recommendation: string;
};

function buildPrompt(call: CallRecord) {
  return `You are an expert bioacoustician analyzing 
a cleaned elephant vocalization spectrogram.

This is the AFTER spectrogram — the signal 
has already been processed by our harmonic 
masking pipeline to remove mechanical noise.

Analyze what you see and provide a technical
assessment. Keep total response under 150 words.

Known metadata for this call:
- Selection: ${call.selection}
- Noise type removed: ${call.noiseType}
- Detected F0: ${call.f0} Hz
- Harmonic count: ${call.harmonicCount}
- SNR improvement: ${call.snrImprovement} dB
- Cleanability score: ${call.cleanabilityScore}/100

Respond in exactly this format:
HARMONIC STRUCTURE: [What harmonic bands are 
visible, their approximate frequencies]

NOISE REMOVAL QUALITY: [Assessment of how 
cleanly the noise was removed]

SIGNAL INTEGRITY: [Whether the elephant call 
appears preserved or damaged by processing]

RECOMMENDATION: [Should this recording be 
used for research? Yes / Needs review / No]`;
}

function parseResponse(text: string): ParsedSpectrogram {
  const harmonicMatch = text.match(/HARMONIC STRUCTURE:\s*(.+?)(?:\n\s*\n|\nNOISE REMOVAL QUALITY:|$)/is);
  const noiseMatch = text.match(/NOISE REMOVAL QUALITY:\s*(.+?)(?:\n\s*\n|\nSIGNAL INTEGRITY:|$)/is);
  const integrityMatch = text.match(/SIGNAL INTEGRITY:\s*(.+?)(?:\n\s*\n|\nRECOMMENDATION:|$)/is);
  const recommendationMatch = text.match(/RECOMMENDATION:\s*(.+)$/is);

  return {
    harmonicStructure: harmonicMatch?.[1]?.trim() || "No harmonic assessment returned.",
    noiseRemovalQuality: noiseMatch?.[1]?.trim() || "No noise-removal assessment returned.",
    signalIntegrity: integrityMatch?.[1]?.trim() || "No signal-integrity assessment returned.",
    recommendation: recommendationMatch?.[1]?.trim() || "Needs review",
  };
}

function recommendationTone(recommendation: string) {
  const normalized = recommendation.toLowerCase();
  if (normalized.startsWith("yes")) {
    return {
      label: "Use for Research",
      className: "border-emerald-400/30 bg-emerald-400/12 text-emerald-200",
    };
  }
  if (normalized.startsWith("no")) {
    return {
      label: "Do Not Use",
      className: "border-red-400/30 bg-red-400/12 text-red-200",
    };
  }
  return {
    label: "Needs Review",
    className: "border-yellow-400/30 bg-yellow-400/12 text-yellow-100",
  };
}

export function GeminiSpectrogramPanel({ call }: { call: CallRecord }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<ParsedSpectrogram | null>(null);
  const [modelUsed, setModelUsed] = useState(GEMINI_PRIMARY_MODEL);

  const prompt = useMemo(() => buildPrompt(call), [call]);
  const imageUrl = useMemo(() => getSpectrogramAfter(call.selection), [call.selection]);

  async function handleAnalyze() {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setResponse(null);
      setError("Analysis unavailable — check API key");
      return;
    }

    setLoading(true);
    setError("");
    setModelUsed(GEMINI_PRIMARY_MODEL);

    try {
      const result = await analyzeSpectrogramImage(imageUrl, prompt);
      setResponse(parseResponse(result.text));
      setModelUsed(result.model);
    } catch (error) {
      setError(getGeminiDisplayError(error));
    } finally {
      setLoading(false);
    }
  }

  const recommendation = recommendationTone(response?.recommendation || "Needs review");

  return (
    <div className="glass rounded-2xl bg-[#12122a] p-5 shadow-[0_0_12px_rgba(0,255,136,0.16)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#00ff88]">🔬 Spectrogram Analysis</h3>
          <p className="mt-1 text-xs text-white/52">
            Gemini-assisted review of selection {getSelectionLabel(call.selection)} using the cleaned AFTER spectrogram.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-white/55">
          {modelUsed === GEMINI_FALLBACK_MODEL
            ? `${GEMINI_FALLBACK_MODEL} fallback — multimodal`
            : `${GEMINI_PRIMARY_MODEL} — multimodal`}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full rounded-xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#0a0a1a] shadow-[0_0_20px_rgba(0,255,136,0.45)] transition hover:opacity-95 disabled:cursor-wait disabled:opacity-80"
      >
        {response ? "Re-analyze" : "Analyze Spectrogram with Gemini"}
      </button>

      <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-white/64">
        Analyzing: <span className="stat-mono text-white">Selection {getSelectionLabel(call.selection)}</span> —{" "}
        <span className="stat-mono text-[#00ff88]">{imageUrl}</span>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
          <p className="text-sm text-white/72">Reading spectrogram...</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
            <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-[#00ff88]" />
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/8 px-4 py-4 text-sm text-red-200/80 whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      {!loading && !error && response ? (
        <div className="mt-5 space-y-4">
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Harmonic Structure</p>
            <p className="text-sm leading-6 text-white">{response.harmonicStructure}</p>
          </section>
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Noise Removal Quality</p>
            <p className="text-sm leading-6 text-white">{response.noiseRemovalQuality}</p>
          </section>
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Signal Integrity</p>
            <p className="text-sm leading-6 text-white">{response.signalIntegrity}</p>
          </section>
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Recommendation</p>
              <p className="mt-1 text-xs text-white/58">{response.recommendation}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${recommendation.className}`}>
              {recommendation.label}
            </span>
          </section>
        </div>
      ) : null}
    </div>
  );
}
