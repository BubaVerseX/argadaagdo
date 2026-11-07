"use client";

import Link from "next/link";
import type { Language, TranslationKey } from "@/lib/i18n";
import { getTbilisiDateKey } from "@/lib/offerLifecycle";
import { getCancellationDeadline, isCancellationOpen } from "@/lib/orders";
import { useMinuteTick } from "@/lib/useMinuteTick";

type CheckoutRulesProps = {
  offer: { pickup_date?: string | null; pickup_start?: string | null };
  language: Language;
  t: (key: TranslationKey) => string;
  free: boolean;
  /** Text colour of the small line (differs between the web and app bars). */
  className?: string;
};

function formatDeadline(deadline: Date, t: CheckoutRulesProps["t"], language: Language) {
  const time = deadline.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tbilisi",
  });
  const day = getTbilisiDateKey(deadline);
  const today = getTbilisiDateKey();
  if (day === today) return time;
  const tomorrow = getTbilisiDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (day === tomorrow) return `${t("native.checkout.tomorrow")} ${time}`;
  const date = deadline.toLocaleDateString(language === "ka" ? "ka-GE" : "en-GB", {
    day: "numeric",
    month: "numeric",
    timeZone: "Asia/Tbilisi",
  });
  return `${date} ${time}`;
}

/**
 * The rules a customer must see before paying: payment note, until when the
 * box can be cancelled (2 h before pickup starts) and that a missed pickup is
 * not refunded. A box bought later than the deadline gets a visible warning.
 */
export function CheckoutRules({ offer, language, t, free, className = "text-body" }: CheckoutRulesProps) {
  useMinuteTick();
  const deadline = getCancellationDeadline(offer);
  const canCancel = isCancellationOpen(deadline);

  return (
    <>
      {!canCancel && (
        <p
          role="note"
          className="mt-2 rounded-2xl bg-warning-soft px-3 py-2 text-center text-[13px] font-semibold leading-snug text-warning"
        >
          {t("native.checkout.noCancel")}
        </p>
      )}
      <p className={`mt-2 text-center text-[11px] leading-snug ${className}`}>
        {t(free ? "native.checkout.freeNote" : "native.checkout.payNote")}
        {canCancel && deadline && (
          <>
            {" · "}
            {t("native.checkout.cancelUntil").replace("{time}", formatDeadline(deadline, t, language))}
          </>
        )}
        {" · "}
        <Link href="/refund-policy" prefetch={false} className="underline underline-offset-2">
          {t("native.checkout.missedNote")}
        </Link>
      </p>
    </>
  );
}
