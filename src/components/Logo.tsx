"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const textColor = isDark ? "#FFFFFF" : "#0B132B";
  const bracketColor = isDark ? "#FFFFFF" : "#0B132B";
  const accentColor = "#10B981";

  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-lg", tagline: "text-[8px]" },
    md: { icon: "h-8 w-8", text: "text-xl", tagline: "text-[9px]" },
    lg: { icon: "h-12 w-12", text: "text-3xl", tagline: "text-xs" },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        className={s.icon}
        viewBox="0 0 256 256"
        fill="none"
        role="img"
        aria-label="Hackatool icon"
      >
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M82 66 H58 Q45 66 45 79 V177 Q45 190 58 190 H82" stroke={accentColor} strokeWidth="18" />
          <path d="M174 66 H198 Q211 66 211 79 V177 Q211 190 198 190 H174" stroke={bracketColor} strokeWidth="18" />
          <path d="M115 96 L82 128 L115 160" stroke={bracketColor} strokeWidth="18" />
          <path d="M141 96 L174 128 L141 160" stroke={bracketColor} strokeWidth="18" />
        </g>
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-extrabold ${s.text}`} style={{ color: textColor }}>
            Hackatool
          </span>
          <span className={`font-bold ${s.tagline} tracking-widest`} style={{ color: isDark ? "#B8C4D6" : "#64748B" }}>
            BUILD · EXPERIMENT · SHIP
          </span>
        </div>
      )}
    </div>
  );
}
