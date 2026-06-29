import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n";

type OrdersEmptyStateProps = {
  t: (key: TranslationKey) => string;
};

export function OrdersEmptyState({ t }: OrdersEmptyStateProps) {
  return (
    <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
        🥡
      </div>

      <p className="mt-5 text-sm font-black uppercase tracking-widest text-green-700">
        {t("orders.emptyTitle")}
      </p>

      <h2 className="mt-2 text-3xl font-black">
        {t("orders.educationTitle")}
      </h2>

      <p className="mx-auto mt-3 max-w-xl font-medium leading-7 text-gray-600">
        {t("orders.educationText")}
      </p>

      <div className="mx-auto mt-5 max-w-xl rounded-3xl bg-green-50 p-4 text-left">
        <p className="font-black text-green-800">
          {t("orders.ratingEducationTitle")}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-green-900">
          {t("orders.ratingEducationText")}
        </p>
      </div>

      <p className="mt-4 text-sm font-bold text-gray-500">
        {t("orders.emptyHint")}
      </p>

      <Link
        href="/offers"
        className="mt-6 inline-block min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white sm:py-4"
      >
        {t("common.browseOffers")}
      </Link>
    </div>
  );
}
