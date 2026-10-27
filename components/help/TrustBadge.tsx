import { CheckIcon } from "@/components/icons";

type TrustBadgeTone = "green" | "yellow" | "gray";

type TrustBadgeProps = {
  label: string;
  tone?: TrustBadgeTone;
};

const toneClasses: Record<TrustBadgeTone, string> = {
  green: "ui-card text-mint",
  yellow: "bg-warning-soft text-warning ring-1 ring-warning-line",
  gray: "bg-well text-cream",
};

export function TrustBadge({ label, tone = "green" }: TrustBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${toneClasses[tone]}`}
    >
      <CheckIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      {label}
    </span>
  );
}
