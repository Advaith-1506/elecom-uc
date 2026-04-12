export type CallType = "rumble" | "trumpet" | "roar";
export type NoiseType = "generator" | "vehicle" | "airplane" | "mixed";
export type QualityFlag = "excellent" | "good" | "fair" | "poor";

export interface CallRecord {
  id: string;
  selection: number;
  sound_file: string;
  callType: CallType;
  noiseType: NoiseType;
  duration: number;
  f0: number;
  harmonicCount: number;
  hnrBefore: number;
  hnrAfter: number;
  hnrImprovement: number;
  snrImprovement: number;
  fmDepth: number;
  spectralCentroid: number;
  energyDb: number;
  maskTierUsed: number;
  harmonicRetention?: number;
  harmonicCountPreFilter?: number;
  blendAlpha?: number;
  wienerStrength?: number;
  noiseStationarity?: number;
  cleanabilityScore: number;
  multipleCallers: boolean;
  spectrogramBefore: string;
  spectrogramAfter: string;
}

export interface SummaryNoiseStats {
  avgCleanabilityScore: number;
  avgSnrImprovement: number;
  avgF0Hz: number;
  callCount: number;
}

export interface SummaryCallTypeStats {
  avgCleanabilityScore: number;
  callCount: number;
}

export interface SummaryRecord {
  totalCallsProcessed: number;
  totalCallsFailed: number;
  avgCleanabilityScore: number;
  avgSnrImprovement: number;
  avgHnrImprovement: number;
  avgF0Hz: number;
  multipleCallerFlags: number;
  byNoiseType: Partial<Record<NoiseType, SummaryNoiseStats>>;
  byCallType: Partial<Record<CallType, SummaryCallTypeStats>>;
  tierUsage: Record<string, number>;
}
