type Tone = "neutral" | "green" | "yellow" | "red";

const tones: Record<Tone, string> = {
  neutral: "ui-card text-cream",
  green: "ui-card text-cream",
  yellow: "border border-warning-line bg-warning-soft text-cream",
  red: "border border-danger-line bg-danger-soft text-cream",
};

const labelTones: Record<Tone, string> = {
  neutral: "text-body",
  green: "text-mint",
  yellow: "text-warning",
  red: "text-danger",
};

type StatCardProps = {
  title: string;
  value: number | string;
  tone?: Tone;
};

export default function StatCard({
  title,
  value,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl p-4 sm:rounded-[1.25rem] sm:p-5 ${tones[tone]}`}
    >
      <p className={`text-sm font-semibold ${labelTones[tone]}`}>{title}</p>
      <p className="mt-2 text-3xl font-semibold sm:text-4xl">
        {value}
      </p>
    </div>
  );
}
