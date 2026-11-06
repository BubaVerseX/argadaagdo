import OfferImage from "@/components/OfferImage";
import { PlusIcon } from "@/components/icons";
import { formatAnalyticsMoney, type OfferAnalytics } from "@/lib/analytics";
import {
  BAG_SIZES,
  DEFAULT_OFFER_CATEGORY,
  OFFER_CATEGORIES,
  getBagSizeLabel,
  getGreenBagLabel,
  getOfferCategoryLabel,
  normalizeBagSize,
  normalizeOfferCategory,
  type BagSize,
  type OfferCategory,
  getOfferCategoryTone,
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
  ratingSummaries: Record<number, RatingSummary>;
  offerAnalyticsById?: Record<number, OfferAnalytics>;
  editingOfferId: number | null;
  updatingOfferId: number | null;
  editTitle: string;
  editCategory: OfferCategory;
  editSize: BagSize;
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
  onEditSizeChange: (value: BagSize) => void;
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
  ratingSummaries,
  offerAnalyticsById = {},
  editingOfferId,
  updatingOfferId,
  editTitle,
  editCategory,
  editSize,
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
  onEditSizeChange,
  onEditPriceChange,
  onEditOldPriceChange,
  onEditQuantityChange,
  onEditPickupDateChange,
  onEditPickupStartChange,
  onEditPickupEndChange,
}: OfferListProps) {
  const isGeorgian = language === "ka";


  return (
    <div className="mt-4">
      <div className="grid gap-3">
        {offers.length === 0 && (
          <p className="ui-card flex items-center gap-3 rounded-2xl p-4 font-semibold text-body">
            <PlusIcon className="h-5 w-5 shrink-0 text-mint" strokeWidth={1.8} />
            {emptyTitle || (isGeorgian ? "შეთავაზებები ჯერ არ არის" : "No offers yet")}
          </p>
        )}

        {offers.map((offer) => {
          const statusLabel = getOfferStatusLabel(offer, language);
          const statusClass = getOfferStatusClassName(offer);
          const rating = ratingSummaries[offer.business_id];
          const analytics = offerAnalyticsById[offer.id];
          const isEditing = editingOfferId === offer.id;
          const effectiveStatus = getEffectiveOfferStatus(offer);

          return (
            <div
              key={offer.id}
              className={`${getOfferCategoryTone(offer.category)} grid gap-3 rounded-[20px] bg-cat p-4`}
            >
              <div className="flex gap-3">
                <div className="photo-leaf-sm relative isolate h-14 w-14 shrink-0">
                  <OfferImage src={offer.image_url} alt={offer.title} sizes="56px" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate font-serif text-lg font-bold">{offer.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="truncate text-sm text-body">
                    {formatMoney(offer.price)} ·{" "}
                    {offer.unlimited_quantity
                      ? isGeorgian
                        ? "სანამ არ გაჩერდება"
                        : "until stopped"
                      : `${offer.quantity} ${isGeorgian ? "ც" : "left"}`}{" "}
                    · {formatPickupWindow(offer, language)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-2">
                <button
                  type="button"
                  onClick={() =>
                    isEditing ? onCancelEditing() : onStartEditing(offer)
                  }
                  disabled={
                    updatingOfferId !== null && updatingOfferId !== offer.id
                  }
                  className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEditing
                    ? t("common.cancel")
                    : isGeorgian
                    ? "რედაქტირება"
                    : "Edit"}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleActive(offer)}
                  disabled={updatingOfferId !== null}
                  aria-label={
                    isGeorgian
                      ? `აქტიური სტატუსის გადართვა: ${offer.title}`
                      : `Toggle ${offer.title} active status`
                  }
                  className="min-h-11 rounded-full bg-well px-4 py-2 text-sm font-semibold text-mint transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingOfferId === offer.id
                    ? isGeorgian
                      ? "ახლდება..."
                      : "Updating..."
                    : offer.active
                    ? isGeorgian
                      ? "დამალვა"
                      : "Hide"
                    : isGeorgian
                    ? "ჩართვა"
                    : "Show"}
                </button>

                <details className="group">
                  <summary
                    aria-label={isGeorgian ? "მეტი" : "More"}
                    className="premium-button-secondary flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center px-3 text-sm [&::-webkit-details-marker]:hidden"
                  >
                    ⋯
                  </summary>
                  <div className="mt-2 grid gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onDuplicate(offer)}
                        disabled={updatingOfferId !== null}
                        className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGeorgian ? "ასლი" : "Duplicate"}
                      </button>

                      {effectiveStatus === "expired" && (
                        <button
                          type="button"
                          onClick={() => onArchiveExpired(offer)}
                          disabled={updatingOfferId !== null}
                          className="min-h-11 rounded-full bg-warning-soft px-4 py-2 text-sm font-semibold text-warning transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isGeorgian ? "არქივი" : "Archive"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDelete(offer)}
                        disabled={updatingOfferId !== null}
                        className="min-h-11 rounded-full bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGeorgian ? "წაშლა" : "Delete"}
                      </button>
                    </div>

                    <dl className="grid gap-1 rounded-2xl bg-well p-3 text-sm">
                      {[
                        { label: isGeorgian ? "ზომა" : "Bag", value: getGreenBagLabel(offer, language) },
                        { label: isGeorgian ? "შეფასება" : "Rating", value: getRatingLabel(rating, language) },
                        ...(analytics
                          ? [
                              { label: isGeorgian ? "ჯავშნები" : "Reservations", value: String(analytics.reservations) },
                              { label: isGeorgian ? "გაცემული" : "Pickup success", value: `${analytics.pickupSuccessRate}%` },
                              { label: isGeorgian ? "გაუქმებული" : "Cancelled", value: `${analytics.cancellationRate}%` },
                              { label: isGeorgian ? "შემოსავალი" : "Revenue", value: formatAnalyticsMoney(analytics.estimatedRevenue) },
                            ]
                          : []),
                        {
                          label: isGeorgian ? "შექმნილია" : "Created",
                          value: formatDisplayDateTime(offer.created_at, language),
                        },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between gap-3">
                          <dt className="text-body">{row.label}</dt>
                          <dd className="min-w-0 truncate text-right font-semibold text-cream">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </details>
              </div>
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

                    <select
                      value={editSize}
                      onChange={(event) =>
                        onEditSizeChange(normalizeBagSize(event.target.value) ?? "M")
                      }
                      required
                      aria-label={t("common.size")}
                      className="premium-input p-4 font-semibold"
                    >
                      {BAG_SIZES.map((bagSize) => (
                        <option key={bagSize} value={bagSize}>
                          {bagSize} · {getBagSizeLabel(bagSize, language)}
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
