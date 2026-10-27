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
  className?: string;
};

export default function StatCard({
  title,
  value,
  tone = "neutral",
  className = "",
}: StatCardProps) {
  // Long text values (e.g. "მიუწვდომელია", "შესანიშნავი") must fit a
  // half-width card on a 375px phone: smaller size and allowed to wrap.
  const isLongValue = String(value).length > 4;

  return (
    <div
      className={`min-w-0 rounded-2xl p-4 sm:rounded-[1.25rem] sm:p-5 ${tones[tone]} ${className}`}
    >
      <p className={`text-sm font-semibold ${labelTones[tone]}`}>{title}</p>
      <p
        className={`mt-2 break-words font-semibold ${
          isLongValue ? "text-lg leading-snug sm:text-2xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
