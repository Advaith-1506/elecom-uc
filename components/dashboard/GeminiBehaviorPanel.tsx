"use client";

import { useEffect, useMemo, useState } from "react";
import type { CallRecord } from "@/lib/types";
import { geminiFlash } from "@/lib/gemini";

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
Be specific, scientific but accessible.
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
LIKELY BEHAVIOR: [1 sentence — what this elephant 
was probably doing or communicating]

SIGNAL NOTES: [1 sentence — what the acoustic 
features tell us scientifically]

CONFIDENCE: [Low / Medium / High] — [1 sentence 
explaining why]`;
}

function parseResponse(text: string): ParsedResponse {
  const behaviorMatch = text.match(/LIKELY BEHAVIOR:\s*(.+?)(?:\n\s*\n|\nSIGNAL NOTES:|$)/is);
  const notesMatch = text.match(/SIGNAL NOTES:\s*(.+?)(?:\n\s*\n|\nCONFIDENCE:|$)/is);
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

  const prompt = useMemo(() => buildPrompt(call), [call]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        setResponse(null);
        setError("Analysis unavailable — check API key");
        return;
      }

      setLoading(true);
      setError("");
      setResponse(null);

      try {
        const result = await geminiFlash.generateContent(prompt);
        if (cancelled) return;
        setResponse(parseResponse(result.response.text()));
      } catch {
        if (cancelled) return;
        setError("Analysis unavailable — check API key");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [prompt]);

  return (
    <div className="mt-5 rounded-[24px] border border-[#00ff88]/35 bg-[#12122a] p-4 shadow-[0_0_16px_rgba(0,255,136,0.16)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#00ff88]">🤖 Gemini Analysis</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/55">
          gemini-2.5-flash
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-5 text-sm text-white/72">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ff88]/25 border-t-[#00ff88]" />
          <span>Analyzing call behavior...</span>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/8 px-4 py-4 text-sm text-red-200/80">
          {error}
        </div>
      ) : null}

      {!loading && !error && response ? (
        <div className="space-y-4">
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Likely Behavior</p>
            <p className="text-base leading-7 text-white">{response.behavior}</p>
          </section>
          <section>
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Signal Notes</p>
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
