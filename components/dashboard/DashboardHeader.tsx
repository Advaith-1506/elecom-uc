"use client";

export function DashboardHeader() {
  return (
    <header className="glass-strong rounded-2xl px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Glowing elephant SVG icon */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full blur-md bg-cyan-400/40 scale-110" />
          <svg
            className="relative w-10 h-10 text-cyan-300"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <ellipse cx="26" cy="36" rx="18" ry="14" fill="currentColor" fillOpacity="0.18" />
            <ellipse cx="26" cy="36" rx="18" ry="14" stroke="currentColor" strokeWidth="2" />
            {/* Head */}
            <circle cx="38" cy="24" r="12" fill="currentColor" fillOpacity="0.18" />
            <circle cx="38" cy="24" r="12" stroke="currentColor" strokeWidth="2" />
            {/* Ear */}
            <ellipse cx="50" cy="22" rx="6" ry="9" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2" />
            {/* Trunk */}
            <path d="M28 34 Q22 46 28 52 Q32 56 30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Eye */}
            <circle cx="36" cy="21" r="2" fill="currentColor" />
            {/* Tusk */}
            <path d="M30 30 Q26 36 22 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Legs */}
            <rect x="14" y="46" width="6" height="10" rx="3" fill="currentColor" fillOpacity="0.7" />
            <rect x="22" y="46" width="6" height="10" rx="3" fill="currentColor" fillOpacity="0.7" />
            <rect x="30" y="46" width="6" height="10" rx="3" fill="currentColor" fillOpacity="0.7" />
            {/* Waveform decoration */}
            <path d="M2 36 Q5 28 8 36 Q11 44 14 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
          </svg>
        </div>
        <div>
          <h1 className="font-logo text-2xl text-glow-cyan text-primary">
            Elecom
          </h1>
          <p className="font-status text-muted-foreground">
            Bioacoustics Analysis Platform
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="font-status text-muted-foreground">Signal Engine Active</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1 items-end h-5">
          {[3, 6, 4, 8, 5, 7, 3, 9, 4, 6, 5, 8, 3, 7].map((h, i) => (
            <div
              key={i}
              className="w-0.5 bg-primary/60 rounded-full animate-pulse"
              style={{
                height: `${h * 5}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.8 + (i % 3) * 0.3}s`,
              }}
            />
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-right">
          <p className="font-status text-muted-foreground">Session</p>
          <p className="font-status text-primary">EV-2026-0411</p>
        </div>
      </div>
    </header>
  );
}
