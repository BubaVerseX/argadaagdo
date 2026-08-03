import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n";
import { ReceiptIcon } from "@/components/icons";

type OrdersEmptyStateProps = {
  t: (key: TranslationKey) => string;
};

export function OrdersEmptyState({ t }: OrdersEmptyStateProps) {
  return (
    <div className="premium-card mt-8 rounded-[2rem] p-10 text-center">
      <div className="soft-pressed mx-auto flex h-20 w-20 items-center justify-center rounded-full">
        <ReceiptIcon className="h-9 w-9 text-[#a67c52]" strokeWidth={1.6} />
      </div>

      <p className="mt-5 text-sm font-black uppercase tracking-widest text-[#a67c52]">
        {t("orders.emptyTitle")}
      </p>

      <h2 className="mt-2 text-3xl font-black text-[#2e2a22]">
        {t("orders.educationTitle")}
      </h2>

      <p className="mx-auto mt-3 max-w-xl font-medium leading-7 text-[#6b6152]">
        {t("orders.educationText")}
      </p>

      <div className="premium-muted-card mx-auto mt-5 max-w-xl rounded-3xl p-4 text-left">
        <p className="font-black text-[#2e2a22]">
          {t("orders.ratingEducationTitle")}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6152]">
          {t("orders.ratingEducationText")}
        </p>
      </div>

      <p className="mt-4 text-sm font-bold text-[#6b6152]">
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
