import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n";

type OrdersEmptyStateProps = {
  t: (key: TranslationKey) => string;
};

export function OrdersEmptyState({ t }: OrdersEmptyStateProps) {
  return (
    <div className="premium-card mt-8 rounded-[2rem] p-10 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef1e8] text-2xl font-black text-[#1a1815]">
        O
      </div>

      <p className="mt-5 text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
        {t("orders.emptyTitle")}
      </p>

      <h2 className="mt-2 text-3xl font-black">
        {t("orders.educationTitle")}
      </h2>

      <p className="mx-auto mt-3 max-w-xl font-medium leading-7 text-[#6b6558]">
        {t("orders.educationText")}
      </p>

      <div className="premium-muted-card mx-auto mt-5 max-w-xl rounded-3xl p-4 text-left">
        <p className="font-black text-[#1a1815]">
          {t("orders.ratingEducationTitle")}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6558]">
          {t("orders.ratingEducationText")}
        </p>
      </div>

      <p className="mt-4 text-sm font-bold text-[#6b6558]">
        {t("orders.emptyHint")}
      </p>

      <Link
        href="/offers"
        className="premium-button mt-6 inline-block min-h-12 px-8 py-3 sm:py-4"
      >
        {t("common.browseOffers")}
      </Link>
    </div>
  );
}
