import { isTbcIban, LEGAL_FORMS } from "@/lib/verification";
import { useState } from "react";
import type { ReactNode } from "react";
import StatCard from "@/components/StatCard";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { MiniBarChart } from "@/components/analytics/MiniBarChart";
import {
  formatAnalyticsMoney,
  type MarketplaceAnalyticsSummary,
} from "@/lib/analytics";
import {
  getApplicationHealthStatusLabel,
  type ApplicationHealthItem,
} from "@/lib/diagnostics";
import type { Language } from "@/lib/i18n";
import { formatDisplayDateTime } from "@/lib/offerLifecycle";
import { paymentStatuses } from "@/lib/paymentArchitecture";
import type { Business, Profile } from "@/lib/types";
import type { FormEvent } from "react";
import type { LatLng } from "@/lib/location";
import dynamicImport from "next/dynamic";

// The map loads only when a pin editor is open.
const LocationPicker = dynamicImport(() => import("@/components/map/LocationPicker"), { ssr: false });

export type AdminBusiness = Business & {
  created_at?: string | null;
};

export type AdminReviewReport = {
  id: number;
  review_id: number;
  reporter_id: string;
  reason: string;
  comment: string | null;
  created_at: string;
  status: string;
  business_ratings: {
    business_id: number;
    rating: number;
    comment: string | null;
    hidden: boolean;
  } | null;
};

const REVIEW_REPORT_REASON_LABELS: Record<string, { ka: string; en: string }> = {
  offensive: { ka: "შეურაცხმყოფელი", en: "Offensive" },
  spam: { ka: "სპამი", en: "Spam" },
  false: { ka: "ყალბი", en: "False" },
  other: { ka: "სხვა", en: "Other" },
};

// Stored business types are English; Georgian admins see them translated.
const GEORGIAN_BUSINESS_TYPES: Record<string, string> = {
  Cafe: "კაფე",
  Bakery: "საცხობი",
  Restaurant: "რესტორანი",
  Supermarket: "სუპერმარკეტი",
  Hotel: "სასტუმრო",
  Other: "სხვა",
};

function businessTypeLabel(type: string | null | undefined, language: Language) {
  if (!type) return "";
  return language === "ka" ? GEORGIAN_BUSINESS_TYPES[type] ?? type : type;
}

function useText(language: Language) {
  return (ka: string, en: string) => (language === "ka" ? ka : en);
}

export type SimpleStat = {
  title: string;
  value: number | string;
  tone?: "green" | "yellow" | "red";
};

