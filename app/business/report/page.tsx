"use client";

import { LoadingState } from "@/components/LoadingState";
import { getConfirmedProfile } from "@/lib/auth";
import { formatAnalyticsMoney } from "@/lib/analytics";
import { logAppError } from "@/lib/errors";
import {
  calculateImpact,
  formatKg,
  formatMonthLabel,
  getMonthKey,
} from "@/lib/impact";
import { getGreenBagLabel } from "@/lib/offerCategories";
import { formatDisplayDateTime } from "@/lib/offerLifecycle";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Business, Order } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

// Printable monthly report for one business: completed Green Bag pickups,
// earnings and the food / CO₂ estimate. Opened from the dashboard's "PDF
// report" button; the browser's Print → Save as PDF produces the file.
function BusinessReport() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const businessId = Number(searchParams.get("business"));
  const monthKey = searchParams.get("month") || getMonthKey(new Date().toISOString()) || "";
  const [business, setBusiness] = useState<Business | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const profileResult = await getConfirmedProfile(3);
      if (!active) return;

      if (profileResult.status === "signed_out") {
        router.replace(`/login?redirect=${encodeURIComponent(`/business/report?business=${businessId}&month=${monthKey}`)}`);
        return;
      }

      if (!Number.isFinite(businessId) || !/^\d{4}-\d{2}$/.test(monthKey)) {
        setError(isGeorgian ? "ანგარიშის ბმული არასწორია." : "The report link is not valid.");
        setLoading(false);
        return;
      }

      const { data: businessRow, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .maybeSingle();

      if (businessError || !businessRow) {
        if (businessError) {
          logAppError("Report business load failed", businessError, {
            operation: "load_report_business",
            businessId,
          });
        }
        setError(isGeorgian ? "ბიზნესი ვერ მოიძებნა." : "Business not found.");
        setLoading(false);
        return;
      }

      const { data: offerRows } = await supabase
        .from("offers")
        .select("id")
        .eq("business_id", businessId)
        .limit(2000);
      const offerIds = ((offerRows || []) as { id: number }[]).map((row) => row.id);

      let monthOrders: Order[] = [];
      if (offerIds.length > 0) {
        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select(`${ORDER_COLUMNS}, offers(title, price, pickup_date, pickup_start, pickup_end, category, size)`)
          .in("offer_id", offerIds)
          .in("status", ["completed", "collected"])
          .order("completed_at", { ascending: true })
          .limit(5000);

        if (orderError) {
          logAppError("Report orders load failed", orderError, {
            operation: "load_report_orders",
            businessId,
          });
        }

        monthOrders = ((orderRows || []) as unknown as Order[]).filter(
          (order) =>
            isCollectedOrderStatus(order.status) &&
            getMonthKey(order.completed_at || order.created_at) === monthKey
        );
      }

      if (!active) return;
      setBusiness(businessRow as Business);
      setOrders(monthOrders);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [businessId, monthKey, router, isGeorgian]);

  const impact = calculateImpact(orders.length);
  const gross = orders.reduce((total, order) => total + toNumber(order.amount), 0);
  const fees = orders.reduce((total, order) => total + toNumber(order.platform_fee), 0);
  const earnings = orders.reduce((total, order) => total + toNumber(order.business_amount), 0);

  return (
    <main className="report-root min-h-screen bg-page px-4 py-8 text-cream sm:px-8">
      <style>{`
        @media print {
          body { background: #fff !important; }
          .report-root { background: #fff !important; color: #111 !important; padding: 0 !important; }
          .report-root * { color: #111 !important; background: transparent !important; border-color: #ccc !important; box-shadow: none !important; }
          .report-root .print-hidden { display: none !important; }
          .report-root table { page-break-inside: auto; }
          .report-root tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl">
        {loading && (
          <LoadingState
            title={{ en: "Preparing report...", ka: "ანგარიში მზადდება..." }}
            description={{ en: "Loading completed pickups.", ka: "იტვირთება დასრულებული წაღებები." }}
          />
        )}

        {!loading && error && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 font-semibold text-danger">{error}</p>
        )}

        {!loading && business && (
          <>
            <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
              <a href="/business/dashboard" className="premium-button-secondary min-h-10 px-4 py-2 text-sm">
                ← {isGeorgian ? "პანელი" : "Dashboard"}
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="premium-button min-h-10 px-5 py-2 text-sm"
              >
                {isGeorgian ? "ბეჭდვა / შენახვა PDF-ად" : "Print / Save as PDF"}
              </button>
            </div>

            <header className="border-b border-line pb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-mint">
                {isGeorgian ? "არ გადააგდო · თვიური ანგარიში" : "ArGadaagdo · Monthly report"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{business.name}</h1>
              <p className="mt-1 text-body">
                {formatMonthLabel(monthKey, language)} · {business.address}
              </p>
            </header>

            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: isGeorgian ? "წაღებული ჩანთა" : "Bags collected", value: String(impact.bags) },
                { label: isGeorgian ? "გადარჩენილი საკვები" : "Food saved", value: formatKg(impact.foodKg, language) },
                { label: isGeorgian ? "თავიდან აცილებული CO₂" : "CO₂ avoided", value: formatKg(impact.co2Kg, language) },
                { label: isGeorgian ? "ბიზნესის შემოსავალი" : "Business earnings", value: formatAnalyticsMoney(earnings) },
              ].map((item) => (
                <div key={item.label} className="ui-card rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-wide text-body">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-2 text-sm text-body sm:grid-cols-3">
              <p>{isGeorgian ? "ჯამური გაყიდვები" : "Gross sales"}: <span className="font-semibold text-cream">{formatAnalyticsMoney(gross)}</span></p>
              <p>{isGeorgian ? "პლატფორმის საკომისიო" : "Platform commission"}: <span className="font-semibold text-cream">{formatAnalyticsMoney(fees)}</span></p>
              <p>{isGeorgian ? "საკომისიოს განაკვეთი" : "Commission rate"}: <span className="font-semibold text-cream">{Math.round(toNumber(business.platform_fee_rate ?? 0.3) * 100)}%</span></p>
            </section>

            <section className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-body">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">{isGeorgian ? "წაღება" : "Collected"}</th>
                    <th className="py-2 pr-3">{isGeorgian ? "ჩანთა" : "Bag"}</th>
                    <th className="py-2 pr-3 text-right">{isGeorgian ? "თანხა" : "Amount"}</th>
                    <th className="py-2 pr-3 text-right">{isGeorgian ? "საკომისიო" : "Fee"}</th>
                    <th className="py-2 text-right">{isGeorgian ? "ბიზნესს" : "To business"}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-body">
                        {isGeorgian ? "ამ თვეში წაღებული ჩანთები არ არის." : "No collected bags in this month."}
                      </td>
                    </tr>
                  )}
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-line/60">
                      <td className="py-2 pr-3 tabular-nums">{order.id}</td>
                      <td className="py-2 pr-3">{formatDisplayDateTime(order.completed_at || order.created_at, language)}</td>
                      <td className="py-2 pr-3">
                        {order.offers?.title}
                        {order.offers ? <span className="text-body"> · {getGreenBagLabel(order.offers, language)}</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatAnalyticsMoney(toNumber(order.amount))}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatAnalyticsMoney(toNumber(order.platform_fee))}</td>
                      <td className="py-2 text-right tabular-nums">{formatAnalyticsMoney(toNumber(order.business_amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <footer className="mt-8 text-xs leading-5 text-body">
              {isGeorgian
                ? "შეფასება: 1 მწვანე ჩანთა ≈ 1 კგ საკვები ≈ 2.7 კგ CO₂. თანხები შეკვეთებზე ჩაწერილი გადახდის მონაცემებიდანაა; ანაზღაურებამდე შეადარე ბანკის ამონაწერს."
                : "Estimate: 1 Green Bag ≈ 1 kg of food ≈ 2.7 kg CO₂. Amounts come from the payment fields recorded on each order; reconcile with the bank statement before payout."}
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

export default function BusinessReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-page px-4 py-8">
          <LoadingState title={{ en: "Preparing report...", ka: "ანგარიში მზადდება..." }} />
        </main>
      }
    >
      <BusinessReport />
    </Suspense>
  );
}
