import type { CallRecord, NoiseType, QualityFlag } from "@/lib/types";

const audioBySelection: Record<string, string> = {
  "1": "04-040920-02_vehicle_1.wav",
  "2": "04-040920-02_vehicle_1.wav",
  "3": "04-040920-02_vehicle_1.wav",
  "4": "04-040920-02_vehicle_2.wav",
  "5": "04-040920-03_vehicle_noise_1.wav",
  "13": "061220-24_airplane_01.wav",
  "14": "090224-09_generator_01.wav",
  "15": "090224-09_generator_01.wav",
  "16": "090224-09_generator_01.wav",
  "17": "090224-09_generator_01.wav",
  "18": "090224-09_generator_01.wav",
  "19": "1989-06_airplane_01.wav",
  "20": "1989-06_airplane_01.wav",
  "22": "1989-08_airplane_01.wav",
  "115": "2000-27_airplane_01.wav",
};

export function getQualityFlag(score: number): QualityFlag {
  if (score >= 75) return "excellent";
  if (score >= 55) return "good";
  if (score >= 35) return "fair";
  return "poor";
}

export function getSelectionNumber(selection: number | string): string {
  return String(Number(selection));
}

export function getSelectionLabel(selection: number | string): string {
  return getSelectionNumber(selection).padStart(3, "0");
}

export function getSpectrogramBefore(selection: number | string): string {
  return `/spectrograms/${getSelectionNumber(selection)}_before.png`;
}

export function getSpectrogramAfter(selection: number | string): string {
  return `/spectrograms/${getSelectionNumber(selection)}_after.png`;
}

export function getAudioPath(selection: number | string): string | null {
  const normalized = getSelectionNumber(selection);
  const file = audioBySelection[normalized];
  if (!file) return null;
  return `/audio/${file}_call_${normalized}_cleaned.wav`;
}

export function getScoreTone(score: number): string {
  if (score >= 75) return "text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/12 shadow-[0_0_10px_rgba(0,255,136,0.25)]";
  if (score >= 55) return "text-[#7b2fff] border-[#7b2fff]/40 bg-[#7b2fff]/12 shadow-[0_0_10px_rgba(123,47,255,0.25)]";
  if (score >= 35) return "text-[#ff6b35] border-[#ff6b35]/40 bg-[#ff6b35]/12 shadow-[0_0_10px_rgba(255,107,53,0.25)]";
  return "text-[#a0a0b0] border-[#2a2a4a] bg-white/5";
}

export function getNoiseTone(noiseType: NoiseType): string {
  const tones: Record<NoiseType, string> = {
    generator: "text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/12 shadow-[0_0_10px_rgba(0,255,136,0.25)]",
    vehicle: "text-[#ff6b35] border-[#ff6b35]/40 bg-[#ff6b35]/12 shadow-[0_0_10px_rgba(255,107,53,0.25)]",
    airplane: "text-[#7b2fff] border-[#7b2fff]/40 bg-[#7b2fff]/12 shadow-[0_0_10px_rgba(123,47,255,0.25)]",
    mixed: "text-white border-white/30 bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]",
  };
  return tones[noiseType];
}

export function getCallTypeTone(callType: CallRecord["callType"]): string {
  const tones: Record<CallRecord["callType"], string> = {
    rumble: "text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 shadow-[0_0_10px_rgba(0,255,136,0.25)]",
    trumpet: "text-[#ff6b35] border-[#ff6b35]/40 bg-[#ff6b35]/10 shadow-[0_0_10px_rgba(255,107,53,0.25)]",
    roar: "text-[#7b2fff] border-[#7b2fff]/40 bg-[#7b2fff]/10 shadow-[0_0_10px_rgba(123,47,255,0.25)]",
  };
  return tones[callType];
}
