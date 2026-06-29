import type { TranslationKey } from "@/lib/i18n";

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
  return (
    <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-12">
      <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
        Business control center
      </p>

      <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
        {t("businessDashboard.welcome")}, {businessName}
      </h1>

      <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:mt-4 sm:text-lg">
        {t("businessDashboard.welcomeText")}
      </p>

      <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
          <p className="text-sm font-black text-green-100">
            {t("businessDashboard.myOffers")}
          </p>
          <h2 className="mt-1 text-3xl font-black sm:text-4xl">
            {totalOffers}
          </h2>
        </div>

        <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
          <p className="text-sm font-black text-green-100">
            {t("businessProfile.activeOffers")}
          </p>
          <h2 className="mt-1 text-3xl font-black sm:text-4xl">
            {activeOffers}
          </h2>
        </div>

        <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
          <p className="text-sm font-black text-green-100">
            {t("orders.reserved")}
          </p>
          <h2 className="mt-1 text-3xl font-black sm:text-4xl">
            {reservedOrders}
          </h2>
        </div>
      </div>
    </div>
  );
}
