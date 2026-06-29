type TrustBadgeTone = "green" | "yellow" | "gray";

type TrustBadgeProps = {
  label: string;
  tone?: TrustBadgeTone;
};

const toneClasses: Record<TrustBadgeTone, string> = {
  green: "bg-green-50 text-green-800 ring-green-100",
  yellow: "bg-yellow-50 text-yellow-900 ring-yellow-100",
  gray: "bg-[#F7F6EF] text-gray-800 ring-gray-100",
};

export function TrustBadge({ label, tone = "green" }: TrustBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-sm font-black ring-1 ${toneClasses[tone]}`}
    >
      ✓ {label}
    </span>
  );
}
