import OfferImage from "@/components/OfferImage";
import { formatAnalyticsMoney, type OfferAnalytics } from "@/lib/analytics";
import type { OfferIntelligence } from "@/lib/marketplaceIntelligence";
import {
  DEFAULT_OFFER_CATEGORY,
  OFFER_CATEGORIES,
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
  onEditPickupStartChange,
  onEditPickupEndChange,
}: OfferListProps) {
  const badgeToneStyles: Record<
    OfferIntelligence["badges"][number]["tone"],
    string
  > = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-900",
    red: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-700",
  };
  const recommendationToneStyles: Record<
    OfferIntelligence["recommendations"][number]["tone"],
    string
  > = {
    green: "bg-green-50 text-green-900",
    yellow: "bg-yellow-50 text-yellow-950",
    red: "bg-red-50 text-red-800",
  };

  return (
    <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Offer History
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {t("businessDashboard.myOffers")}
      </h2>

      <div className="mt-6 grid gap-4">
        {offers.length === 0 && (
          <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/60 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
              +
            </div>
            <h3 className="mt-4 text-2xl font-black text-gray-950">
              {emptyTitle || t("businessDashboard.noOffers")}
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
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
            <div key={offer.id} className="grid gap-5 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3 sm:gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24 sm:rounded-2xl">
                    <OfferImage src={offer.image_url} alt={offer.title} sizes="96px" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black">{offer.title}</h3>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                        {normalizeOfferCategory(offer.category)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <p className="font-medium text-gray-700">
                      {formatMoney(offer.price)} · Quantity: {offer.quantity}
                    </p>
                    <p className="text-gray-600">
                      {t("common.pickup")}: {formatPickupWindow(offer, language)}
                    </p>
                    <p className="text-sm font-bold text-yellow-700">
                      ⭐ {getRatingLabel(rating, language)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-gray-500">
                      {t("businessDashboard.created")}:{" "}
                      {formatDisplayDateTime(offer.created_at, language)}
                    </p>
                    {intelligence && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {intelligence.badges.map((badge) => (
                          <span
                            key={badge.label}
                            className={`rounded-full px-3 py-1 text-xs font-black ${badgeToneStyles[badge.tone]}`}
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
                    className="min-h-12 rounded-full border border-green-200 bg-green-50 px-5 py-3 font-black text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>

                  <button
                    onClick={() => onToggleActive(offer)}
                    disabled={updatingOfferId !== null}
                    aria-label={`Toggle ${offer.title} active status`}
                    className={`min-h-12 rounded-full px-5 py-3 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      offer.active
                        ? "bg-green-700 hover:bg-green-800"
                        : "bg-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    {updatingOfferId === offer.id
                      ? "Updating..."
                      : offer.active
                      ? "Deactivate"
                      : "Reactivate"}
                  </button>

                  <button
                    onClick={() => onDuplicate(offer)}
                    disabled={updatingOfferId !== null}
                    className="min-h-12 rounded-full border border-green-200 bg-white px-5 py-3 font-black text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingOfferId === offer.id
                      ? "Working..."
                      : effectiveStatus === "expired"
                      ? "Create Similar Offer"
                      : "Duplicate Offer"}
                  </button>

                  {effectiveStatus === "expired" && (
                    <button
                      onClick={() => onArchiveExpired(offer)}
                      disabled={updatingOfferId !== null}
                      className="min-h-12 rounded-full bg-yellow-500 px-5 py-3 font-black text-yellow-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingOfferId === offer.id ? "Archiving..." : "Archive"}
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(offer)}
                    disabled={updatingOfferId !== null}
                    className="min-h-12 rounded-full bg-gray-950 px-5 py-3 font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingOfferId === offer.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {analytics && (
                <div className="grid gap-3 rounded-2xl bg-[#F7F6EF] p-4 sm:grid-cols-2 xl:grid-cols-6">
                  {[
                    {
                      label: "Reservations",
                      value: analytics.reservations,
                    },
                    {
                      label: "Remaining",
                      value: analytics.remainingQuantity,
                    },
                    {
                      label: "Completion rate",
                      value: `${analytics.completionRate}%`,
                    },
                    {
                      label: "Cancellation rate",
                      value: `${analytics.cancellationRate}%`,
                    },
                    {
                      label: "Est. revenue",
                      value: formatAnalyticsMoney(analytics.estimatedRevenue),
                    },
                    {
                      label: "Pickup success",
                      value: `${analytics.pickupSuccessRate}%`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-black text-gray-950">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {intelligence && (
                <div className="grid gap-3 rounded-2xl bg-green-50 p-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Pickup timing",
                        value: intelligence.timeUntilPickup,
                      },
                      {
                        label: "Reserved",
                        value: `${intelligence.reservationPercentage}%`,
                      },
                      {
                        label: "Sell-out chance",
                        value: `${intelligence.sellOutProbability}%`,
                      },
                      {
                        label: "Speed",
                        value: intelligence.reservationSpeed,
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-green-700">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-black text-gray-950">
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
                        <p className="font-black">{recommendation.title}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                          {recommendation.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="rounded-2xl bg-[#F7F6EF] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={editTitle}
                      onChange={(event) => onEditTitleChange(event.target.value)}
                      maxLength={120}
                      className="rounded-2xl border bg-white p-4 font-semibold"
                      aria-label="Offer title"
                      placeholder="Bakery Surprise Bag"
                    />

                    <select
                      value={editCategory || DEFAULT_OFFER_CATEGORY}
                      onChange={(event) =>
                        onEditCategoryChange(
                          normalizeOfferCategory(event.target.value)
                        )
                      }
                      required
                      aria-label="Offer category"
                      className="min-h-12 rounded-2xl border bg-white p-4 font-semibold"
                    >
                      {OFFER_CATEGORIES.map((offerCategory) => (
                        <option key={offerCategory} value={offerCategory}>
                          {offerCategory}
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
                      className="rounded-2xl border bg-white p-4 font-semibold"
                      aria-label="Offer price"
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
                      className="rounded-2xl border bg-white p-4 font-semibold"
                      aria-label="Original price"
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
                      className="rounded-2xl border bg-white p-4 font-semibold"
                      aria-label="Quantity"
                      placeholder="3"
                    />

                    <input
                      value={editPickupStart}
                      onChange={(event) =>
                        onEditPickupStartChange(event.target.value)
                      }
                      type="time"
                      className="rounded-2xl border bg-white p-4 font-semibold"
                      aria-label="Pickup start"
                    />

                    <input
                      value={editPickupEnd}
                      onChange={(event) =>
                        onEditPickupEndChange(event.target.value)
                      }
                      type="time"
                      className="rounded-2xl border bg-white p-4 font-semibold"
                      aria-label="Pickup end"
                    />
                  </div>

                  <button
                    onClick={() => onSaveEdits(offer)}
                    disabled={updatingOfferId !== null}
                    className="premium-button mt-4 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {updatingOfferId === offer.id ? "Saving..." : "Save changes"}
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
