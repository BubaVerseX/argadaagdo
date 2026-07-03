import { KpiCardGrid, type KpiCard } from "@/components/analytics/KpiCardGrid";
import { MiniBarChart } from "@/components/analytics/MiniBarChart";
import {
  formatAnalyticsMoney,
  type BusinessAnalyticsSummary,
} from "@/lib/analytics";

type BusinessRevenueInsightsProps = {
  analytics: BusinessAnalyticsSummary;
  onExportReservations: () => void;
  onExportCompletedPickups: () => void;
  onExportOfferStatistics: () => void;
};

export function BusinessRevenueInsights({
  analytics,
  onExportReservations,
  onExportCompletedPickups,
  onExportOfferStatistics,
}: BusinessRevenueInsightsProps) {
  const kpiCards: KpiCard[] = [
    {
      title: "Today's Reservations",
      value: analytics.todayReservations,
      helper: "Reservations scheduled for pickup today",
      tone: analytics.todayReservations > 0 ? "green" : "white",
    },
    {
      title: "This Week",
      value: analytics.thisWeekReservations,
      helper: "Reservations created this week",
    },
    {
      title: "This Month",
      value: analytics.thisMonthReservations,
      helper: "Reservations created this month",
    },
    {
      title: "Completed Pickups",
      value: analytics.completedPickups,
      helper: "Orders successfully collected",
      tone: "green",
    },
    {
      title: "Cancelled Orders",
      value: analytics.cancelledOrders,
      helper: "Cancelled, refunded or no-show records",
      tone: analytics.cancelledOrders > 0 ? "yellow" : "white",
    },
    {
      title: "No-show Orders",
      value: analytics.noShowOrders,
      helper: "Reserved orders missed by customers",
      tone: analytics.noShowOrders > 0 ? "red" : "white",
    },
    {
      title: "Estimated Revenue",
      value: formatAnalyticsMoney(analytics.estimatedRevenue),
      helper: "Gross reservation value before future payout settlement",
      tone: "green",
    },
    {
      title: "Estimated Food Saved",
      value: `${analytics.estimatedFoodSavedKg} kg`,
      helper: "Using a simple 0.6 kg estimate per rescued bag",
      tone: "green",
    },
    {
      title: "Average Rating",
      value: analytics.averageRating,
      helper: "Customer rating average from completed pickups",
      tone: analytics.averageRating === "No ratings yet" ? "white" : "yellow",
    },
    {
      title: "Boxes Sold",
      value: analytics.boxesSold,
      helper: "Reserved, completed and no-show boxes",
      tone: "green",
    },
    {
      title: "Boxes Remaining",
      value: analytics.boxesRemaining,
      helper: "Current quantity remaining across offers",
    },
    {
      title: "Business Earnings",
      value: formatAnalyticsMoney(analytics.estimatedBusinessEarnings),
      helper: "Estimated 90% business earnings before payout review",
      tone: "green",
    },
  ];

  const performanceItems = [
    {
      label: "Best selling offer",
      value: analytics.performance.bestSellingOffer,
    },
    {
      label: "Worst selling offer",
      value: analytics.performance.worstSellingOffer,
    },
    {
      label: "Average reservation lead time",
      value: analytics.performance.averageReservationLeadTime,
    },
    {
      label: "Most active pickup hour",
      value: analytics.performance.mostActivePickupHour,
    },
    {
      label: "Most popular weekday",
      value: analytics.performance.mostPopularWeekday,
    },
  ];
  const marketingItems = [
    {
      label: "Most Viewed Offer",
      value: analytics.marketingInsights.mostViewedOffer,
    },
    {
      label: "Highest Conversion",
      value: analytics.marketingInsights.highestConversion,
    },
    {
      label: "Returning Customers",
      value: analytics.marketingInsights.returningCustomers,
    },
    {
      label: "Repeat Reservations",
      value: analytics.marketingInsights.repeatReservations,
    },
    {
      label: "Average Rating Trend",
      value: analytics.marketingInsights.averageRatingTrend,
    },
  ];

  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Revenue and insights
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Business performance snapshot
          </h2>
          <p className="mt-3 max-w-3xl font-semibold leading-7 text-gray-600">
            Estimated revenue uses existing order payment fields. Final business
            payouts are still reviewed manually during the pilot.
          </p>
        </div>

        <div className="rounded-3xl bg-green-50 p-4 text-sm font-semibold leading-6 text-green-900 lg:max-w-sm">
          <p className="font-black">Pilot commission model</p>
          <p className="mt-1">
            Current estimate: 10% platform commission and 90% business
            earnings. Reconcile against payment provider records before payout.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <KpiCardGrid cards={kpiCards} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl bg-[#F7F6EF] p-5">
          <h3 className="text-xl font-black text-gray-950">
            Performance signals
          </h3>
          <div className="mt-4 grid gap-3">
            {performanceItems.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white p-4">
                <p className="text-sm font-black text-green-700">
                  {item.label}
                </p>
                <p className="mt-1 font-black text-gray-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <MiniBarChart
            title="Reservations over time"
            description="Last active reservation dates based on order creation."
            data={analytics.reservationsOverTime}
          />
          <MiniBarChart
            title="Revenue over time"
            description="Estimated business revenue from active paid-status orders."
            data={analytics.revenueOverTime}
            valuePrefix="₾ "
          />
          <MiniBarChart
            title="Offer popularity"
            description="Top offers by reservation count."
            data={analytics.offerPopularity}
          />
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-[#F7F6EF] p-5">
        <h3 className="text-xl font-black text-gray-950">
          Marketing insights
        </h3>
        <p className="mt-2 max-w-3xl font-semibold leading-7 text-gray-600">
          These signals prepare the dashboard for growth campaigns. View and
          conversion tracking still need dedicated events before they become
          exact.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {marketingItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-green-700">
                {item.label}
              </p>
              <p className="mt-2 font-black text-gray-950">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-green-100 bg-green-50 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-black text-green-950">
              CSV exports
            </h3>
            <p className="mt-2 font-semibold leading-7 text-green-900">
              Download lightweight CSV files for reservations, completed
              pickups and offer statistics.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={onExportReservations}
              className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-black text-green-800 ring-1 ring-green-100 transition hover:bg-green-100"
            >
              Reservations CSV
            </button>
            <button
              onClick={onExportCompletedPickups}
              className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-black text-green-800 ring-1 ring-green-100 transition hover:bg-green-100"
            >
              Completed CSV
            </button>
            <button
              onClick={onExportOfferStatistics}
              className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-black text-green-800 ring-1 ring-green-100 transition hover:bg-green-100"
            >
              Offer Stats CSV
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
