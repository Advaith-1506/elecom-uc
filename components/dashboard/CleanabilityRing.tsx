"use client";

import { useEffect, useRef } from "react";

interface CleanabilityRingProps {
  score: number; // 0-100
  size?: number;
}

export function CleanabilityRing({ score, size = 100 }: CleanabilityRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color stops: red (0) → yellow (50) → green (100)
  const hue = Math.round((score / 100) * 120); // 0=red, 120=green
  const color = `hsl(${hue}, 90%, 58%)`;

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
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 6px ${color}aa)`,
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xl font-bold font-mono tabular-nums"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cleanability</span>
    </div>
  );
}
