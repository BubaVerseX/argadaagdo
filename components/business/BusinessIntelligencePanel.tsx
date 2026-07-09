import { KpiCardGrid, type KpiCard } from "@/components/analytics/KpiCardGrid";
import type {
  RecommendationCard,
  SummaryMetric,
} from "@/lib/marketplaceIntelligence";

type BusinessIntelligencePanelProps = {
  dailySummary: SummaryMetric[];
  weeklySummary: SummaryMetric[];
  recommendations: RecommendationCard[];
};

const recommendationStyles: Record<RecommendationCard["tone"], string> = {
  green: "bg-white text-[#1a1815]",
  yellow: "bg-yellow-50 text-yellow-950",
  red: "bg-red-50 text-red-950",
};

function toKpiCards(metrics: SummaryMetric[]): KpiCard[] {
  return metrics.map((metric) => ({
    title: metric.title,
    value: metric.value,
    helper: metric.helper,
    tone: metric.tone,
  }));
}

export function BusinessIntelligencePanel({
  dailySummary,
  weeklySummary,
  recommendations,
}: BusinessIntelligencePanelProps) {
  return (
    <section className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c] sm:text-sm">
            Marketplace intelligence
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#1a1815] sm:text-3xl">
            Sell more surplus food
          </h2>
          <p className="mt-3 max-w-3xl font-semibold leading-7 text-[#6b6558]">
            Rule-based summaries help you spot slow offers, strong demand and
            pickup activity without changing the reservation flow.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 text-sm font-semibold leading-6 text-[#1a1815] shadow-[var(--shadow-soft)] lg:max-w-sm">
          <p className="font-black">No AI automation</p>
          <p className="mt-1">
            Recommendations use simple offer, order and pickup rules.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <div>
          <h3 className="text-xl font-black text-[#1a1815]">
            Today&apos;s Summary
          </h3>
          <div className="mt-4">
            <KpiCardGrid cards={toKpiCards(dailySummary)} />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-[#1a1815]">This Week</h3>
          <div className="mt-4">
            <KpiCardGrid cards={toKpiCards(weeklySummary)} />
          </div>
        </div>

        <div className="rounded-3xl bg-[#ece7da] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c]">
                Recommendations
              </p>
              <h3 className="mt-2 text-xl font-black text-[#1a1815]">
                Next best actions
              </h3>
            </div>

            <p className="text-sm font-semibold text-[#6b6558] sm:text-right">
              Based on reservation percentage, quantity and pickup timing.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recommendations.length === 0 && (
              <div className="rounded-2xl bg-white p-4 font-semibold text-[#6b6558] shadow-[var(--shadow-soft)]">
                No urgent recommendations yet. Create or activate offers to
                unlock more guidance.
              </div>
            )}

            {recommendations.map((recommendation) => (
              <article
                key={`${recommendation.title}-${recommendation.text}`}
                className={`rounded-2xl p-4 ${recommendationStyles[recommendation.tone]}`}
              >
                <p className="font-black">{recommendation.title}</p>
                <p className="mt-2 text-sm font-semibold leading-6 opacity-80">
                  {recommendation.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
