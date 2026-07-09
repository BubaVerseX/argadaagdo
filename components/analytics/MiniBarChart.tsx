import type { ChartDatum } from "@/lib/analytics";

type MiniBarChartProps = {
  title: string;
  description: string;
  data: ChartDatum[];
  valuePrefix?: string;
};

export function MiniBarChart({
  title,
  description,
  data,
  valuePrefix = "",
}: MiniBarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1815]">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#6b6558]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {data.length === 0 && (
          <div className="rounded-2xl bg-[#ece7da] p-4 text-sm font-semibold text-[#6b6558]">
            Not enough data yet.
          </div>
        )}

        {data.map((item) => {
          const percentage =
            maxValue > 0 ? Math.max(6, Math.round((item.value / maxValue) * 100)) : 0;

          return (
            <div key={item.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="min-w-0 truncate text-[#6b6558]">
                  {item.label}
                </span>
                <span className="text-[#1a1815]">
                  {valuePrefix}
                  {Number.isInteger(item.value)
                    ? item.value
                    : item.value.toFixed(2)}
                </span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-[#ece7da]"
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              >
                <div
                  className="h-full rounded-full bg-[#5c7a5c]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
