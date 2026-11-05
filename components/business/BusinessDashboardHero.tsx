"use client";

import { LeafDecor } from "@/components/design/Decor";
import type { TranslationKey } from "@/lib/i18n";

type BusinessDashboardHeroProps = {
  t: (key: TranslationKey) => string;
  businessName: string;
};

export function BusinessDashboardHero({
  t,
  businessName,
}: BusinessDashboardHeroProps) {
  return (
    <div className="theme-forest relative overflow-hidden rounded-[28px] bg-page p-5 sm:p-8 md:p-12">
      <LeafDecor className="-right-10 -top-8 h-56 w-56 text-brand-forest-2 lg:h-80 lg:w-80" />
      <div className="relative">
      <h1 className="font-serif text-[1.5rem] font-bold leading-[1.25] text-cream sm:text-4xl md:text-5xl">
        {t("businessDashboard.welcome")}, {businessName}
      </h1>

      </div>
    </div>
  );
}
