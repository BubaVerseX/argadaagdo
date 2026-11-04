"use client";

import { LeafDecor } from "@/components/design/Decor";
import type { TranslationKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

type BusinessDashboardHeroProps = {
  t: (key: TranslationKey) => string;
  businessName: string;
  totalOffers: number;
  activeOffers: number;
  reservedOrders: number;
};

export function BusinessDashboardHero({
  t,
  businessName,
  totalOffers,
  activeOffers,
  reservedOrders,
}: BusinessDashboardHeroProps) {
  const { language } = useLanguage();

  return (
    <div className="theme-forest relative overflow-hidden rounded-[28px] bg-page p-5 sm:p-8 md:p-12">
      <LeafDecor className="-right-10 -top-8 h-56 w-56 text-brand-forest-2 lg:h-80 lg:w-80" />
      <div className="relative">
      <p className="premium-badge px-4 py-2">
        {language === "ka" ? "ბიზნესის მართვის ცენტრი" : "Business control center"}
      </p>

      <h1 className="mt-4 font-serif text-[1.5rem] font-bold leading-[1.25] text-cream sm:text-4xl md:text-5xl">
        {t("businessDashboard.welcome")}, {businessName}
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-body sm:mt-4 sm:text-lg">
        {t("businessDashboard.welcomeText")}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
        <div className="rounded-[18px] bg-brand-forest-2 p-3 sm:rounded-3xl sm:p-5">
          <p className="text-[11px] font-medium text-mint sm:text-sm">
            {t("businessDashboard.myOffers")}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-cream sm:text-4xl">
            {totalOffers}
          </h2>
        </div>

        <div className="rounded-[18px] bg-brand-forest-2 p-3 sm:rounded-3xl sm:p-5">
          <p className="text-[11px] font-medium text-mint sm:text-sm">
            {t("businessProfile.activeOffers")}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-cream sm:text-4xl">
            {activeOffers}
          </h2>
        </div>

        <div className="cat-bakery rounded-[18px] bg-cat p-3 sm:rounded-3xl sm:p-5">
          <p className="text-[11px] font-medium text-mint sm:text-sm">
            {t("orders.reserved")}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-cream sm:text-4xl">
            {reservedOrders}
          </h2>
        </div>
      </div>
      </div>
    </div>
  );
}
