/** The logo leaf as a large, faint shape for section backgrounds. */
export function LeafDecor({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
    >
      <path
        d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Soft wave ending a coloured section. It sits right below that section. */
export function WaveEdge({
  fill = "var(--brand-forest)",
  className = "",
}: {
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 390 50"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none -mt-px block h-10 w-full sm:h-14 ${className}`}
    >
      <path d="M0 0 H390 V18 C300 50 210 0 120 26 C70 40 30 38 0 28 Z" fill={fill} />
    </svg>
  );
}
