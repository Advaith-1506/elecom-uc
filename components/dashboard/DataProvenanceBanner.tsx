"use client";

function StatusPill({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-w-[180px] items-start gap-3 rounded-xl border border-[#2a2a4a] bg-[#0f1323] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.45)]" />
      <div>
        <p className="text-xs font-semibold text-white">{title}</p>
        <p className="mt-1 text-[0.7rem] leading-5 text-[#a0a0b0]">{detail}</p>
      </div>
    </div>
  );
}

export function DataProvenanceBanner() {
  return (
    <section className="w-full border-y border-[#2a2a4a] border-l-[3px] border-l-[#00ff88] bg-[#12122a] px-6 py-3">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-[250px]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐘</span>
            <p className="text-sm font-semibold text-white">Live data from ElephantVoices Research</p>
          </div>
          <p className="mt-1 text-xs text-[#a0a0b0]">
            44 WAV files • 212 annotated calls • Amboseli, Kenya — loaded via Google Drive
          </p>
        </div>

        <div className="flex flex-1 flex-wrap gap-3 xl:justify-center">
          <StatusPill title="Audio Loaded" detail="44 WAV files via gdown" />
          <StatusPill title="Calls Annotated" detail="212 timestamps from Dr. Mickey Pardo" />
          <StatusPill title="Pipeline Complete" detail="15 calls processed — 0 failures" />
        </div>

        <pre className="overflow-x-auto rounded-xl bg-[#0a0a1a] px-4 py-3 text-[0.68rem] leading-5 text-[#00ff88] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
{`gdown.download_folder(DRIVE_ID)
→ 44 WAV files loaded
→ 212 calls parsed
→ Pipeline ready`}
        </pre>
      </div>
    </section>
  );
}
