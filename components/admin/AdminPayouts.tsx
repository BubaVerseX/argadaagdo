"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCollapsible } from "@/components/admin/AdminSections";
import { CheckIcon } from "@/components/icons";
import { formatAnalyticsMoney } from "@/lib/analytics";
import type { Language } from "@/lib/i18n";
import { formatDisplayDateTime } from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";

// Weekly payouts (20261109120000_any_bank_weekly_payouts.sql). Payments that
// TBC did not split (another bank, or split not active yet) come to us in
// full; every Monday the admin transfers each business its share from the TBC
// app and taps "Paid". The amount is always worked out by the database.

type DuePayout = {
  business_id: number;
  business_name: string;
  legal_name: string | null;
  iban: string | null;
  is_tbc: boolean;
  payment_ids: number[];
  order_count: number;
  amount: number;
  first_order_at: string;
  last_order_at: string;
};

type PastPayout = {
  id: number;
  business_id: number | null;
  business_name: string | null;
  legal_name: string | null;
  iban: string;
  amount: number;
  item_count: number;
  paid_at: string;
};

export function AdminPayouts({ language }: { language: Language }) {
  const text = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [due, setDue] = useState<DuePayout[]>([]);
  const [past, setPast] = useState<PastPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [dueResult, pastResult] = await Promise.all([
      supabase.rpc("admin_list_due_payouts"),
      supabase.rpc("admin_list_manual_payouts", { p_limit: 10 }),
    ]);
    if (dueResult.error || pastResult.error) {
      setError(
        text("გადასარიცხების ჩატვირთვა ვერ მოხერხდა.", "Payouts could not be loaded.")
      );
    } else {
      setError(null);
      setDue((dueResult.data || []) as DuePayout[]);
      setPast((pastResult.data || []) as PastPayout[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    // Loading state is set by load() itself after the request returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function markPaid(row: DuePayout) {
    setSavingId(row.business_id);
    const { error: rpcError } = await supabase.rpc("admin_mark_payout_paid", {
      p_business_id: row.business_id,
      p_payment_ids: row.payment_ids,
    });
    setSavingId(null);
    setConfirmingId(null);
    if (rpcError) {
      setError(
        rpcError.message.includes("changed")
          ? text("სია შეიცვალა. განაახლე გვერდი.", "The list changed. Reload the page.")
          : rpcError.message.includes("IBAN")
          ? text("ამ ბიზნესს IBAN არ აქვს.", "This business has no IBAN on file.")
          : text("ვერ შევინახეთ. სცადე ხელახლა.", "Couldn't save. Please try again.")
      );
      return;
    }
    await load();
  }

  async function copyIban(row: DuePayout) {
    if (!row.iban) return;
    try {
      await navigator.clipboard?.writeText(row.iban);
      setCopiedId(row.business_id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // The IBAN is on screen; copying is only a shortcut.
    }
  }

  const total = due.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <AdminCollapsible
      title={text("გადასარიცხი ბიზნესებს (ორშაბათს)", "Payouts to businesses (Mondays)")}
      count={due.length}
    >
      <p className="text-sm leading-6 text-body">
        {text(
          "ეს თანხები სრულად ჩვენს ანგარიშზე შემოვიდა (სხვა ბანკი, ან TBC-ის split ჯერ არ არის ჩართული). ყოველ ორშაბათს TBC-ის აპიდან გადაურიცხე თითოეულ ბიზნესს მისი წილი ამ IBAN-ზე და დააჭირე „გადავრიცხე“.",
          "These payments came to us in full (another bank, or TBC's split not active yet). Every Monday, send each business its share from your TBC app to this IBAN, then tap \"Paid\"."
        )}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-body">{text("იტვირთება…", "Loading…")}</p>
      ) : due.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-cream">
          <CheckIcon className="h-4 w-4 text-mint" strokeWidth={2} />
          {text("გადასარიცხი არაფერია", "Nothing to pay out")}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold text-cream">
            {text("სულ", "Total")}: {formatAnalyticsMoney(total)}
          </p>
          <ul className="mt-3 grid gap-3">
            {due.map((row) => (
              <li key={row.business_id} className="ui-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-cream">{row.business_name}</p>
                    {row.legal_name && (
                      <p className="text-sm text-body">{row.legal_name}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {row.order_count} {text("შეკვეთა", row.order_count === 1 ? "order" : "orders")} ·{" "}
                      {formatDisplayDateTime(row.first_order_at, language)} –{" "}
                      {formatDisplayDateTime(row.last_order_at, language)}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-cream">
                    {formatAnalyticsMoney(Number(row.amount))}
                  </p>
                </div>

                {row.iban ? (
                  <button
                    type="button"
                    onClick={() => void copyIban(row)}
                    className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-well px-3 py-2 text-left font-mono text-sm text-cream"
                  >
                    <span className="break-all">{row.iban}</span>
                    <span className="shrink-0 font-sans text-xs font-semibold text-mint">
                      {copiedId === row.business_id
                        ? text("დაკოპირდა ✓", "Copied ✓")
                        : row.is_tbc
                        ? text("TBC · კოპირება", "TBC · Copy")
                        : text("კოპირება", "Copy")}
                    </span>
                  </button>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-danger">
                    {text("IBAN არ არის მითითებული.", "No IBAN on file.")}
                  </p>
                )}

                {confirmingId === row.business_id ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void markPaid(row)}
                      disabled={savingId === row.business_id}
                      className="premium-button min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {text(
                        `დიახ, გადავრიცხე ${formatAnalyticsMoney(Number(row.amount))}`,
                        `Yes, I sent ${formatAnalyticsMoney(Number(row.amount))}`
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="premium-button-secondary min-h-11 px-4 py-2 text-sm"
                    >
                      {text("გაუქმება", "Cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(row.business_id)}
                    disabled={!row.iban}
                    className="premium-button-secondary mt-3 min-h-11 w-full px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {text("გადავრიცხე", "Paid")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && (
        <>
          <p className="mt-6 text-sm font-semibold text-cream">
            {text("ბოლო გადარიცხვები", "Recent transfers")}
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-body">
            {past.map((payout) => (
              <li key={payout.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {formatDisplayDateTime(payout.paid_at, language)} ·{" "}
                  {payout.business_name || payout.legal_name || payout.iban}
                </span>
                <span className="shrink-0 font-semibold text-cream">
                  {formatAnalyticsMoney(Number(payout.amount))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminCollapsible>
  );
}
