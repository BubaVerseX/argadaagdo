import type { ReactNode } from "react";

// The deep green header of the app screens (design v3 B3Home): a large faint
// logo leaf in the corner and a soft wave into the beige below. Everything
// inside uses the dark-surface colours (.theme-forest).
export default function NativeHero({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="native-hero-wrap">
      <div className="native-hero theme-forest">
        <svg className="native-hero-leaf" viewBox="0 0 200 200" aria-hidden="true">
          <path d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z" />
        </svg>
        <div className={`relative ${className}`}>{children}</div>
      </div>
      <svg className="native-hero-wave" viewBox="0 0 390 50" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0 H390 V18 C300 50 210 0 120 26 C70 40 30 38 0 28 Z" />
      </svg>
    </div>
  );
}
