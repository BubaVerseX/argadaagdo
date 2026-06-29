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
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-gray-600">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {data.length === 0 && (
          <div className="rounded-2xl bg-[#F7F6EF] p-4 text-sm font-semibold text-gray-600">
            Not enough data yet.
          </div>
        )}

        {data.map((item) => {
          const percentage =
            maxValue > 0 ? Math.max(6, Math.round((item.value / maxValue) * 100)) : 0;

          return (
            <div key={item.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="min-w-0 truncate text-gray-700">
                  {item.label}
                </span>
                <span className="text-gray-950">
                  {valuePrefix}
                  {Number.isInteger(item.value)
                    ? item.value
                    : item.value.toFixed(2)}
                </span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-green-100"
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              >
                <div
                  className="h-full rounded-full bg-green-700"
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
