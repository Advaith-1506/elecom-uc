"use client";

import { useMemo, useState } from "react";
import featuresData from "@/backend/elecom/output/features/features.json";
import summaryData from "@/backend/elecom/output/features/summary.json";
import type { CallRecord, SummaryRecord } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { SpectrogramViewer } from "@/components/dashboard/SpectrogramViewer";
import { FeatureDashboard } from "@/components/dashboard/FeatureDashboard";
import { CallMetadataRow } from "@/components/dashboard/CallMetadataRow";
import { BatchResultsTable } from "@/components/dashboard/BatchResultsTable";
import { SummaryStatsBar } from "@/components/dashboard/SummaryStatsBar";
import { FilterBar, type FilterState } from "@/components/dashboard/FilterBar";
import { getQualityFlag } from "@/lib/dashboard";

const records = featuresData as CallRecord[];
const summary = summaryData as SummaryRecord;

export default function Home() {
  const [selectedRecord, setSelectedRecord] = useState<CallRecord>(records[0]);
  const [filters, setFilters] = useState<FilterState>({
    noiseType: "all",
    qualityFlag: "all",
    callType: "all",
  });

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.noiseType !== "all" && record.noiseType !== filters.noiseType) return false;
      if (filters.callType !== "all" && record.callType !== filters.callType) return false;
      if (filters.qualityFlag !== "all" && getQualityFlag(record.cleanabilityScore) !== filters.qualityFlag) return false;
      return true;
    });
  }, [filters]);

  const activeRecord = filteredRecords.find((record) => record.id === selectedRecord.id) ?? filteredRecords[0] ?? records[0];

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <DashboardHeader summary={summary} />
        <FilterBar filters={filters} onChange={setFilters} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <UploadPanel />
          <SpectrogramViewer record={activeRecord} records={filteredRecords} />
        </div>

        <CallMetadataRow record={activeRecord} />
        <FeatureDashboard record={activeRecord} records={filteredRecords} summary={summary} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <BatchResultsTable
            records={filteredRecords}
            selectedId={activeRecord.id}
            onSelect={setSelectedRecord}
          />
          <SummaryStatsBar records={filteredRecords} summary={summary} />
        </div>
      </div>
    </main>
  );
}
