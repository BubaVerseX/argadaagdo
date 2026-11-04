import StatCard from "@/components/StatCard";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

// Display labels for profiles.reliability_status values. The raw value is
// shown in English (unchanged) and for any unknown value.
const georgianReliabilityLabels = new Map<string, string>([
  ["excellent", "შესანიშნავი"],
  ["good", "კარგი"],
  ["warning", "გაფრთხილება"],
  ["restricted", "შეზღუდული"],
]);

/** Screen title. The pickup code comes right after it, so the stats are separate. */
export function OrdersHeader({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
        {t("orders.reserved")}
      </p>

      <h1 className="mt-2 font-serif text-[1.625rem] font-bold text-cream sm:text-4xl md:text-5xl">
        {t("orders.title")}
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-body md:text-base">
        {t("orders.subtitle")}
      </p>
    </div>
  );
}

type OrdersStatsProps = {
  t: (key: TranslationKey) => string;
  language?: Language;
  confirmedCount: number;
  collectedCount: number;
  cancelledCount: number;
  profile: Profile | null;
  reliabilityStatus: string;
  reliabilityTone: "green" | "yellow" | "red";
};

export function OrdersStats({
  t,
  language = "en",
  confirmedCount,
  collectedCount,
  cancelledCount,
  profile,
  reliabilityStatus,
  reliabilityTone,
}: OrdersStatsProps) {
  const reliabilityStatusLabel =
    language === "ka"
      ? georgianReliabilityLabels.get(reliabilityStatus) ?? reliabilityStatus
      : reliabilityStatus;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-5">
        <StatCard title={t("orders.reserved")} value={confirmedCount} tone="yellow" />
        <StatCard title={t("orders.collected")} value={collectedCount} tone="green" />
        <StatCard title={t("orders.cancelled")} value={cancelledCount} tone="red" />
        <StatCard
          title={t("orders.reliability")}
          value={profile?.reliability_score ?? t("common.unavailable")}
          tone={reliabilityTone}
        />
        {/* Fifth card: full width on phones so long Georgian status words
            ("შესანიშნავი") don't have to break mid-word. */}
        <StatCard
          title={t("orders.status")}
          value={reliabilityStatusLabel}
          tone={reliabilityTone}
          className="col-span-2 md:col-span-1"
        />
      </div>
    </div>
  );
}
