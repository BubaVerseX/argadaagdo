type TrustBadgeTone = "green" | "yellow" | "gray";

type TrustBadgeProps = {
  label: string;
  tone?: TrustBadgeTone;
};

const toneClasses: Record<TrustBadgeTone, string> = {
  green: "bg-white text-[#5c7a5c] shadow-[var(--shadow-soft)]",
  yellow: "bg-yellow-50 text-yellow-900 ring-1 ring-yellow-100",
  gray: "bg-[#ece7da] text-[#1a1815]",
};

export function TrustBadge({ label, tone = "green" }: TrustBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-sm font-semibold ${toneClasses[tone]}`}
    >
      ✓ {label}
    </span>
  );
}
