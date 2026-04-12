export type CallType = "rumble" | "trumpet" | "roar";
export type NoiseType = "wind" | "vehicle" | "rain" | "insects";

export interface CallRecord {
  id: string;
  selection: string;
  callType: CallType;
  noiseType: NoiseType;
  f0: number;
  harmonicCount: number;
  hnrBefore: number;
  hnrAfter: number;
  snrImprovement: number;
  fmDepth: number;
  spectralCentroid: number;
  duration: number;
  cleanabilityScore: number;
  multipleCallers: boolean;
  spectrogramBefore: string;
  spectrogramAfter: string;
}
