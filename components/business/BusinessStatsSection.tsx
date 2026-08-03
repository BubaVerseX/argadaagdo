import {
  metricToneStyles,
  type MetricTone,
} from "@/lib/business/dashboard";
import type { TranslationKey } from "@/lib/i18n";

type BusinessMetric = {
  title: string;
  value: number | string;
  tone: MetricTone;
};

type BusinessStatsSectionProps = {
  t: (key: TranslationKey) => string;
  hasAnalyticsActivity: boolean;
  metrics: BusinessMetric[];
};

export function BusinessStatsSection({
  t,
  hasAnalyticsActivity,
  metrics,
}: BusinessStatsSectionProps) {
  return (
    <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
          Dashboard Overview
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
          {t("businessDashboard.stats")}
        </h2>
      </div>

      {!hasAnalyticsActivity && (
        <div className="soft-raised mt-6 rounded-3xl p-5 text-center font-bold text-[#2e2a22] sm:p-6">
          {t("businessDashboard.emptyAnalytics")}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const styles = metricToneStyles[metric.tone];

          return (
            <div
              key={metric.title}
              className={`rounded-2xl p-4 sm:rounded-3xl sm:p-5 ${styles.card}`}
            >
              <p className={`text-sm font-black ${styles.label}`}>
                {metric.title}
              </p>
              <p
                className={`mt-2 text-3xl font-black sm:text-4xl ${styles.value}`}
              >
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
