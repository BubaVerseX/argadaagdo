"use client";

import { KpiCardGrid, type KpiCard } from "@/components/analytics/KpiCardGrid";
import type {
  RecommendationCard,
  SummaryMetric,
} from "@/lib/marketplaceIntelligence";
import { useLanguage } from "@/lib/useLanguage";

type BusinessIntelligencePanelProps = {
  dailySummary: SummaryMetric[];
  weeklySummary: SummaryMetric[];
  recommendations: RecommendationCard[];
};

const recommendationStyles: Record<RecommendationCard["tone"], string> = {
  green: "ui-card text-cream",
  yellow: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
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
  const { language } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <section className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-3xl sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
            {isGeorgian ? "მარკეტის ანალიტიკა" : "Marketplace intelligence"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-cream sm:text-3xl">
            {isGeorgian ? "გაყიდე მეტი ჭარბი საკვები" : "Sell more surplus food"}
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-body">
            {isGeorgian
              ? "წესებზე დაფუძნებული შეჯამებები გეხმარება, შეამჩნიო ნელა გაყიდვადი შეთავაზებები, მაღალი მოთხოვნა და წაღების აქტივობა ჯავშნის პროცესის შეცვლის გარეშე."
              : "Rule-based summaries help you spot slow offers, strong demand and pickup activity without changing the reservation flow."}
          </p>
        </div>

        <div className="ui-card rounded-3xl p-4 text-sm font-semibold leading-6 text-cream lg:max-w-sm">
          <p className="font-semibold">
            {isGeorgian ? "AI ავტომატიზაციის გარეშე" : "No AI automation"}
          </p>
          <p className="mt-1">
            {isGeorgian
              ? "რეკომენდაციები შეთავაზებების, შეკვეთებისა და წაღების მარტივ წესებს ეფუძნება."
              : "Recommendations use simple offer, order and pickup rules."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <div>
          <h3 className="text-xl font-semibold text-cream">
            {isGeorgian ? "დღის შეჯამება" : "Today's Summary"}
          </h3>
          <div className="mt-4">
            <KpiCardGrid cards={toKpiCards(dailySummary)} />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-cream">
            {isGeorgian ? "ეს კვირა" : "This Week"}
          </h3>
          <div className="mt-4">
            <KpiCardGrid cards={toKpiCards(weeklySummary)} />
          </div>
        </div>

        <div className="rounded-3xl bg-well p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mint">
                {isGeorgian ? "რეკომენდაციები" : "Recommendations"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-cream">
                {isGeorgian ? "შემდეგი საუკეთესო ნაბიჯები" : "Next best actions"}
              </h3>
            </div>

            <p className="text-sm text-body sm:text-right">
              {isGeorgian
                ? "ეფუძნება ჯავშნების პროცენტს, რაოდენობასა და წაღების დროს."
                : "Based on reservation percentage, quantity and pickup timing."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recommendations.length === 0 && (
              <div className="ui-card rounded-2xl p-4 font-semibold text-body">
                {isGeorgian
                  ? "სასწრაფო რეკომენდაციები ჯერ არ არის. მეტი რჩევისთვის შექმენი ან გაააქტიურე შეთავაზებები."
                  : "No urgent recommendations yet. Create or activate offers to unlock more guidance."}
              </div>
            )}

            {recommendations.map((recommendation) => (
              <article
                key={`${recommendation.title}-${recommendation.text}`}
                className={`rounded-2xl p-4 ${recommendationStyles[recommendation.tone]}`}
              >
                <p className="font-semibold">{recommendation.title}</p>
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
