import StatCard from "@/components/StatCard";
import type { Profile } from "@/lib/types";

type OrdersHeaderProps = {
  t: (key: TranslationKey) => string;
  confirmedCount: number;
  collectedCount: number;
  cancelledCount: number;
  profile: Profile | null;
  reliabilityStatus: string;
  reliabilityTone: "green" | "yellow" | "red";
};

export function OrdersHeader({
  t,
  confirmedCount,
  collectedCount,
  cancelledCount,
  profile,
  reliabilityStatus,
  reliabilityTone,
}: OrdersHeaderProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6 md:p-10">
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        {t("orders.reserved")}
      </p>

      <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
        {t("orders.title")}
      </h1>

      <p className="mt-4 max-w-2xl text-base font-semibold text-gray-700 md:text-lg">
        {t("orders.subtitle")}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-5">
        <StatCard title={t("orders.reserved")} value={confirmedCount} tone="yellow" />
        <StatCard title={t("orders.collected")} value={collectedCount} tone="green" />
        <StatCard title={t("orders.cancelled")} value={cancelledCount} tone="red" />
        <StatCard
          title={t("orders.reliability")}
          value={profile?.reliability_score ?? t("common.unavailable")}
          tone={reliabilityTone}
        />
        <StatCard
          title={t("orders.status")}
          value={reliabilityStatus}
          tone={reliabilityTone}
        />
      </div>
    </div>
  );
}
