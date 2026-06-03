type Tone = "neutral" | "green" | "yellow" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-white text-gray-950",
  green: "bg-green-50 text-green-900",
  yellow: "bg-yellow-50 text-yellow-900",
  red: "bg-red-50 text-red-900",
};

const labelTones: Record<Tone, string> = {
  neutral: "text-gray-500",
  green: "text-green-700",
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
    <div className={`rounded-2xl p-4 shadow-sm sm:rounded-3xl sm:p-5 ${tones[tone]}`}>
      <p className={`text-sm font-bold ${labelTones[tone]}`}>{title}</p>
      <p className="mt-2 text-3xl font-black sm:text-4xl">{value}</p>
    </div>
  );
}
