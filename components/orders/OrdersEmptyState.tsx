import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n";

type OrdersEmptyStateProps = {
  t: (key: TranslationKey) => string;
  href?: string;
};

export function OrdersEmptyState({ t, href = "/discover" }: OrdersEmptyStateProps) {
  return (
    <div className="rounded-[24px] bg-card p-8 text-center">
      <h2 className="text-lg font-semibold text-cream">
        {t("native.orders.emptyTitle")}
      </h2>
      <Link
        href={href}
        className="premium-button mt-5 w-full rounded-2xl px-6 py-3 font-bold"
      >
        {t("native.orders.emptyAction")}
      </Link>
    </div>
  );
}
