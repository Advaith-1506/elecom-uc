"use client";

import { useState, useCallback } from "react";
import featuresData from "@/data/features.json";
import type { CallRecord } from "@/lib/types";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { SpectrogramViewer } from "@/components/dashboard/SpectrogramViewer";
import { FeatureDashboard } from "@/components/dashboard/FeatureDashboard";
import { CallMetadataRow } from "@/components/dashboard/CallMetadataRow";
import { BatchResultsTable } from "@/components/dashboard/BatchResultsTable";
import { SummaryStatsBar } from "@/components/dashboard/SummaryStatsBar";

const records = featuresData as CallRecord[];

export default function Home() {
  const [selectedRecord, setSelectedRecord] = useState<CallRecord>(records[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2200);
  }, []);

  const handleSelectRecord = useCallback((record: CallRecord) => {
    setSelectedRecord(record);
  }, []);

  return (
    <main className="min-h-screen py-6 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <DashboardHeader />

        {/* Upload + Spectrogram row */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <UploadPanel />
          <SpectrogramViewer
            beforeSrc="/spectrograms/before-sample.jpg"
            afterSrc="/spectrograms/after-sample.jpg"
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* Call metadata */}
        <CallMetadataRow
          callType={selectedRecord.callType}
          noiseType={selectedRecord.noiseType}
          multipleCallers={selectedRecord.multipleCallers}
        />

        {/* Feature dashboard */}
        <FeatureDashboard record={selectedRecord} />

        {/* Batch results + Summary side-by-side on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          <BatchResultsTable
            records={records}
            selectedId={selectedRecord.id}
            onSelect={handleSelectRecord}
          />
          <SummaryStatsBar records={records} />
        </div>

      </div>
    </main>
  );
}
