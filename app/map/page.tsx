import featuresData from "@/backend/elecom/output/features/features.json";
import summaryData from "@/backend/elecom/output/features/summary.json";
import { HerdMapScene } from "@/components/herd/HerdMapScene";
import { getDisplaySummary } from "@/lib/display-summary";
import type { CallRecord, SummaryRecord } from "@/lib/types";

const records = featuresData as CallRecord[];
const summary = getDisplaySummary(summaryData as SummaryRecord);

export default function HerdMapPage() {
  return <HerdMapScene records={records} summary={summary} />;
}
