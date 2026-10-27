import OfferImage from "@/components/OfferImage";
import { PlusIcon, StarIcon } from "@/components/icons";
import { formatAnalyticsMoney, type OfferAnalytics } from "@/lib/analytics";
import type { OfferIntelligence } from "@/lib/marketplaceIntelligence";
import {
  DEFAULT_OFFER_CATEGORY,
  OFFER_CATEGORIES,
  getOfferCategoryLabel,
  normalizeOfferCategory,
  type OfferCategory,
} from "@/lib/offerCategories";
import {
  formatDisplayDateTime,
  formatMoney,
  formatPickupWindow,
  getEffectiveOfferStatus,
  getOfferStatusClassName,
  getOfferStatusLabel,
  getRatingLabel,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { Offer } from "@/lib/types";

type OfferListProps = {
  t: (key: TranslationKey) => string;
  language: Language;
  offers: Offer[];
  emptyTitle?: string;
  emptyText?: string;
  ratingSummaries: Record<number, RatingSummary>;
  offerAnalyticsById?: Record<number, OfferAnalytics>;
  offerIntelligenceById?: Record<number, OfferIntelligence>;
  editingOfferId: number | null;
  updatingOfferId: number | null;
  editTitle: string;
  editCategory: OfferCategory;
  editPrice: string;
  editOldPrice: string;
  editQuantity: string;
  editPickupDate: string;
  editPickupStart: string;
  editPickupEnd: string;
  onStartEditing: (offer: Offer) => void;
  onCancelEditing: () => void;
  onToggleActive: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onArchiveExpired: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onSaveEdits: (offer: Offer) => void;
  onEditTitleChange: (value: string) => void;
  onEditCategoryChange: (value: OfferCategory) => void;
  onEditPriceChange: (value: string) => void;
  onEditOldPriceChange: (value: string) => void;
  onEditQuantityChange: (value: string) => void;
  onEditPickupDateChange: (value: string) => void;
  onEditPickupStartChange: (value: string) => void;
  onEditPickupEndChange: (value: string) => void;
};

export function OfferList({
  t,
  language,
  offers,
  emptyTitle,
  emptyText,
  ratingSummaries,
  offerAnalyticsById = {},
  offerIntelligenceById = {},
  editingOfferId,
  updatingOfferId,
  editTitle,
  editCategory,
  editPrice,
  editOldPrice,
  editQuantity,
  editPickupDate,
  editPickupStart,
  editPickupEnd,
  onStartEditing,
  onCancelEditing,
  onToggleActive,
  onDuplicate,
  onArchiveExpired,
  onDelete,
  onSaveEdits,
  onEditTitleChange,
  onEditCategoryChange,
  onEditPriceChange,
  onEditOldPriceChange,
  onEditQuantityChange,
  onEditPickupDateChange,
  onEditPickupStartChange,
  onEditPickupEndChange,
}: OfferListProps) {
  const isGeorgian = language === "ka";
  const badgeToneStyles: Record<
    OfferIntelligence["badges"][number]["tone"],
    string
  > = {
    green: "bg-well text-mint",
    yellow: "bg-warning-soft text-warning",
    red: "bg-danger-soft text-danger",
    gray: "bg-well text-body",
  };
  const recommendationToneStyles: Record<
    OfferIntelligence["recommendations"][number]["tone"],
    string
  > = {
    green: "ui-card text-cream",
    yellow: "bg-warning-soft text-warning",
    red: "bg-danger-soft text-danger",
  };

  return (
    <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-3xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
        {isGeorgian ? "შეთავაზებების ისტორია" : "Offer History"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
        {t("businessDashboard.myOffers")}
      </h2>

      <div className="mt-6 grid gap-4">
        {offers.length === 0 && (
          <div className="ui-card rounded-3xl p-6 text-center sm:p-8">
            <div className="ui-well mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <PlusIcon className="h-6 w-6 text-mint" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-cream">
              {emptyTitle || t("businessDashboard.noOffers")}
            </h3>
            <p className="mx-auto mt-2 max-w-md leading-7 text-body">
              {emptyText || t("businessDashboard.noOffersHint")}
            </p>
            {!emptyTitle && (
              <a
                href="#create-offer"
                className="premium-button mt-5 px-6 py-3"
              >
                {t("businessDashboard.createFirstOffer")}
              </a>
            )}
          </div>
        )}

        {offers.map((offer) => {
          const statusLabel = getOfferStatusLabel(offer, language);
          const statusClass = getOfferStatusClassName(offer);
          const rating = ratingSummaries[offer.business_id];
          const analytics = offerAnalyticsById[offer.id];
          const intelligence = offerIntelligenceById[offer.id];
          const isEditing = editingOfferId === offer.id;
          const effectiveStatus = getEffectiveOfferStatus(offer);

          return (
            <div key={offer.id} className="ui-card grid gap-5 rounded-3xl p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3 sm:gap-4">
                  <div className="ui-card rounded-[18px] relative isolate h-20 w-20 shrink-0 overflow-hidden sm:h-24 sm:w-24">
                    <OfferImage src={offer.image_url} alt={offer.title} sizes="96px" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{offer.title}</h3>
                      <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold text-mint">
                        {isGeorgian
                          ? getOfferCategoryLabel(offer.category, language)
                          : normalizeOfferCategory(offer.category)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <p className="text-body">
                      {formatMoney(offer.price)} · {t("common.quantity")}:{" "}
                      {offer.quantity}
                    </p>
                    <p className="text-body">
                      {t("common.pickup")}: {formatPickupWindow(offer, language)}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                      <StarIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} filled />
                      {getRatingLabel(rating, language)}
                    </p>
                    <p className="mt-1 text-xs text-body">
                      {t("businessDashboard.created")}:{" "}
                      {formatDisplayDateTime(offer.created_at, language)}
                    </p>
                    {intelligence && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {intelligence.badges.map((badge) => (
                          <span
                            key={badge.label}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeToneStyles[badge.tone]}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
                  <button
                    onClick={() =>
                      isEditing ? onCancelEditing() : onStartEditing(offer)
                    }
                    disabled={
                      updatingOfferId !== null && updatingOfferId !== offer.id
                    }
                    className="premium-button-secondary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditing
                      ? t("common.cancel")
                      : isGeorgian
                      ? "რედაქტირება"
                      : "Edit"}
                  </button>

                  <button
                    onClick={() => onToggleActive(offer)}
                    disabled={updatingOfferId !== null}
                    aria-label={
                      isGeorgian
                        ? `აქტიური სტატუსის გადართვა: ${offer.title}`
                        : `Toggle ${offer.title} active status`
                    }
                    className={`min-h-12 rounded-full px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${ offer.active
                        ? "bg-well text-mint hover:bg-mint-strong"
                        : "bg-well text-body hover:bg-mint-strong"
                    }`}
                  >
                    {updatingOfferId === offer.id
                      ? isGeorgian
                        ? "ახლდება..."
                        : "Updating..."
                      : offer.active
                      ? isGeorgian
                        ? "დეაქტივაცია"
                        : "Deactivate"
                      : isGeorgian
                      ? "ხელახლა გააქტიურება"
                      : "Reactivate"}
                  </button>

                  <button
                    onClick={() => onDuplicate(offer)}
                    disabled={updatingOfferId !== null}
                    className="premium-button-secondary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingOfferId === offer.id
                      ? isGeorgian
                        ? "მიმდინარეობს..."
                        : "Working..."
                      : effectiveStatus === "expired"
                      ? isGeorgian
                        ? "მსგავსი შეთავაზების შექმნა"
                        : "Create Similar Offer"
                      : isGeorgian
                      ? "ასლის შექმნა"
                      : "Duplicate Offer"}
                  </button>

                  {effectiveStatus === "expired" && (
                    <button
                      onClick={() => onArchiveExpired(offer)}
                      disabled={updatingOfferId !== null}
                      className="min-h-12 rounded-full bg-warning-soft px-5 py-3 font-semibold text-warning transition hover:bg-warning-soft disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingOfferId === offer.id
                        ? isGeorgian
                          ? "არქივდება..."
                          : "Archiving..."
                        : isGeorgian
                        ? "დაარქივება"
                        : "Archive"}
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(offer)}
                    disabled={updatingOfferId !== null}
                    className="min-h-12 rounded-full bg-danger-soft px-5 py-3 font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingOfferId === offer.id
                      ? isGeorgian
                        ? "იშლება..."
                        : "Deleting..."
                      : isGeorgian
                      ? "წაშლა"
                      : "Delete"}
                  </button>
                </div>
              </div>

              {analytics && (
                <div className="grid gap-3 rounded-2xl bg-well p-4 sm:grid-cols-2 xl:grid-cols-6">
                  {[
                    {
                      label: isGeorgian ? "ჯავშნები" : "Reservations",
                      value: analytics.reservations,
                    },
                    {
                      label: isGeorgian ? "დარჩენილი" : "Remaining",
                      value: analytics.remainingQuantity,
                    },
                    {
                      label: isGeorgian
                        ? "დასრულების მაჩვენებელი"
                        : "Completion rate",
                      value: `${analytics.completionRate}%`,
                    },
                    {
                      label: isGeorgian
                        ? "გაუქმების მაჩვენებელი"
                        : "Cancellation rate",
                      value: `${analytics.cancellationRate}%`,
                    },
                    {
                      label: isGeorgian ? "სავარ. შემოსავალი" : "Est. revenue",
                      value: formatAnalyticsMoney(analytics.estimatedRevenue),
                    },
                    {
                      label: isGeorgian ? "წარმატებული წაღება" : "Pickup success",
                      value: `${analytics.pickupSuccessRate}%`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-well p-4">
                      <p className="text-xs uppercase tracking-wide text-body">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-cream">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {intelligence && (
                <div className="grid gap-3 rounded-2xl bg-well p-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: isGeorgian ? "წაღების დრო" : "Pickup timing",
                        value: intelligence.timeUntilPickup,
                      },
                      {
                        label: isGeorgian ? "დაჯავშნილი" : "Reserved",
                        value: `${intelligence.reservationPercentage}%`,
                      },
                      {
                        label: isGeorgian
                          ? "გაყიდვის ალბათობა"
                          : "Sell-out chance",
                        value: `${intelligence.sellOutProbability}%`,
                      },
                      {
                        label: isGeorgian ? "სიჩქარე" : "Speed",
                        value: intelligence.reservationSpeed,
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-well p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-mint">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-cream">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    {intelligence.recommendations.map((recommendation) => (
                      <div
                        key={`${offer.id}-${recommendation.title}`}
                        className={`rounded-2xl p-4 ${recommendationToneStyles[recommendation.tone]}`}
                      >
                        <p className="font-semibold">{recommendation.title}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                          {recommendation.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="rounded-2xl bg-well p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={editTitle}
                      onChange={(event) => onEditTitleChange(event.target.value)}
                      maxLength={120}
                      className="premium-input p-4 font-semibold"
                      aria-label={
                        isGeorgian ? "შეთავაზების სათაური" : "Offer title"
                      }
                      placeholder={t("businessOnboarding.recommendedTitleValue")}
                    />

                    <select
                      value={editCategory || DEFAULT_OFFER_CATEGORY}
                      onChange={(event) =>
                        onEditCategoryChange(
                          normalizeOfferCategory(event.target.value)
                        )
                      }
                      required
                      aria-label={
                        isGeorgian ? "შეთავაზების კატეგორია" : "Offer category"
                      }
                      className="premium-input p-4 font-semibold"
                    >
                      {OFFER_CATEGORIES.map((offerCategory) => (
                        <option key={offerCategory} value={offerCategory}>
                          {isGeorgian
                            ? getOfferCategoryLabel(offerCategory, language)
                            : offerCategory}
                        </option>
                      ))}
                    </select>

                    <input
                      value={editPrice}
                      onChange={(event) => onEditPriceChange(event.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      className="premium-input p-4 font-semibold"
                      aria-label={isGeorgian ? "შეთავაზების ფასი" : "Offer price"}
                      placeholder="5.00"
                    />

                    <input
                      value={editOldPrice}
                      onChange={(event) =>
                        onEditOldPriceChange(event.target.value)
                      }
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      className="premium-input p-4 font-semibold"
                      aria-label={isGeorgian ? "საწყისი ფასი" : "Original price"}
                      placeholder="10.00"
                    />

                    <input
                      value={editQuantity}
                      onChange={(event) =>
                        onEditQuantityChange(event.target.value)
                      }
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className="premium-input p-4 font-semibold"
                      aria-label={t("common.quantity")}
                      placeholder="3"
                    />

                    <input
                      value={editPickupDate}
                      onChange={(event) =>
                        onEditPickupDateChange(event.target.value)
                      }
                      type="date"
                      className="premium-input p-4 font-semibold"
                      aria-label={t("offerDetail.pickupDate")}
                    />

                    <input
                      value={editPickupStart}
                      onChange={(event) =>
                        onEditPickupStartChange(event.target.value)
                      }
                      type="time"
                      className="premium-input p-4 font-semibold"
                      aria-label={isGeorgian ? "წაღების დაწყება" : "Pickup start"}
                    />

                    <input
                      value={editPickupEnd}
                      onChange={(event) =>
                        onEditPickupEndChange(event.target.value)
                      }
                      type="time"
                      className="premium-input p-4 font-semibold"
                      aria-label={isGeorgian ? "წაღების დასრულება" : "Pickup end"}
                    />
                  </div>

                  <button
                    onClick={() => onSaveEdits(offer)}
                    disabled={updatingOfferId !== null}
                    className="premium-button mt-4 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {updatingOfferId === offer.id
                      ? isGeorgian
                        ? "ინახება..."
                        : "Saving..."
                      : isGeorgian
                      ? "ცვლილებების შენახვა"
                      : "Save changes"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
