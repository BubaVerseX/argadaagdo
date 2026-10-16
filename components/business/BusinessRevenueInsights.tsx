"use client";

import { KpiCardGrid, type KpiCard } from "@/components/analytics/KpiCardGrid";
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
  ["Under 1 hour before pickup", "წაღებამდე 1 საათზე ნაკლებით ადრე"],
  ["No ratings yet", "შეფასებები ჯერ არ არის"],
  ["View tracking not connected yet", "ნახვების აღრიცხვა ჯერ არ არის ჩართული"],
  [
    "Conversion tracking not connected yet",
    "კონვერსიის აღრიცხვა ჯერ არ არის ჩართული",
  ],
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

export function BusinessRevenueInsights({
  analytics,
  onExportReservations,
  onExportCompletedPickups,
  onExportOfferStatistics,
}: BusinessRevenueInsightsProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const kpiCards: KpiCard[] = [
    {
      title: isGeorgian ? "დღევანდელი ჯავშნები" : "Today's Reservations",
      value: analytics.todayReservations,
      helper: isGeorgian
        ? "დღეს წასაღებად დაგეგმილი ჯავშნები"
        : "Reservations scheduled for pickup today",
      tone: analytics.todayReservations > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "ეს კვირა" : "This Week",
      value: analytics.thisWeekReservations,
      helper: isGeorgian
        ? "ამ კვირაში გაკეთებული ჯავშნები"
        : "Reservations created this week",
    },
    {
      title: isGeorgian ? "ეს თვე" : "This Month",
      value: analytics.thisMonthReservations,
      helper: isGeorgian
        ? "ამ თვეში გაკეთებული ჯავშნები"
        : "Reservations created this month",
    },
    {
      title: isGeorgian ? "დასრულებული წაღებები" : "Completed Pickups",
      value: analytics.completedPickups,
      helper: isGeorgian
        ? "წარმატებით წაღებული შეკვეთები"
        : "Orders successfully collected",
      tone: "green",
    },
    {
      title: isGeorgian ? "გაუქმებული შეკვეთები" : "Cancelled Orders",
      value: analytics.cancelledOrders,
      helper: isGeorgian
        ? "გაუქმებული ან დაბრუნებული ჩანაწერები"
        : "Cancelled or refunded records",
      tone: analytics.cancelledOrders > 0 ? "yellow" : "white",
    },
    {
      title: isGeorgian ? "გამოუცხადებელი შეკვეთები" : "No-show Orders",
      value: analytics.noShowOrders,
      helper: isGeorgian
        ? "დაჯავშნილი შეკვეთები, რომლებიც მომხმარებლებმა არ წაიღეს"
        : "Reserved orders missed by customers",
      tone: analytics.noShowOrders > 0 ? "red" : "white",
    },
    {
      title: isGeorgian ? "სავარაუდო შემოსავალი" : "Estimated Revenue",
      value: formatAnalyticsMoney(analytics.estimatedRevenue),
      helper: isGeorgian
        ? "ჯავშნების ჯამური ღირებულება ანაზღაურების დაანგარიშებამდე"
        : "Gross reservation value before future payout settlement",
      tone: "green",
    },
    {
      title: isGeorgian ? "გადარჩენილი საკვები" : "Estimated Food Saved",
      value: `${analytics.estimatedFoodSavedKg} ${isGeorgian ? "კგ" : "kg"}`,
      helper: isGeorgian
        ? "მარტივი შეფასებით, 0.6 კგ თითო გადარჩენილ ყუთზე"
        : "Using a simple 0.6 kg estimate per rescued bag",
      tone: "green",
    },
    {
      title: isGeorgian ? "საშუალო შეფასება" : "Average Rating",
      value: localizeAnalyticsValue(analytics.averageRating, isGeorgian),
      helper: isGeorgian
        ? "მომხმარებლების საშუალო შეფასება დასრულებული წაღებებიდან"
        : "Customer rating average from completed pickups",
      tone: analytics.averageRating === "No ratings yet" ? "white" : "yellow",
    },
    {
      title: isGeorgian ? "გაყიდული ყუთები" : "Boxes Sold",
      value: analytics.boxesSold,
      helper: isGeorgian
        ? "დაჯავშნილი, დასრულებული და გამოუცხადებელი ყუთები"
        : "Reserved, completed and no-show boxes",
      tone: "green",
    },
    {
      title: isGeorgian ? "დარჩენილი ყუთები" : "Boxes Remaining",
      value: analytics.boxesRemaining,
      helper: isGeorgian
        ? "შეთავაზებებში ამჟამად დარჩენილი რაოდენობა"
        : "Current quantity remaining across offers",
    },
    {
      title: isGeorgian ? "ბიზნესის შემოსავალი" : "Business Earnings",
      value: formatAnalyticsMoney(analytics.estimatedBusinessEarnings),
      helper: isGeorgian
        ? "ბიზნესის სავარაუდო 90%-იანი წილი ანაზღაურების გადამოწმებამდე"
        : "Estimated 90% business earnings before payout review",
      tone: "green",
    },
  ];

  const performanceItems = [
    {
      label: isGeorgian
        ? "ყველაზე გაყიდვადი შეთავაზება"
        : "Best selling offer",
      value: analytics.performance.bestSellingOffer,
    },
    {
      label: isGeorgian
        ? "ყველაზე ნაკლებად გაყიდვადი შეთავაზება"
        : "Worst selling offer",
      value: analytics.performance.worstSellingOffer,
    },
    {
      label: isGeorgian
        ? "საშუალოდ რამდენით ადრე ჯავშნიან"
        : "Average reservation lead time",
      value: analytics.performance.averageReservationLeadTime,
    },
    {
      label: isGeorgian
        ? "წაღების ყველაზე აქტიური საათი"
        : "Most active pickup hour",
      value: analytics.performance.mostActivePickupHour,
    },
    {
      label: isGeorgian
        ? "კვირის ყველაზე პოპულარული დღე"
        : "Most popular weekday",
      value: analytics.performance.mostPopularWeekday,
    },
  ];
  const marketingItems = [
    {
      label: isGeorgian ? "ყველაზე ნანახი შეთავაზება" : "Most Viewed Offer",
      value: analytics.marketingInsights.mostViewedOffer,
    },
    {
      label: isGeorgian ? "ყველაზე მაღალი კონვერსია" : "Highest Conversion",
      value: analytics.marketingInsights.highestConversion,
    },
    {
      label: isGeorgian ? "დაბრუნებული მომხმარებლები" : "Returning Customers",
      value: analytics.marketingInsights.returningCustomers,
    },
    {
      label: isGeorgian ? "განმეორებითი ჯავშნები" : "Repeat Reservations",
      value: analytics.marketingInsights.repeatReservations,
    },
    {
      label: isGeorgian
        ? "საშუალო შეფასების ტენდენცია"
        : "Average Rating Trend",
      value: analytics.marketingInsights.averageRatingTrend,
    },
  ];

  return (
    <section className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            {isGeorgian ? "შემოსავალი და ანალიტიკა" : "Revenue and insights"}
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {isGeorgian
              ? "ბიზნესის შედეგების მიმოხილვა"
              : "Business performance snapshot"}
          </h2>
          <p className="mt-3 max-w-3xl font-semibold leading-7 text-[#6b6152]">
            {isGeorgian
              ? "სავარაუდო შემოსავალი შეკვეთების გადახდის არსებულ მონაცემებს ეფუძნება. პილოტის პერიოდში ბიზნესის საბოლოო ანაზღაურება ჯერ კიდევ ხელით მოწმდება."
              : "Estimated revenue uses existing order payment fields. Final business payouts are still reviewed manually during the pilot."}
          </p>
        </div>

        <div className="soft-raised rounded-3xl p-4 text-sm font-semibold leading-6 text-[#2e2a22] lg:max-w-sm">
          <p className="font-black">
            {isGeorgian ? "პილოტის საკომისიოს მოდელი" : "Pilot commission model"}
          </p>
          <p className="mt-1">
            {isGeorgian
              ? "მიმდინარე შეფასება: 10% პლატფორმის საკომისიო და 90% ბიზნესის შემოსავალი. ანაზღაურებამდე შეადარე გადახდის პროვაიდერის ჩანაწერებს."
              : "Current estimate: 10% platform commission and 90% business earnings. Reconcile against payment provider records before payout."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <KpiCardGrid cards={kpiCards} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl bg-[#f4efe4] p-5">
          <h3 className="text-xl font-black text-[#2e2a22]">
            {isGeorgian ? "შედეგების სიგნალები" : "Performance signals"}
          </h3>
          <div className="mt-4 grid gap-3">
            {performanceItems.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/70 p-4">
                <p className="text-sm font-black text-[#a67c52]">
                  {item.label}
                </p>
                <p className="mt-1 font-black text-[#2e2a22]">
                  {localizeAnalyticsValue(item.value, isGeorgian)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <MiniBarChart
            title={
              isGeorgian ? "ჯავშნები დროის მიხედვით" : "Reservations over time"
            }
            description={
              isGeorgian
                ? "ბოლო აქტიური ჯავშნების თარიღები შეკვეთის შექმნის მიხედვით."
                : "Last active reservation dates based on order creation."
            }
            data={analytics.reservationsOverTime}
            emptyText={isGeorgian ? "ჯერ საკმარისი მონაცემები არ არის." : undefined}
          />
          <MiniBarChart
            title={isGeorgian ? "შემოსავალი დროის მიხედვით" : "Revenue over time"}
            description={
              isGeorgian
                ? "ბიზნესის სავარაუდო შემოსავალი აქტიური, გადახდილი სტატუსის შეკვეთებიდან."
                : "Estimated business revenue from active paid-status orders."
            }
            data={analytics.revenueOverTime}
            valuePrefix="₾ "
            emptyText={isGeorgian ? "ჯერ საკმარისი მონაცემები არ არის." : undefined}
          />
          <MiniBarChart
            title={isGeorgian ? "შეთავაზებების პოპულარობა" : "Offer popularity"}
            description={
              isGeorgian
                ? "საუკეთესო შეთავაზებები ჯავშნების რაოდენობის მიხედვით."
                : "Top offers by reservation count."
            }
            data={analytics.offerPopularity}
            emptyText={isGeorgian ? "ჯერ საკმარისი მონაცემები არ არის." : undefined}
          />
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-[#f4efe4] p-5">
        <h3 className="text-xl font-black text-[#2e2a22]">
          {isGeorgian ? "მარკეტინგული ანალიტიკა" : "Marketing insights"}
        </h3>
        <p className="mt-2 max-w-3xl font-semibold leading-7 text-[#6b6152]">
          {isGeorgian
            ? "ეს სიგნალები პანელს ზრდის კამპანიებისთვის ამზადებს. ნახვებისა და კონვერსიის ზუსტი აღრიცხვისთვის ჯერ კიდევ ცალკე მოვლენებია საჭირო."
            : "These signals prepare the dashboard for growth campaigns. View and conversion tracking still need dedicated events before they become exact."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {marketingItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/70 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#a67c52]">
                {item.label}
              </p>
              <p className="mt-2 font-black text-[#2e2a22]">
                {localizeAnalyticsValue(item.value, isGeorgian)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="soft-raised mt-6 rounded-3xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-black text-[#2e2a22]">
              {isGeorgian ? "CSV ექსპორტი" : "CSV exports"}
            </h3>
            <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
              {isGeorgian
                ? "ჩამოტვირთე მსუბუქი CSV ფაილები ჯავშნების, დასრულებული წაღებებისა და შეთავაზებების სტატისტიკისთვის."
                : "Download lightweight CSV files for reservations, completed pickups and offer statistics."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={onExportReservations}
              className="premium-button-secondary px-4 py-2.5 text-sm"
            >
              {isGeorgian ? "ჯავშნები (CSV)" : "Reservations CSV"}
            </button>
            <button
              onClick={onExportCompletedPickups}
              className="premium-button-secondary px-4 py-2.5 text-sm"
            >
              {isGeorgian ? "დასრულებული (CSV)" : "Completed CSV"}
            </button>
            <button
              onClick={onExportOfferStatistics}
              className="premium-button-secondary px-4 py-2.5 text-sm"
            >
              {isGeorgian ? "შეთავაზებების სტატისტიკა (CSV)" : "Offer Stats CSV"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
