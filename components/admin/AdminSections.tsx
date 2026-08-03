import AnalyticsBarCard from "@/components/AnalyticsBarCard";
import StatCard from "@/components/StatCard";
import { CheckIcon } from "@/components/icons";
import { KpiCardGrid, type KpiCard } from "@/components/analytics/KpiCardGrid";
import { MiniBarChart } from "@/components/analytics/MiniBarChart";
import {
  formatAnalyticsMoney,
  type MarketplaceAnalyticsSummary,
} from "@/lib/analytics";
import {
  getApplicationHealthStatusLabel,
  type ApplicationHealthItem,
} from "@/lib/diagnostics";
import type { Language, TranslationKey } from "@/lib/i18n";
import { formatDisplayDateTime } from "@/lib/offerLifecycle";
import {
  adminPaymentPanelSections,
  currentDatabasePaymentStatuses,
  paymentProviderOptions,
  paymentStatuses,
} from "@/lib/paymentArchitecture";
import type { Business, Profile } from "@/lib/types";
import type { FormEvent } from "react";

export type AdminBusiness = Business & {
  created_at?: string | null;
};

type MetricCard = {
  title: string;
  value: number | string;
  helper: string;
  className: string;
};

type BarMetric = {
  title: string;
  value: number;
  caption: string;
  percentage: number;
  tone: "green" | "yellow" | "red";
};

type SimpleStat = {
  title: string;
  value: number | string;
  tone?: "green" | "yellow" | "red";
};

type AdminHeroProps = {
  t: (key: TranslationKey) => string;
};

