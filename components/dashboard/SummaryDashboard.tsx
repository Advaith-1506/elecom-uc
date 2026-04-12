"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import type { CallRecord, SummaryRecord } from "@/lib/types";

interface SummaryDashboardProps {
  records: CallRecord[];
  summary: SummaryRecord;
}

const palette = ["#00ff88", "#ff6b35", "#7b2fff", "#ffffff"];

export function SummaryDashboard({ records, summary }: SummaryDashboardProps) {
  const noiseChartData = Object.entries(summary.byNoiseType).map(([noiseType, stats]) => ({
    noiseType,
    cleanability: Number(stats.avgCleanabilityScore.toFixed(1)),
    snr: Number(stats.avgSnrImprovement.toFixed(1)),
    calls: stats.callCount,
  }));

  const callTypeData = Object.entries(
    records.reduce<Record<string, number>>((acc, record) => {
      acc[record.callType] = (acc[record.callType] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const selectionTrend = records.map((record) => ({
    selection: record.selection,
    snr: record.snrImprovement,
    hnrBefore: record.hnrBefore,
    hnrAfter: record.hnrAfter,
  }));

  const qualityBands = [
    { band: "Excellent", count: records.filter((record) => record.cleanabilityScore >= 85).length },
    { band: "Good", count: records.filter((record) => record.cleanabilityScore >= 70 && record.cleanabilityScore < 85).length },
    { band: "Fair", count: records.filter((record) => record.cleanabilityScore >= 50 && record.cleanabilityScore < 70).length },
    { band: "Poor", count: records.filter((record) => record.cleanabilityScore < 50).length },
  ];

  const charts = [
    {
      title: "Noise-Type Cleanability",
      body: (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={noiseChartData}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="noiseType" stroke="#71717a" tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#12122a", border: "1px solid rgba(0,255,136,0.2)" }} />
            <Bar dataKey="cleanability" radius={[10, 10, 0, 0]} fill="#00ff88" />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Call-Type Distribution",
      body: (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={callTypeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={4}>
              {callTypeData.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#12122a", border: "1px solid rgba(0,255,136,0.2)" }} />
          </PieChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Selection SNR Trend",
      body: (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={selectionTrend}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="selection" stroke="#71717a" tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#12122a", border: "1px solid rgba(0,255,136,0.2)" }} />
            <Line type="monotone" dataKey="snr" stroke="#00ff88" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Quality Band Split",
      body: (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={qualityBands} layout="vertical">
            <CartesianGrid stroke="#27272a" horizontal={false} />
            <XAxis type="number" stroke="#71717a" tickLine={false} axisLine={false} />
            <YAxis dataKey="band" type="category" stroke="#71717a" tickLine={false} axisLine={false} width={70} />
            <Tooltip contentStyle={{ background: "#12122a", border: "1px solid rgba(0,255,136,0.2)" }} />
            <Bar dataKey="count" radius={[0, 10, 10, 0]} fill="#00ff88" />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <section className="glass rounded-[24px] border border-white/10 p-5">
      <div className="mb-5">
        <p className="font-section-header text-primary">Summary Dashboard</p>
        <h2 className="mt-2 font-logo text-2xl text-foreground">Batch Outcome Overview</h2>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {charts.map((chart) => (
          <article key={chart.title} className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
            <h3 className="font-feature-label text-zinc-400">{chart.title}</h3>
            <div className="mt-4">{chart.body}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
