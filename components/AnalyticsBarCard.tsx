type AnalyticsTone = "green" | "yellow" | "red" | "neutral";

const toneStyles: Record<
  AnalyticsTone,
  { card: string; label: string; bar: string; track: string }
> = {
  green: {
    card: "bg-white text-[#1a1815]",
    label: "text-[#5c7a5c]",
    bar: "bg-[#5c7a5c]",
    track: "bg-[#eef1e8]",
  },
  yellow: {
    card: "bg-yellow-50 text-yellow-950",
    label: "text-yellow-800",
    bar: "bg-yellow-500",
    track: "bg-yellow-100",
  },
  red: {
    card: "bg-red-50 text-red-950",
    label: "text-red-700",
    bar: "bg-red-600",
    track: "bg-red-100",
  },
  neutral: {
    card: "bg-[#ece7da] text-[#1a1815]",
    label: "text-[#6b6558]",
    bar: "bg-[#8a8272]",
    track: "bg-white",
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
      className={`rounded-2xl p-4 shadow-[var(--shadow-soft)] sm:rounded-3xl sm:p-5 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${styles.label}`}>{title}</p>
          <p className="mt-2 text-3xl font-black sm:text-4xl">{value}</p>
        </div>

        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black">
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
