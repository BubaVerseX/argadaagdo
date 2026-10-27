type AnalyticsTone = "green" | "yellow" | "red" | "neutral";

const toneStyles: Record<
  AnalyticsTone,
  { card: string; label: string; bar: string; track: string }
> = {
  green: {
    card: "ui-card text-cream",
    label: "text-mint",
    bar: "bg-mint",
    track: "bg-well",
  },
  yellow: {
    card: "border border-warning-line bg-warning-soft text-cream",
    label: "text-warning",
    bar: "bg-warning",
    track: "bg-well",
  },
  red: {
    card: "border border-danger-line bg-danger-soft text-cream",
    label: "text-danger",
    bar: "bg-danger",
    track: "bg-well",
  },
  neutral: {
    card: "border border-line bg-well text-cream",
    label: "text-body",
    bar: "bg-muted",
    track: "bg-well",
  },
};

type AnalyticsBarCardProps = {
  title: string;
  value: number;
  caption: string;
  percentage: number;
  tone?: AnalyticsTone;
};

export default function AnalyticsBarCard({
  title,
  value,
  caption,
  percentage,
  tone = "neutral",
}: AnalyticsBarCardProps) {
  const styles = toneStyles[tone];
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div
      className={`rounded-2xl p-4 sm:rounded-3xl sm:p-5 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${styles.label}`}>{title}</p>
          <p className="mt-2 text-3xl font-semibold sm:text-4xl">{value}</p>
        </div>

        <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold">
          {safePercentage}%
        </span>
      </div>

      <div
        className={`mt-4 h-3 overflow-hidden rounded-full ${styles.track}`}
        aria-label={`${title}: ${safePercentage}%`}
        role="img"
      >
        <div
          className={`h-full rounded-full ${styles.bar}`}
          style={{ width: `${safePercentage}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-semibold opacity-75">{caption}</p>
    </div>
  );
}