function StatGrid({ stats, className = "" }: { stats: SimpleStat[]; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-lg font-semibold text-cream first:mt-0">{children}</h3>;
}

export function AdminHeader({ language }: { language: Language }) {
  const text = useText(language);

  return (
    <h1 className="text-3xl font-semibold text-cream sm:text-4xl">
      {text("ადმინი", "Admin")}
    </h1>
  );
}

/** A short title that opens its details on tap. */
export function AdminCollapsible({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <details className="group premium-card mt-3 rounded-3xl">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold text-cream [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {count !== undefined && <span className="ml-2 text-body">{count}</span>}
        </span>
        <ChevronDownIcon
          className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
          strokeWidth={1.8}
        />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

export function AdminKeyNumbers({ stats }: { stats: SimpleStat[] }) {
  return <StatGrid stats={stats} className="mt-6" />;
}

export function AdminAnalytics({
  language,
  overview,
  analytics,
}: {
  language: Language;
  overview: SimpleStat[];
  analytics: MarketplaceAnalyticsSummary;
}) {
  const text = useText(language);
  const revenue: SimpleStat[] = [
    { title: text("შეკვეთები", "Reservations"), value: analytics.reservations },
    { title: text("გაცემული", "Picked up"), value: analytics.completedPickups, tone: "green" },
    {
      title: text("გაუქმება", "Cancel rate"),
      value: `${analytics.cancellationRate}%`,
      tone: analytics.cancellationRate > 20 ? "yellow" : undefined,
    },
    { title: text("საშ. შეფასება", "Avg rating"), value: analytics.averageRating },
    {
      title: text("საკომისიო", "Commission"),
      value: formatAnalyticsMoney(analytics.estimatedMarketplaceRevenue),
      tone: "green",
    },
    {
      // Recorded per order at each business's own rate (30% default).
      title: text("ბიზნესების შემოსავალი", "Business earnings"),
      value: formatAnalyticsMoney(analytics.estimatedBusinessRevenue),
      tone: "green",
    },
  ];

  return (
    <>
      <StatGrid stats={overview} />
      <StatGrid stats={revenue} className="mt-3" />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <MiniBarChart
          title={text("შეკვეთები დღეების მიხედვით", "Reservations by day")}
          description=""
          data={analytics.reservationsOverTime}
        />
        <MiniBarChart
          title={text("შემოსავალი დღეების მიხედვით", "Revenue by day")}
          description=""
          data={analytics.revenueOverTime}
          valuePrefix="₾ "
        />
        <MiniBarChart
          title={text("პოპულარული", "Top offers")}
          description=""
          data={analytics.offerPopularity}
        />
      </div>
    </>
  );
}

export function AdminOperations({
  language,
  today,
  status,
  signals,
}: {
  language: Language;
  today: SimpleStat[];
  status: SimpleStat[];
  signals: SimpleStat[];
}) {
  const text = useText(language);

  return (
    <>
      <SubTitle>{text("დღეს", "Today")}</SubTitle>
      <StatGrid stats={today} className="mt-3" />
      <SubTitle>{text("სტატუსები", "Statuses")}</SubTitle>
      <StatGrid stats={status} className="mt-3" />
      <SubTitle>{text("სიგნალები", "Signals")}</SubTitle>
      <StatGrid stats={signals} className="mt-3" />
    </>
  );
}

export function AdminPayments({
  language,
  stats,
}: {
  language: Language;
  stats: SimpleStat[];
}) {
  const text = useText(language);

  return (
    <>
      <StatGrid stats={stats} />
      <SubTitle>{text("გადახდის სტატუსები", "Payment states")}</SubTitle>
      <div className="mt-3 flex flex-wrap gap-2">
        {paymentStatuses.map((status) => (
          <span
            key={status}
            className="ui-card rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mint"
          >
            {status}
          </span>
        ))}
      </div>
    </>
  );
}

export function AdminApplicationHealth({ items }: { items: ApplicationHealthItem[] }) {
  const healthToneStyles = {
    ok: "ui-card text-cream",
    warning: "bg-warning-soft text-warning",
    error: "bg-danger-soft text-danger",
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <details key={item.title} className={`rounded-2xl p-4 ${healthToneStyles[item.status]}`}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="font-semibold">{item.title}</span>
            <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {getApplicationHealthStatusLabel(item.status)}
            </span>
          </summary>
          <p className="mt-2 text-sm font-semibold">{item.value}</p>
          <p className="mt-1 text-sm leading-6">{item.detail}</p>
        </details>
      ))}
    </div>
  );
}

export function AdminAccounts({
  language,
  stats,
  profiles,
}: {
  language: Language;
  stats: SimpleStat[];
  profiles: Profile[];
}) {
  const text = useText(language);

  return (
    <>
      <StatGrid stats={stats} />

      <div className="ui-card mt-4 overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-3 bg-well px-4 py-3 text-xs font-semibold uppercase tracking-wide text-body">
          <span>{text("ელფოსტა", "Email")}</span>
          <span>{text("როლი", "Role")}</span>
          <span>{text("სანდოობა", "Reliability")}</span>
        </div>

        {profiles.length === 0 && (
          <p className="px-4 py-5 text-body">{text("ანგარიშები არ არის.", "No accounts.")}</p>
        )}

        {profiles.slice(0, 12).map((profile) => (
          <div
            key={profile.id}
            className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-3 px-4 py-4 text-sm font-semibold text-body"
          >
            <span className="min-w-0 break-words">{profile.email || "—"}</span>
            <span className="capitalize">{profile.role || "—"}</span>
            <span>
              {profile.reliability_score ?? "—"} · {profile.reliability_status || "—"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export type BusinessVerificationReview = {
  business_id: number;
  legal_name: string | null;
  id_code: string | null;
  legal_form: string | null;
  owner_full_name: string | null;
  verified_phone: string | null;
  phone_still_verified: boolean;
  iban: string | null;
  registry_extract_path: string | null;
  submitted_at: string | null;
  iban_holder_confirmed_at: string | null;
  is_exempt: boolean;
};

const REGISTRY_CHECK_URL = "https://enreg.reestri.gov.ge";

// Mirrors the database's approval guard, which is what actually enforces it.
function isVerificationReady(verification: BusinessVerificationReview | undefined) {
  if (!verification) return false;
  if (verification.is_exempt) return true;

  return Boolean(
    verification.legal_name &&
      verification.owner_full_name &&
      verification.verified_phone &&
      verification.iban &&
      verification.iban_holder_confirmed_at
  );
}

function BusinessVerificationCard({
  language,
  verification,
  busy,
  onConfirmIbanHolder,
  onOpenExtract,
}: {
  language: Language;
  verification: BusinessVerificationReview | undefined;
  busy: boolean;
  onConfirmIbanHolder: (confirmed: boolean) => void;
  onOpenExtract: (path: string) => void;
}) {
  const text = useText(language);

  if (verification?.is_exempt) {
    return (
      <p className="mt-3 rounded-2xl bg-well p-3 text-sm font-semibold text-body">
        {text("დოკუმენტები არ სჭირდება (ძველი ბიზნესი).", "No documents needed (older business).")}
      </p>
    );
  }

  if (!verification?.legal_name) {
    return (
      <p className="mt-3 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">
        {text("ვერიფიკაციის მონაცემები არ არის.", "No verification details.")}
      </p>
    );
  }

  const legalFormEntry = LEGAL_FORMS.find((form) => form.value === verification.legal_form);
  const legalForm = legalFormEntry
    ? language === "ka"
      ? legalFormEntry.ka
      : legalFormEntry.en
    : verification.legal_form;

  return (
    <div className="mt-3 grid gap-3">
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-body">
        <BusinessDetail label={text("იურიდიული სახელი", "Legal name")} value={verification.legal_name} />
        <BusinessDetail label={text("ფორმა", "Legal form")} value={legalForm} />
        <BusinessDetail label={text("ს/კ", "ID code")} value={verification.id_code} />
        <BusinessDetail label={text("მფლობელი", "Owner")} value={verification.owner_full_name} />
        <BusinessDetail
          label={
            verification.phone_still_verified
              ? text("ტელეფონი ✓", "Phone ✓")
              : text("ტელეფონი ✗ (არ არის დადასტურებული)", "Phone ✗ (not verified)")
          }
          value={verification.verified_phone ? `+${verification.verified_phone}` : null}
        />
        <BusinessDetail
          label={
            verification.iban && isTbcIban(verification.iban)
              ? "IBAN (TBC)"
              : text("IBAN (სხვა ბანკი: ორშაბათს გადარიცხვა)", "IBAN (other bank: Monday transfer)")
          }
          value={verification.iban}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {verification.registry_extract_path && (
          <button
            type="button"
            onClick={() => onOpenExtract(verification.registry_extract_path || "")}
            className="premium-button-secondary min-h-11 px-4 py-2 text-sm"
          >
            {text("ამონაწერის გახსნა", "Open extract")}
          </button>
        )}
        <a
          href={REGISTRY_CHECK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="premium-button-secondary min-h-11 px-4 py-2 text-sm"
        >
          {text("რეესტრი ↗", "Registry ↗")}
        </a>
        {verification.id_code && (
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(verification.id_code || "")}
            className="premium-button-secondary min-h-11 px-4 py-2 text-sm"
          >
            {text("ს/კ კოპირება", "Copy ID")}
          </button>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-cream">
        <input
          type="checkbox"
          checked={Boolean(verification.iban_holder_confirmed_at)}
          disabled={busy}
          onChange={(event) => onConfirmIbanHolder(event.target.checked)}
          className="h-[22px] w-[22px] shrink-0 accent-mint"
        />
        {text("IBAN-ის მფლობელი = იურიდიული სახელი", "IBAN holder = legal name")}
      </label>
    </div>
  );
}

export function PendingBusinesses({
  language,
  businesses,
  waitingCount,
  updatingBusinessId,
  verifications,
  onConfirmIbanHolder,
  onOpenExtract,
  onApprove,
  onReject,
}: {
  language: Language;
  businesses: AdminBusiness[];
  /** Total pending businesses (the list itself is one page). */
  waitingCount?: number;
  updatingBusinessId: number | null;
  verifications: Record<number, BusinessVerificationReview>;
  onConfirmIbanHolder: (id: number, confirmed: boolean) => void;
  onOpenExtract: (path: string) => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
}) {
  const text = useText(language);

  function handleReject(event: FormEvent<HTMLFormElement>, businessId: number) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onReject(businessId, String(formData.get("reason") || "").trim());
  }

  return (
    <section className="mt-6 premium-card rounded-3xl p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-cream">
          {text("დასამტკიცებელი", "To approve")}
        </h2>
        <span className="rounded-full bg-warning-soft px-4 py-2 text-sm font-semibold text-warning">
          {waitingCount ?? businesses.length}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        {businesses.length === 0 && (
          <p className="flex items-center gap-2 font-semibold text-body">
            <CheckIcon className="h-5 w-5 text-mint" strokeWidth={2} />
            {text("არაფერი ელოდება", "Nothing waiting")}
          </p>
        )}

        {businesses.map((business) => (
          <div
            key={business.id}
            className="grid gap-4 rounded-3xl bg-warning-soft p-4 sm:p-6 lg:grid-cols-[1fr_300px] lg:items-start"
          >
            <div className="min-w-0">
              <h3 className="break-words text-xl font-semibold text-cream">{business.name}</h3>
              <p className="mt-1 text-sm text-body">
                {businessTypeLabel(business.business_type, language)} · {business.address}
              </p>
              <p className="text-sm text-body">
                {business.phone} · {formatDisplayDateTime(business.created_at, language)}
              </p>

              <BusinessVerificationCard
                language={language}
                verification={verifications[business.id]}
                busy={updatingBusinessId !== null}
                onConfirmIbanHolder={(confirmed) => onConfirmIbanHolder(business.id, confirmed)}
                onOpenExtract={onOpenExtract}
              />
            </div>

            <form
              onSubmit={(event) => handleReject(event, business.id)}
              className="premium-card grid gap-2 rounded-3xl p-4"
            >
              <button
                type="button"
                onClick={() => onApprove(business.id)}
                disabled={
                  updatingBusinessId !== null ||
                  !isVerificationReady(verifications[business.id])
                }
                className="premium-button min-h-12 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingBusinessId === business.id
                  ? text("ინახება...", "Updating...")
                  : text("დამტკიცება", "Approve")}
              </button>

              <textarea
                name="reason"
                rows={2}
                aria-label={text("უარის მიზეზი", "Reason for rejection")}
                placeholder={text("უარის მიზეზი (მფლობელი ნახავს)", "Reason (owner sees it)")}
                maxLength={500}
                className="premium-input mt-2 p-3 font-semibold"
              />

              <button
                type="submit"
                disabled={updatingBusinessId !== null}
                className="min-h-12 rounded-full bg-danger-soft px-6 py-3 font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:bg-well disabled:text-muted"
              >
                {text("უარყოფა", "Reject")}
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RejectedBusinesses({
  language,
  businesses,
}: {
  language: Language;
  businesses: AdminBusiness[];
}) {
  const text = useText(language);

  return (
    <div className="grid gap-3">
      {businesses.length === 0 && (
        <p className="font-semibold text-body">{text("არ არის.", "None.")}</p>
      )}

      {businesses.map((business) => (
        <div key={business.id} className="rounded-2xl bg-danger-soft p-4">
          <h3 className="min-w-0 break-words font-semibold text-cream">{business.name}</h3>
          <p className="mt-1 text-sm text-body">
            {businessTypeLabel(business.business_type, language)} · {business.address} ·{" "}
            {formatDisplayDateTime(business.rejected_at, language)}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-body">
            <span className="font-semibold text-cream">{text("მიზეზი: ", "Reason: ")}</span>
            {business.rejection_reason}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ReportedReviews({
  language,
  reports,
  openCount,
  businessNameById,
  reporterEmailById,
  updatingReportId,
  onHide,
  onDismiss,
}: {
  language: Language;
  reports: AdminReviewReport[];
  openCount: number;
  businessNameById: Record<number, string>;
  reporterEmailById: Record<string, string>;
  updatingReportId: number | null;
  onHide: (reportId: number) => void;
  onDismiss: (reportId: number) => void;
}) {
  const text = useText(language);

  return (
    <section className="mt-6 premium-card rounded-3xl p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-cream">
          {text("დარეპორტებული შეფასებები", "Reported reviews")}
        </h2>
        <span className="rounded-full bg-warning-soft px-4 py-2 text-sm font-semibold text-warning">
          {openCount}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {reports.map((report) => {
          const review = report.business_ratings;
          const reason = REVIEW_REPORT_REASON_LABELS[report.reason];

          return (
            <div
              key={report.id}
              className="ui-card flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-semibold text-cream">
                  {(review && businessNameById[review.business_id]) || "—"}
                  {review ? ` · ${review.rating}/5` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-body">
                  {review?.comment?.trim() || "—"}
                </p>
                <details className="mt-2 text-sm text-body">
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold text-cream">
                    {reason ? (language === "ka" ? reason.ka : reason.en) : report.reason}
                  </summary>
                  {report.comment && (
                    <p className="whitespace-pre-wrap break-words">{report.comment}</p>
                  )}
                  <p className="break-words">
                    {reporterEmailById[report.reporter_id] || report.reporter_id} ·{" "}
                    {formatDisplayDateTime(report.created_at, language)}
                  </p>
                </details>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 md:w-44 md:grid-cols-1">
                <button
                  type="button"
                  disabled={updatingReportId !== null}
                  onClick={() => onHide(report.id)}
                  className="min-h-12 rounded-full bg-danger-soft px-4 py-3 font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:bg-well disabled:text-muted"
                >
                  {text("დამალვა", "Hide")}
                </button>
                <button
                  type="button"
                  disabled={updatingReportId !== null}
                  onClick={() => onDismiss(report.id)}
                  className="min-h-12 rounded-full bg-well px-4 py-3 font-semibold text-body transition hover:text-cream disabled:cursor-not-allowed disabled:text-muted"
                >
                  {text("დატოვება", "Keep")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HiddenReviews({
  language,
  reports,
  businessNameById,
  updatingReportId,
  onUnhide,
}: {
  language: Language;
  /** One report per hidden review. */
  reports: AdminReviewReport[];
  businessNameById: Record<number, string>;
  updatingReportId: number | null;
  onUnhide: (report: AdminReviewReport) => void;
}) {
  const text = useText(language);

  return (
    <div className="grid gap-3">
      {reports.map((report) => {
        const review = report.business_ratings;

        return (
          <div
            key={report.review_id}
            className="ui-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="break-words font-semibold text-cream">
                {(review && businessNameById[review.business_id]) || "—"}
                {review ? ` · ${review.rating}/5` : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-body">
                {review?.comment?.trim() || "—"}
              </p>
            </div>

            <button
              type="button"
              disabled={updatingReportId !== null}
              onClick={() => onUnhide(report)}
              className="min-h-11 shrink-0 self-start rounded-full bg-well px-4 py-2 text-sm font-semibold text-body transition hover:text-cream disabled:cursor-not-allowed disabled:text-muted sm:self-auto"
            >
              {text("გამოჩენა", "Unhide")}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ApprovedBusinesses({
  businesses,
  updatingBusinessId,
  onMoveToPending,
  onSetFeeRate,
  onSetLocation,
  language,
}: {
  businesses: AdminBusiness[];
  updatingBusinessId: number | null;
  onMoveToPending: (id: number) => void;
  /** Platform commission as a percentage (0–100). */
  onSetFeeRate: (id: number, percent: number) => void;
  /** Saves the map pin; resolves true when saved. */
  onSetLocation: (id: number, location: LatLng) => Promise<boolean>;
  language: Language;
}) {
  const text = useText(language);
  const [feeDrafts, setFeeDrafts] = useState<Record<number, string>>({});
  const [pinFor, setPinFor] = useState<number | null>(null);
  const [pinDraft, setPinDraft] = useState<LatLng | null>(null);

  function currentPercent(business: AdminBusiness) {
    return Math.round(Number(business.platform_fee_rate ?? 0.3) * 100);
  }

  return (
    <div className="grid gap-3">
      {businesses.length === 0 && (
        <p className="font-semibold text-body">{text("არ არის.", "None.")}</p>
      )}

      {businesses.map((business) => {
        const hasPin = business.latitude != null && business.longitude != null;

        return (
          <details key={business.id} className="ui-card rounded-2xl p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block break-words font-semibold text-cream">{business.name}</span>
                <span className="block text-sm text-body">
                  {businessTypeLabel(business.business_type, language)} · {currentPercent(business)}%
                  {hasPin ? " · 📍" : ""}
                </span>
              </span>
              <ChevronDownIcon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            </summary>

            <p className="mt-3 text-sm text-body">
              {business.address} · {business.phone}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2 text-body">
                {text("საკომისიო", "Commission")}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  inputMode="numeric"
                  value={feeDrafts[business.id] ?? String(currentPercent(business))}
                  onChange={(event) =>
                    setFeeDrafts((drafts) => ({ ...drafts, [business.id]: event.target.value }))
                  }
                  aria-label={`${text("საკომისიო", "Commission")} ${business.name}, %`}
                  className="premium-input w-20 px-3 py-2 text-right font-semibold"
                />
                %
              </label>
              <button
                type="button"
                disabled={
                  updatingBusinessId !== null ||
                  Number(feeDrafts[business.id] ?? currentPercent(business)) === currentPercent(business)
                }
                onClick={() => onSetFeeRate(business.id, Number(feeDrafts[business.id]))}
                className="premium-button-secondary min-h-11 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text("შენახვა", "Save")}
              </button>
              <span className="text-xs text-body">
                {text("ნაგულისხმევი 30%, ახალ შეკვეთებზე", "Default 30%, new orders")}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-body">
                {hasPin
                  ? `📍 ${Number(business.latitude).toFixed(5)}, ${Number(business.longitude).toFixed(5)}`
                  : text("📍 რუკაზე არ არის", "📍 Not on the map")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPinFor(pinFor === business.id ? null : business.id);
                  setPinDraft(
                    hasPin
                      ? { latitude: Number(business.latitude), longitude: Number(business.longitude) }
                      : null
                  );
                }}
                className="premium-button-secondary min-h-11 px-3 py-1.5 text-xs"
              >
                {pinFor === business.id
                  ? text("დახურვა", "Close")
                  : hasPin
                    ? text("შეცვლა", "Change pin")
                    : text("დასმა", "Set pin")}
              </button>
            </div>
            {pinFor === business.id && (
              <div className="mt-3 grid max-w-xl gap-2">
                <LocationPicker
                  value={pinDraft}
                  onChange={setPinDraft}
                  initialQuery={business.address}
                  language={language}
                />
                <button
                  type="button"
                  disabled={!pinDraft || updatingBusinessId !== null}
                  onClick={() =>
                    pinDraft &&
                    void onSetLocation(business.id, pinDraft).then((saved) => saved && setPinFor(null))
                  }
                  className="premium-button min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text("PIN-ის შენახვა", "Save pin")}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onMoveToPending(business.id)}
              disabled={updatingBusinessId !== null}
              className="mt-4 min-h-12 rounded-full bg-danger-soft px-6 py-3 font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:bg-well disabled:text-muted"
            >
              {updatingBusinessId === business.id
                ? text("ინახება...", "Updating...")
                : text("მოლოდინში დაბრუნება", "Move to pending")}
            </button>
          </details>
        );
      })}
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
    <div className="rounded-2xl bg-well px-3 py-2">
      <p className="text-xs text-body">{label}</p>
      <p className="break-words text-cream">{value || "—"}</p>
    </div>
  );
}
