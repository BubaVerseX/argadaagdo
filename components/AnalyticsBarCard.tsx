type AnalyticsTone = "green" | "yellow" | "red" | "neutral";

const toneStyles: Record<
  AnalyticsTone,
  { card: string; label: string; bar: string; track: string }
> = {
  green: {
    card: "soft-raised text-[#2e2a22]",
    label: "text-[#a67c52]",
    bar: "bg-[#a67c52]",
    track: "bg-[#f4efe4]",
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
    card: "bg-[#f4efe4] text-[#2e2a22]",
    label: "text-[#6b6152]",
    bar: "bg-[#8a8072]",
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
      className={`rounded-2xl p-4 sm:rounded-3xl sm:p-5 ${styles.card}`}
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
