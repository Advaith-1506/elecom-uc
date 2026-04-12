"use client";

interface CleanabilityRingProps {
  score: number;
  size?: number;
}

export function CleanabilityRing({ score, size = 100 }: CleanabilityRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`Cleanability score: ${score}%`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={8}
            className="score-ring-track"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={8}
            stroke="#00ff88"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: "drop-shadow(0 0 6px rgba(0,255,136,0.8))",
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="stat-mono text-xl text-primary">{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cleanability</span>
    </div>
  );
}