export function AdminHero({ t }: AdminHeroProps) {
  return (
    <div className="premium-surface rounded-3xl p-5 sm:p-8 md:rounded-[2.5rem] md:p-12">
      <p className="premium-badge px-4 py-2">
        {t("admin.analytics")}
      </p>
      <h1 className="mt-4 text-3xl font-black text-[#2e2a22] sm:text-4xl md:text-6xl">
        {t("admin.title")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[#6b6152] sm:text-lg">
        {t("admin.subtitle")}
      </p>
    </div>
  );
}

export function AdminMarketplaceOverview({
  metrics,
}: {
  metrics: MetricCard[];
}) {
  return (
    <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Marketplace overview
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Pilot operations snapshot
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          The core numbers admins need before approving businesses or checking
          marketplace activity.
        </p>
      </div>

      <MetricCardGrid metrics={metrics} columnsClassName="xl:grid-cols-3" />
    </div>
  );
}

export function AdminRevenueInsights({
  analytics,
}: {
  analytics: MarketplaceAnalyticsSummary;
}) {
  const cards: KpiCard[] = [
    {
      title: "Businesses",
      value: analytics.businesses,
      helper: "All business profiles in the marketplace",
    },
    {
      title: "Customers",
      value: analytics.customers,
      helper: "Customer accounts ready to reserve offers",
    },
    {
      title: "Offers",
      value: analytics.offers,
      helper: "Total offers visible to admin",
    },
    {
      title: "Reservations",
      value: analytics.reservations,
      helper: "All order records in the current admin dataset",
      tone: "green",
    },
    {
      title: "Completed Pickups",
      value: analytics.completedPickups,
      helper: "Orders successfully collected",
      tone: "green",
    },
    {
      title: "Cancellation Rate",
      value: `${analytics.cancellationRate}%`,
      helper: "Cancelled, refunded and no-show share of orders",
      tone: analytics.cancellationRate > 20 ? "yellow" : "white",
    },
    {
      title: "Average Rating",
      value: analytics.averageRating,
      helper: "Average customer review score",
      tone: analytics.averageRating === "No ratings yet" ? "white" : "yellow",
    },
    {
      title: "Marketplace Revenue",
      value: formatAnalyticsMoney(analytics.estimatedMarketplaceRevenue),
      helper: "Estimated 10% platform commission",
      tone: "green",
    },
    {
      title: "Business Revenue",
      value: formatAnalyticsMoney(analytics.estimatedBusinessRevenue),
      helper: "Estimated 90% business earnings",
      tone: "green",
    },
  ];

  return (
    <section className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Marketplace revenue
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Financial and operational insight
          </h2>
          <p className="mt-3 max-w-3xl font-semibold leading-7 text-[#6b6152]">
            These are pilot estimates from existing orders. They prepare the
            admin view for a future commission model without connecting real
            payment providers.
          </p>
        </div>

        <div className="soft-raised rounded-3xl p-4 text-sm font-semibold leading-6 text-[#2e2a22] lg:max-w-sm">
          <p className="font-black">Future commission model</p>
          <p className="mt-1">
            Current architecture prepares 10% platform revenue and 90% business
            revenue per paid reservation.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <KpiCardGrid cards={cards} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <MiniBarChart
          title="Reservations over time"
          description="Reservation volume by recent order creation date."
          data={analytics.reservationsOverTime}
        />
        <MiniBarChart
          title="Revenue over time"
          description="Estimated gross reservation value by date."
          data={analytics.revenueOverTime}
          valuePrefix="₾ "
        />
        <MiniBarChart
          title="Offer popularity"
          description="Top offers by total reservations."
          data={analytics.offerPopularity}
        />
      </div>
    </section>
  );
}

export function AdminOperationalDashboard({
  metrics,
}: {
  metrics: SimpleStat[];
}) {
  return (
    <section className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Operational dashboard
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Today&apos;s marketplace activity
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          Fast pilot signals for reservations, pickups, cancellations,
          no-shows and marketplace activity.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
      </div>
    </section>
  );
}

export function AdminMarketplaceIntelligence({
  metrics,
}: {
  metrics: MetricCard[];
}) {
  return (
    <section className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Marketplace intelligence
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Business activity signals
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          Rule-based operations view for spotting active partners, inactive
          businesses and offers that need admin attention.
        </p>
      </div>

      <MetricCardGrid metrics={metrics} columnsClassName="xl:grid-cols-3" />
    </section>
  );
}

export function AdminSupportTools({
  metrics,
}: {
  metrics: MetricCard[];
}) {
  return (
    <section className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Support tools
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Lookup workspace
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          Use the admin search box below to look up reservations, customers,
          businesses and orders during pilot operations.
        </p>
      </div>

      <MetricCardGrid metrics={metrics} columnsClassName="xl:grid-cols-5" />
    </section>
  );
}

export function AdminHealthSections({
  t,
  marketplaceHealth,
  marketplaceOperations,
  operationalStats,
  customerReliabilityStats,
  applicationHealth,
}: {
  t: (key: TranslationKey) => string;
  marketplaceHealth: BarMetric[];
  marketplaceOperations: SimpleStat[];
  operationalStats: SimpleStat[];
  customerReliabilityStats: SimpleStat[];
  applicationHealth: ApplicationHealthItem[];
}) {
  const healthToneStyles = {
    ok: "soft-raised text-[#2e2a22]",
    warning: "bg-yellow-50 text-yellow-950",
    error: "bg-red-50 text-red-800",
  };

  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="premium-card rounded-3xl p-5 sm:p-8">
          <p className="premium-badge px-4 py-2">
            Admin guidance
          </p>
          <h2 className="mt-4 text-2xl font-black text-[#2e2a22] sm:text-3xl">
            Use this dashboard to approve businesses and monitor marketplace
            activity.
          </h2>
          <p className="mt-4 font-semibold leading-7 text-[#6b6152]">
            Review pending businesses before they can publish offers, then watch
            orders, active offers, ratings and reliability signals as the pilot
            grows.
          </p>
        </div>

        <div className="premium-card rounded-3xl p-5 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
                Live marketplace health
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {t("admin.analytics")}
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
              Lightweight status cards based on the current businesses, offers,
              orders and ratings visible to admins.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {marketplaceHealth.map((metric) => (
              <AnalyticsBarCard key={metric.title} {...metric} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
              Marketplace operations
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Pilot health checklist
            </h2>
          </div>

          <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
            Fast counts for approvals, today&apos;s reservations, pickups, expired
            offers and active customer demand.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {marketplaceOperations.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </div>

      <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
              Application health
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Runtime diagnostics
            </h2>
          </div>

          <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
            Lightweight checks for environment variables, Supabase, Storage,
            Realtime and the deployed build identifier.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {applicationHealth.map((item) => (
            <div
              key={item.title}
              className={`rounded-2xl p-4 ${healthToneStyles[item.status]}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{item.title}</p>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-wide">
                  {getApplicationHealthStatusLabel(item.status)}
                </span>
              </div>
              <p className="mt-3 text-2xl font-black">{item.value}</p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
              Operational details
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Status and reliability
            </h2>
          </div>

          <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
            Extra signals for spotting sold-out offers, no-shows and customer
            reliability risks during the pilot.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {operationalStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}

          {customerReliabilityStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </div>
    </>
  );
}

export function AdminPaymentsOverview({
  metrics,
}: {
  metrics: MetricCard[];
}) {
  return (
    <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Payments overview
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Financial architecture overview
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          Bank of Georgia checkout support is wired through server route
          handlers. This panel shows the financial fields recorded by orders and
          the states admins should monitor during pilot operations.
        </p>
      </div>

      <MetricCardGrid metrics={metrics} columnsClassName="xl:grid-cols-3" />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-[#f4efe4] p-5">
          <h3 className="text-xl font-black text-[#2e2a22]">
            Payment states
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6152]">
            Current database payments support{" "}
            {currentDatabasePaymentStatuses.join(", ")}. Pending sessions hold
            inventory until Bank of Georgia confirms, fails, cancels or expires
            the payment.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {paymentStatuses.map((status) => (
              <span
                key={status}
                className="soft-raised rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide text-[#a67c52]"
              >
                {status}
              </span>
            ))}
          </div>
        </div>

        <div className="soft-raised rounded-3xl p-5">
          <h3 className="text-xl font-black text-[#2e2a22]">
            Provider options
          </h3>
          <div className="mt-4 grid gap-2">
            {paymentProviderOptions.map((provider) => (
              <div key={provider.id} className="rounded-2xl bg-[#f4efe4] p-3 text-sm">
                <p className="font-black text-[#2e2a22]">{provider.name}</p>
                <p className="mt-1 font-semibold leading-5 text-[#6b6152]">
                  {provider.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {adminPaymentPanelSections.map((section) => (
          <div
            key={section.title}
            className="soft-raised rounded-2xl p-4"
          >
            <p className="font-black text-[#2e2a22]">{section.title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6152]">
              {section.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAccountView({
  metrics,
  profiles,
}: {
  metrics: MetricCard[];
  profiles: Profile[];
}) {
  return (
    <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Account view
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Customers, businesses and admins
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          Admins can review role distribution here. Roles still cannot be
          changed from this dashboard.
        </p>
      </div>

      <MetricCardGrid metrics={metrics} columnsClassName="xl:grid-cols-4" />

      <div className="soft-raised mt-6 overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-3 bg-[#f4efe4] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#6b6152]">
          <span>Email</span>
          <span>Role</span>
          <span>Reliability</span>
        </div>

        <div>
          {profiles.length === 0 && (
            <p className="px-4 py-5 font-semibold text-[#6b6152]">
              No profiles available.
            </p>
          )}

          {profiles.slice(0, 12).map((profile) => (
            <div
              key={profile.id}
              className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-3 px-4 py-4 text-sm font-semibold text-[#6b6152]"
            >
              <span className="min-w-0 break-words">
                {profile.email || "Email unavailable"}
              </span>
              <span className="capitalize">{profile.role || "Missing"}</span>
              <span>
                {profile.reliability_score ?? "N/A"} ·{" "}
                {profile.reliability_status || "unknown"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminModerationVisibility({
  metrics,
}: {
  metrics: MetricCard[];
}) {
  return (
    <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
            Moderation visibility
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Business and offer review signals
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-[#6b6152] sm:text-right">
          Rejected businesses are not a separate state in the current approval
          model; unapproved businesses stay in the pending queue.
        </p>
      </div>

      <MetricCardGrid metrics={metrics} columnsClassName="xl:grid-cols-4" />
    </div>
  );
}

export function PendingBusinesses({
  t,
  language,
  businesses,
  updatingBusinessId,
  onApprove,
  onRequestChanges,
  onReject,
}: {
  t: (key: TranslationKey) => string;
  language: Language;
  businesses: AdminBusiness[];
  updatingBusinessId: number | null;
  onApprove: (id: number) => void;
  onRequestChanges: (id: number, reason: string) => void;
  onReject: (id: number, reason: string) => void;
}) {
  function handleReviewAction(
    event: FormEvent<HTMLFormElement>,
    businessId: number
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const reason = String(formData.get("reason") || "").trim();
    const action = String(formData.get("approval_action") || "");

    if (action === "request_changes") {
      onRequestChanges(businessId, reason);
      return;
    }

    if (action === "reject") {
      onReject(businessId, reason);
    }
  }

  return (
    <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-yellow-700 sm:text-sm">
            Approval queue
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t("admin.pendingBusinesses")}
          </h2>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-[#6b6152]">
            Review new business registrations before they can publish food
            rescue offers.
          </p>
        </div>

        <span className="w-full rounded-full bg-yellow-100 px-4 py-2 text-center text-sm font-black text-yellow-800 sm:w-auto">
          {businesses.length} waiting
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            title: "1. Review details",
            text: "Check the business type, address and phone before approving.",
          },
          {
            title: "2. Approve verified businesses",
            text: "Approved businesses can open their dashboard and publish offers.",
          },
          {
            title: "3. Monitor pilot activity",
            text: "Use marketplace health cards to watch offers, orders and ratings.",
          },
        ].map((step) => (
          <div key={step.title} className="rounded-2xl bg-[#f4efe4] p-4 text-sm">
            <p className="font-black text-[#2e2a22]">{step.title}</p>
            <p className="mt-2 font-semibold leading-6 text-[#6b6152]">
              {step.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {businesses.length === 0 && (
          <div className="soft-raised rounded-3xl p-6 text-center sm:p-8">
            <div className="soft-pressed mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <CheckIcon className="h-6 w-6 text-[#a67c52]" strokeWidth={2} />
            </div>
            <h3 className="mt-4 text-2xl font-black text-[#2e2a22]">
              No businesses awaiting approval
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-[#6b6152]">
              New registrations will appear here.
            </p>
          </div>
        )}

        {businesses.map((business) => (
          <div
            key={business.id}
            className="grid gap-5 rounded-3xl bg-yellow-50 p-5 sm:p-6 lg:grid-cols-[1fr_320px] lg:items-start"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black sm:text-2xl">
                  {business.name}
                </h3>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-800">
                  Pending approval
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm font-semibold text-[#6b6152] sm:grid-cols-2 xl:grid-cols-4">
                <BusinessDetail label="Business type" value={business.business_type} />
                <BusinessDetail label="Address" value={business.address} />
                <BusinessDetail label="Phone" value={business.phone} />
                <BusinessDetail
                  label="Registered"
                  value={formatDisplayDateTime(business.created_at, language)}
                />
              </div>
            </div>

            <form
              onSubmit={(event) => handleReviewAction(event, business.id)}
              className="premium-card rounded-3xl p-4"
            >
              <label className="grid gap-2 text-sm font-black text-[#6b6152]">
                Review reason
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Optional note for rejection or requested changes"
                  maxLength={220}
                  className="premium-input p-3 font-semibold"
                />
              </label>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => onApprove(business.id)}
                  disabled={updatingBusinessId !== null}
                  className="premium-button min-h-12 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingBusinessId === business.id
                    ? "Updating..."
                    : "Approve"}
                </button>

                <button
                  type="submit"
                  name="approval_action"
                  value="request_changes"
                  disabled={updatingBusinessId !== null}
                  className="min-h-12 rounded-full bg-yellow-100 px-6 py-3 font-black text-yellow-900 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Request changes
                </button>

                <button
                  type="submit"
                  name="approval_action"
                  value="reject"
                  disabled={updatingBusinessId !== null}
                  className="min-h-12 rounded-full bg-red-50 px-6 py-3 font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </div>

              <p className="mt-3 text-xs font-semibold leading-5 text-[#6b6152]">
                Current database stores approval as approved or pending. Notes
                help the operator decide what to tell the business manually.
              </p>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApprovedBusinesses({
  businesses,
  updatingBusinessId,
  onMoveToPending,
}: {
  businesses: AdminBusiness[];
  updatingBusinessId: number | null;
  onMoveToPending: (id: number) => void;
}) {
  return (
    <div className="mt-6 premium-card rounded-3xl p-5 sm:mt-8 sm:p-8">
      <h2 className="text-xl font-black sm:text-2xl">Approved businesses</h2>

      <div className="mt-6 grid gap-4">
        {businesses.length === 0 && (
          <div className="soft-raised rounded-3xl p-6 text-center sm:p-8">
            <h3 className="text-2xl font-black text-[#2e2a22]">
              No approved businesses yet
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-[#6b6152]">
              Approved businesses will appear here after you review new
              registrations.
            </p>
          </div>
        )}

        {businesses.map((business) => (
          <div
            key={business.id}
            className="soft-raised flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="text-xl font-black">{business.name}</h3>
              <p className="text-[#6b6152]">
                {business.business_type} · {business.address}
              </p>
              <p className="text-[#6b6152]">{business.phone}</p>
              <p className="mt-2 inline-block rounded-full bg-[#f4efe4] px-3 py-1 text-sm font-bold text-[#a67c52]">
                Approved
              </p>
            </div>

            <button
              onClick={() => onMoveToPending(business.id)}
              disabled={updatingBusinessId !== null}
              className="min-h-12 rounded-full bg-red-50 px-6 py-3 font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingBusinessId === business.id
                ? "Updating..."
                : "Move to pending"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCardGrid({
  metrics,
  columnsClassName,
}: {
  metrics: MetricCard[];
  columnsClassName: string;
}) {
  return (
    <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${columnsClassName}`}>
      {metrics.map((metric) => (
        <div
          key={metric.title}
          className={`rounded-2xl p-4 sm:rounded-3xl sm:p-5 ${metric.className}`}
        >
          <p className="text-sm font-black opacity-75">{metric.title}</p>
          <p className="mt-2 text-3xl font-black sm:text-4xl">
            {metric.value}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 opacity-70">
            {metric.helper}
          </p>
        </div>
      ))}
    </div>
  );
}

function BusinessDetail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl bg-white/60 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
        {label}
      </p>
      <p className="mt-1 break-words text-[#2e2a22]">
        {value || "Not provided"}
      </p>
    </div>
  );
}
