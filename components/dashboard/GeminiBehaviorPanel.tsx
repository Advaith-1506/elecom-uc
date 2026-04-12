"use client";

import { useMemo, useState } from "react";
import type { CallRecord } from "@/lib/types";
import {
  GEMINI_FALLBACK_MODEL,
  GEMINI_PRIMARY_MODEL,
  generateGeminiText,
  getGeminiDisplayError,
} from "@/lib/gemini";

type ParsedResponse = {
  behavior: string;
  notes: string;
  confidenceLabel: "High" | "Medium" | "Low";
  confidenceText: string;
};

function buildPrompt(call: CallRecord) {
  return `You are an expert elephant bioacoustician 
working with ElephantVoices research data.

Analyze this elephant call and provide a 
behavioral interpretation in 3 short sections.
Be scientific but friendly, vivid, and a little playful.
Make it accessible to non-research users without becoming silly.
If helpful, use one light phrase like "this sounds like..."
Keep total response under 120 words.

Call data:
- Call type: ${call.callType}
- Fundamental frequency: ${call.f0} Hz
- Harmonic count: ${call.harmonicCount}
- FM depth (frequency modulation): ${call.fmDepth} Hz
- Duration: ${call.duration} seconds
- Noise type interference: ${call.noiseType}
- Signal quality (cleanability): ${call.cleanabilityScore}/100
- Multiple callers detected: ${call.multipleCallers}

Respond in exactly this format:
LIKELY VIBE: [1 sentence — what this elephant 
was probably doing or communicating, in friendly language]

WHAT THE SIGNAL SAYS: [1 sentence — what the acoustic 
features tell us scientifically, in plain English]

CONFIDENCE: [Low / Medium / High] — [1 sentence 
explaining why]`;
}

function parseResponse(text: string): ParsedResponse {
  const behaviorMatch = text.match(/LIKELY (?:BEHAVIOR|VIBE):\s*(.+?)(?:\n\s*\n|\n(?:SIGNAL NOTES|WHAT THE SIGNAL SAYS):|$)/is);
  const notesMatch = text.match(/(?:SIGNAL NOTES|WHAT THE SIGNAL SAYS):\s*(.+?)(?:\n\s*\n|\nCONFIDENCE:|$)/is);
  const confidenceMatch = text.match(/CONFIDENCE:\s*(Low|Medium|High)\s*[—-]\s*(.+)$/is);

  return {
    behavior: behaviorMatch?.[1]?.trim() || "No behavioral interpretation returned.",
    notes: notesMatch?.[1]?.trim() || "No signal notes returned.",
    confidenceLabel: (confidenceMatch?.[1]?.trim() as ParsedResponse["confidenceLabel"]) || "Low",
    confidenceText: confidenceMatch?.[2]?.trim() || "Gemini did not explain confidence.",
  };
}

function confidenceTone(level: ParsedResponse["confidenceLabel"]) {
  if (level === "High") return "border-emerald-400/30 bg-emerald-400/12 text-emerald-200";
  if (level === "Medium") return "border-yellow-400/30 bg-yellow-400/12 text-yellow-100";
  return "border-orange-400/30 bg-orange-400/12 text-orange-100";
}

export function GeminiBehaviorPanel({ call }: { call: CallRecord }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<ParsedResponse | null>(null);
  const [modelUsed, setModelUsed] = useState(GEMINI_PRIMARY_MODEL);

  const prompt = useMemo(() => buildPrompt(call), [call]);

  async function handleAnalyze() {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setResponse(null);
      setError("Analysis unavailable — check API key");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);
    setModelUsed(GEMINI_PRIMARY_MODEL);

    try {
      const result = await generateGeminiText(prompt);
      setResponse(parseResponse(result.text));
      setModelUsed(result.model);
    } catch (error) {
      setError(getGeminiDisplayError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 rounded-[24px] border border-[#00ff88]/35 bg-[#12122a] p-4 shadow-[0_0_16px_rgba(0,255,136,0.16)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#00ff88]">🤖 Gemini Analysis</h3>
          <p className="mt-1 text-xs text-white/55">Friendly AI read on what this elephant may be saying.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/55">
          {modelUsed === GEMINI_FALLBACK_MODEL ? `${GEMINI_FALLBACK_MODEL} fallback` : GEMINI_PRIMARY_MODEL}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full rounded-xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#0a0a1a] shadow-[0_0_20px_rgba(0,255,136,0.45)] transition hover:opacity-95 disabled:cursor-wait disabled:opacity-80"
      >
        {response ? "Re-analyze Behavior" : "Analyze Behavior with Gemini"}
      </button>

      {!loading && !error && !response ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-white/68">
          Press the button to generate a friendly AI interpretation for this elephant call.
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-5 text-sm text-white/72">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ff88]/25 border-t-[#00ff88]" />
          <span>Analyzing call behavior...</span>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/8 px-4 py-4 text-sm text-red-200/80 whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      {!loading && !error && response ? (
        <div className="space-y-4">
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Likely Vibe</p>
            <p className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-base leading-7 text-white">
              {response.behavior}
            </p>
          </section>
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">What The Signal Says</p>
            <p className="text-sm leading-6 text-white/72">{response.notes}</p>
          </section>
          <section>
            <p className="mb-2 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Confidence</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceTone(response.confidenceLabel)}`}>
                {response.confidenceLabel}
              </span>
              <p className="text-sm leading-6 text-white/72">{response.confidenceText}</p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
