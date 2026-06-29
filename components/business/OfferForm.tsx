import { RequiredMark } from "@/components/RequiredMark";
import {
  OFFER_CATEGORIES,
  normalizeOfferCategory,
  type OfferCategory,
} from "@/lib/offerCategories";
import type { TranslationKey } from "@/lib/i18n";
import { getTbilisiDateKey } from "@/lib/offerLifecycle";
import type { Business } from "@/lib/types";
import type { ChangeEvent } from "react";

type GuidanceItem = {
  label: string;
  value: string;
};

type OfferFormProps = {
  t: (key: TranslationKey) => string;
  canCreateOffers: boolean;
  businessStatusMessage: string;
  approvedBusinesses: Business[];
  businessId: string;
  title: string;
  description: string;
  category: OfferCategory;
  price: string;
  oldPrice: string;
  quantity: string;
  pickupDate: string;
  pickupStart: string;
  pickupEnd: string;
  imageFile: File | null;
  publishing: boolean;
  guidance: GuidanceItem[];
  onBusinessIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: OfferCategory) => void;
  onPriceChange: (value: string) => void;
  onOldPriceChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onPickupDateChange: (value: string) => void;
  onPickupStartChange: (value: string) => void;
  onPickupEndChange: (value: string) => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCreateOffer: (actionTime: number) => void;
};

export function OfferForm({
  t,
  canCreateOffers,
  businessStatusMessage,
  approvedBusinesses,
  businessId,
  title,
  description,
  category,
  price,
  oldPrice,
  quantity,
  pickupDate,
  pickupStart,
  pickupEnd,
  imageFile,
  publishing,
  guidance,
  onBusinessIdChange,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onPriceChange,
  onOldPriceChange,
  onQuantityChange,
  onPickupDateChange,
  onPickupStartChange,
  onPickupEndChange,
  onImageFileChange,
  onCreateOffer,
}: OfferFormProps) {
  return (
    <div
      id="create-offer"
      className="mt-6 scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8"
    >
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Offer Management
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {t("businessDashboard.createOffer")}
      </h2>

      {canCreateOffers ? (
        <>
          <div className="mt-5 rounded-2xl bg-green-50 p-4 sm:p-5">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("businessOnboarding.firstOfferGuidanceTitle")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guidance.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full bg-white px-4 py-2 text-sm font-black text-green-900"
                >
                  ✓ {item.label}: {item.value}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Business <RequiredMark />
              </span>
              <select
                value={businessId}
                onChange={(event) => onBusinessIdChange(event.target.value)}
                className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              >
                {approvedBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Title <RequiredMark />
              </span>
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                maxLength={120}
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                placeholder="Bakery Surprise Bag"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700 md:col-span-2">
              Description
              <textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                maxLength={500}
                className="min-h-28 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                placeholder="Fresh bakery items saved from today's closing stock."
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Category <RequiredMark />
              </span>
              <select
                value={category}
                onChange={(event) =>
                  onCategoryChange(normalizeOfferCategory(event.target.value))
                }
                required
                className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              >
                {OFFER_CATEGORIES.map((offerCategory) => (
                  <option key={offerCategory} value={offerCategory}>
                    {offerCategory}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Price <RequiredMark />
              </span>
              <input
                value={price}
                onChange={(event) => onPriceChange(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                placeholder="5.00"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              Original price
              <input
                value={oldPrice}
                onChange={(event) => onOldPriceChange(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                placeholder="10.00"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Quantity <RequiredMark />
              </span>
              <input
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                placeholder="3"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Pickup date <RequiredMark />
              </span>
              <input
                value={pickupDate}
                onChange={(event) => onPickupDateChange(event.target.value)}
                type="date"
                min={getTbilisiDateKey()}
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Pickup start <RequiredMark />
              </span>
              <input
                value={pickupStart}
                onChange={(event) => onPickupStartChange(event.target.value)}
                type="time"
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700">
              <span>
                Pickup end <RequiredMark />
              </span>
              <input
                value={pickupEnd}
                onChange={(event) => onPickupEndChange(event.target.value)}
                type="time"
                className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-gray-700 md:col-span-2">
              Offer image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={onImageFileChange}
                className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 file:mr-4 file:rounded-full file:border-0 file:bg-green-50 file:px-4 file:py-2 file:font-black file:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {[
              t("businessOnboarding.titleHelper"),
              t("businessOnboarding.quantityHelper"),
              t("businessOnboarding.pickupWindowHelper"),
            ].map((helper) => (
              <p
                key={helper}
                className="rounded-2xl bg-[#F7F6EF] px-4 py-3 text-sm font-semibold leading-6 text-gray-700"
              >
                ✓ {helper}
              </p>
            ))}
          </div>

          <p className="mt-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold leading-6 text-yellow-900">
            {t("businessOnboarding.offerValidationHint")}
          </p>

          {imageFile && (
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
              {t("businessDashboard.selectedImage")}: {imageFile.name}
            </p>
          )}

          <button
            onClick={(event) => onCreateOffer(event.timeStamp)}
            disabled={publishing}
            className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-4"
          >
            {publishing
              ? t("businessDashboard.publishing")
              : t("businessDashboard.createOfferButton")}
          </button>
        </>
      ) : (
        <div className="mt-6 rounded-2xl bg-yellow-50 p-5 font-bold text-yellow-800">
          {businessStatusMessage}
        </div>
      )}
    </div>
  );
}
