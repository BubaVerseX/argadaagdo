"use client";

import { MiniBarChart } from "@/components/analytics/MiniBarChart";
import {
  formatAnalyticsMoney,
  type BusinessAnalyticsSummary,
} from "@/lib/analytics";
import { useLanguage } from "@/lib/useLanguage";

// Georgian display text for the fixed values lib/analytics.ts produces. The
// analytics data itself stays in English (other code compares against it).
const georgianAnalyticsValues = new Map<string, string>([
  ["Not enough data", "საკმარისი მონაცემები არ არის"],
  ["Under 1 hour before pickup", "წაღებამდე 1 საათზე ნაკლები ხნით ადრე"],
  ["No ratings yet", "შეფასებები ჯერ არ არის"],
  ["Stable", "სტაბილური"],
  ["Improving", "უმჯობესდება"],
  ["Needs attention", "ყურადღებას საჭიროებს"],
  ["Monday", "ორშაბათი"],
  ["Tuesday", "სამშაბათი"],
  ["Wednesday", "ოთხშაბათი"],
  ["Thursday", "ხუთშაბათი"],
  ["Friday", "პარასკევი"],
  ["Saturday", "შაბათი"],
  ["Sunday", "კვირა"],
]);

function localizeAnalyticsValue(value: string | number, isGeorgian: boolean) {
  if (!isGeorgian || typeof value !== "string") return value;

  const exactValue = georgianAnalyticsValues.get(value);
  if (exactValue) return exactValue;

  const leadTimeMatch = value.match(/^(\d+) hours before pickup$/);
  if (leadTimeMatch) return `წაღებამდე ${leadTimeMatch[1]} საათით ადრე`;

  const conversionMatch = value.match(/^(.*) by reservations$/);
  if (conversionMatch) return `${conversionMatch[1]} — ჯავშნების მიხედვით`;

  return value;
}

type BusinessRevenueInsightsProps = {
  analytics: BusinessAnalyticsSummary;
  onExportReservations: () => void;
  onExportCompletedPickups: () => void;
  onExportOfferStatistics: () => void;
};

/** Key numbers first; the rest behind one tap. */
export function BusinessRevenueInsights({
  analytics,
  onExportReservations,
  onExportCompletedPickups,
  onExportOfferStatistics,
}: BusinessRevenueInsightsProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const text = (ka: string, en: string) => (isGeorgian ? ka : en);

  const keyNumbers = [
    { label: text("დღეს", "Today"), value: analytics.todayReservations },
    { label: text("გაცემული", "Collected"), value: analytics.completedPickups },
    { label: text("გაყიდული", "Bags sold"), value: analytics.boxesSold },
    {
      label: text("შენი შემოსავალი", "Your earnings"),
      value: formatAnalyticsMoney(analytics.estimatedBusinessEarnings),
    },
    {
      label: text("შეფასება", "Rating"),
      value: localizeAnalyticsValue(analytics.averageRating, isGeorgian),
    },
    {
      label: text("გადარჩენილი", "Food saved"),
      value: `${analytics.estimatedFoodSavedKg} ${text("კგ", "kg")}`,
    },
  ];

  const detailRows: Array<{ label: string; value: string | number | null }> = [
    { label: text("ეს კვირა", "This week"), value: analytics.thisWeekReservations },
    { label: text("ეს თვე", "This month"), value: analytics.thisMonthReservations },
    { label: text("გაუქმებული", "Cancelled"), value: analytics.cancelledOrders },
    { label: text("არ მოვიდა", "No-shows"), value: analytics.noShowOrders },
    { label: text("დარჩენილი", "Bags left"), value: analytics.boxesRemaining },
    {
      label: text("ჯავშნების ჯამი", "Gross sales"),
      value: formatAnalyticsMoney(analytics.estimatedRevenue),
    },
    { label: text("საუკეთესო", "Best seller"), value: analytics.performance.bestSellingOffer },
    { label: text("ყველაზე სუსტი", "Weakest"), value: analytics.performance.worstSellingOffer },
    {
      label: text("დაჯავშნის დრო", "Booked ahead"),
      value: analytics.performance.averageReservationLeadTime,
    },
    {
      label: text("აქტიური საათი", "Busiest hour"),
      value: analytics.performance.mostActivePickupHour,
    },
    {
      label: text("აქტიური დღე", "Busiest day"),
      value: analytics.performance.mostPopularWeekday,
    },
    // Hidden while views aren't tracked (null).
    { label: text("ყველაზე ნანახი", "Most viewed"), value: analytics.marketingInsights.mostViewedOffer },
    {
      label: text("საუკეთესო კონვერსია", "Best conversion"),
      value: analytics.marketingInsights.highestConversion,
    },
    {
      label: text("დაბრუნებული მომხმარებლები", "Returning customers"),
      value: analytics.marketingInsights.returningCustomers,
    },
    {
      label: text("შეფასების ტენდენცია", "Rating trend"),
      value: analytics.marketingInsights.averageRatingTrend,
    },
  ];
  const noData = text("მონაცემები ჯერ არ არის", "No data yet");

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {keyNumbers.map((item) => (
          <div key={item.label} className="ui-card rounded-2xl p-4">
            <p className="text-sm font-semibold text-body">{item.label}</p>
            <p className="mt-1 break-words text-2xl font-semibold text-cream">{item.value}</p>
          </div>
        ))}
      </div>

      <details className="group rounded-2xl bg-well">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 font-semibold text-cream [&::-webkit-details-marker]:hidden">
          {text("ყველა მაჩვენებელი", "All numbers")}
          <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
        </summary>

        <div className="grid gap-4 px-4 pb-4">
          <dl className="grid gap-1">
            {detailRows
              .filter((row) => row.value !== null)
              .map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-b border-line py-2 text-sm">
                  <dt className="text-body">{row.label}</dt>
                  <dd className="min-w-0 truncate text-right font-semibold text-cream">
                    {localizeAnalyticsValue(row.value as string | number, isGeorgian)}
                  </dd>
                </div>
              ))}
          </dl>

          <MiniBarChart
            title={text("ჯავშნები", "Reservations")}

            data={analytics.reservationsOverTime}
            emptyText={noData}
          />
          <MiniBarChart
            title={text("შემოსავალი", "Revenue")}

            data={analytics.revenueOverTime}
            valuePrefix="₾ "
            emptyText={noData}
          />
          <MiniBarChart
            title={text("პოპულარული", "Popular bags")}

            data={analytics.offerPopularity}
            emptyText={noData}
          />

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={onExportReservations}
              className="premium-button-secondary px-4 py-2.5 text-sm"
            >
              {text("ჯავშნები (CSV)", "Reservations CSV")}
            </button>
            <button
              type="button"
              onClick={onExportCompletedPickups}
              className="premium-button-secondary px-4 py-2.5 text-sm"
            >
              {text("გაცემული (CSV)", "Collected CSV")}
            </button>
            <button
              type="button"
              onClick={onExportOfferStatistics}
              className="premium-button-secondary px-4 py-2.5 text-sm"
            >
              {text("ლანჩ ბოქსები (CSV)", "Bags CSV")}
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
