type Tone = "neutral" | "green" | "yellow" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-white text-[#1a1815]",
  green: "bg-white text-[#1a1815]",
  yellow: "bg-yellow-50 text-yellow-900",
  red: "bg-red-50 text-red-900",
};

const labelTones: Record<Tone, string> = {
  neutral: "text-[#6b6558]",
  green: "text-[#5c7a5c]",
  yellow: "text-yellow-700",
  red: "text-red-700",
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
      className={`rounded-2xl p-4 shadow-[var(--shadow-soft)] sm:rounded-[1.25rem] sm:p-5 ${tones[tone]}`}
    >
      <p className={`text-sm font-semibold ${labelTones[tone]}`}>{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {value}
      </p>
    </div>
  );
}
