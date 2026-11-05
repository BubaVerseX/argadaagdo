"use client";

import { ImpactCard } from "@/components/ImpactCard";
import { buildCsv, downloadCsv, formatAnalyticsMoney } from "@/lib/analytics";
import type { Language } from "@/lib/i18n";
import {
  calculateImpact,
  formatKg,
  formatMonthLabel,
  getMonthKey,
  listRecentMonthKeys,
} from "@/lib/impact";
import { getGreenBagLabel } from "@/lib/offerCategories";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import type { Order } from "@/lib/types";
import { useMemo, useState } from "react";

type ImpactReportSectionProps = {
  language: Language;
  businessId: number;
  businessName: string;
  /** Orders of the selected business (all statuses). */
  orders: Order[];
};

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

// Store impact ("saved N boxes ≈ N kg ≈ CO₂") plus the monthly report chains
// ask for: a CSV of completed pickups and a printable PDF page.
export function ImpactReportSection({
  language,
  businessId,
  businessName,
  orders,
}: ImpactReportSectionProps) {
  const isGeorgian = language === "ka";
  const monthKeys = useMemo(() => listRecentMonthKeys(12), []);
  const [monthKey, setMonthKey] = useState(monthKeys[0]);

  const collectedOrders = useMemo(
    () => orders.filter((order) => isCollectedOrderStatus(order.status)),
    [orders]
  );
  const monthOrders = useMemo(
    () =>
      collectedOrders.filter(
        (order) => getMonthKey(order.completed_at || order.created_at) === monthKey
      ),
    [collectedOrders, monthKey]
  );
  const monthImpact = calculateImpact(monthOrders.length);
  const monthEarnings = monthOrders.reduce(
    (total, order) => total + toNumber(order.business_amount),
    0
  );

  function exportMonthCsv() {
    const csv = buildCsv(
      monthOrders.map((order) => ({
        order_id: order.id,
        pickup_date: order.offers?.pickup_date || "",
        completed_at: order.completed_at || "",
        title: order.offers?.title || "",
        box: order.offers ? getGreenBagLabel(order.offers, "en") : "",
        amount_gel: toNumber(order.amount).toFixed(2),
        platform_fee_gel: toNumber(order.platform_fee).toFixed(2),
        business_amount_gel: toNumber(order.business_amount).toFixed(2),
        food_saved_kg: calculateImpact(1).foodKg,
        co2_avoided_kg: calculateImpact(1).co2Kg,
      }))
    );

    downloadCsv(`argadaagdo-${businessName.replace(/\s+/g, "-").toLowerCase()}-${monthKey}.csv`, csv);
  }

  const reportUrl = `/business/report?business=${businessId}&month=${monthKey}`;

  return (
    <div id="business-impact" className="premium-card mt-6 scroll-mt-24 rounded-3xl p-5 sm:mt-8 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
        {isGeorgian ? "გავლენა და ანგარიშები" : "Impact and reports"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
        {isGeorgian ? "რამდენი საკვები გადაარჩინა მაღაზიამ" : "What this store has saved"}
      </h2>

      <ImpactCard
        className="mt-5"
        language={language}
        bags={collectedOrders.length}
        subject="store"
        caption={businessName}
      />

      <div className="mt-6 grid gap-4 rounded-3xl bg-well p-4 sm:p-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-body">
            {isGeorgian ? "თვიური ანგარიში" : "Monthly report"}
            <select
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="premium-input max-w-xs p-3 font-semibold"
            >
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLabel(key, language)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: isGeorgian ? "წაღებული ლანჩ ბოქსი" : "Boxes collected", value: String(monthImpact.bags) },
              { label: isGeorgian ? "საკვები" : "Food saved", value: formatKg(monthImpact.foodKg, language) },
              { label: "CO₂", value: formatKg(monthImpact.co2Kg, language) },
              { label: isGeorgian ? "ბიზნესის შემოსავალი" : "Business earnings", value: formatAnalyticsMoney(monthEarnings) },
            ].map((item) => (
              <div key={item.label} className="ui-card rounded-2xl px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-body">{item.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-cream">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportMonthCsv}
            disabled={monthOrders.length === 0}
            className="premium-button-secondary min-h-11 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeorgian ? "CSV ექსპორტი" : "Export CSV"}
          </button>
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="premium-button min-h-11 px-4 py-2.5 text-sm"
          >
            {isGeorgian ? "PDF ანგარიში" : "PDF report"}
          </a>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-body">
        {isGeorgian
          ? "PDF ანგარიში ახალ ჩანართში იხსნება; გამოიყენე „ბეჭდვა → შენახვა PDF-ად“. შეფასება: 1 ლანჩ ბოქსი ≈ 1 კგ საკვები ≈ 2.7 კგ CO₂."
          : "The PDF report opens in a new tab; use Print → Save as PDF. Estimate: 1 box ≈ 1 kg of food ≈ 2.7 kg CO₂."}
      </p>
    </div>
  );
}
