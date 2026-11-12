"use client";

import { RequiredMark } from "@/components/RequiredMark";
import {
  BAG_SIZES,
  OFFER_CATEGORIES,
  getBagSizeLabel,
  getOfferCategoryLabel,
  normalizeBagSize,
  normalizeOfferCategory,
  type BagSize,
  type OfferCategory,
} from "@/lib/offerCategories";
import type { TranslationKey } from "@/lib/i18n";
import { getTbilisiDateKey } from "@/lib/offerLifecycle";
import { getDepartmentDisplayName } from "@/lib/greenBag";
import type { Business, Department } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import type { ChangeEvent } from "react";
import { IMAGE_INPUT_ACCEPT } from "@/lib/business/prepareImage";


type OfferFormProps = {
  t: (key: TranslationKey) => string;
  canCreateOffers: boolean;
  businessStatusMessage: string;
  approvedBusinesses: Business[];
  businessId: string;
  departments: Department[];
  departmentId: string;
  onDepartmentIdChange: (value: string) => void;
  title: string;
  description: string;
  category: OfferCategory;
  size: BagSize;
  price: string;
  oldPrice: string;
  quantity: string;
  pickupDate: string;
  pickupStart: string;
  pickupEnd: string;
  imageFile: File | null;
  publishing: boolean;
  onBusinessIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: OfferCategory) => void;
  onSizeChange: (value: BagSize) => void;
  onPriceChange: (value: string) => void;
  onOldPriceChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onPickupDateChange: (value: string) => void;
  onPickupStartChange: (value: string) => void;
  onPickupEndChange: (value: string) => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Changes after each publish so the file input is cleared. */
  imageInputKey?: number;
  onCreateOffer: (actionTime: number) => void;
};

export function OfferForm({
  t,
  canCreateOffers,
  businessStatusMessage,
  approvedBusinesses,
  businessId,
  departments,
  departmentId,
  onDepartmentIdChange,
  title,
  description,
  category,
  size,
  price,
  oldPrice,
  quantity,
  pickupDate,
  pickupStart,
  pickupEnd,
  imageFile,
  publishing,
  onBusinessIdChange,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onSizeChange,
  onPriceChange,
  onOldPriceChange,
  onQuantityChange,
  onPickupDateChange,
  onPickupStartChange,
  onPickupEndChange,
  onImageFileChange,
  imageInputKey = 0,
  onCreateOffer,
}: OfferFormProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <div
      id="create-offer"
      className="cat-mixed mt-4 scroll-mt-24 rounded-[24px] bg-cat p-4 sm:p-6"
    >
      <h2 className="text-xl font-semibold sm:text-2xl">
        {isGeorgian ? "ერთჯერადი ლანჩ ბოქსი" : "One-off bag"}
      </h2>

      {canCreateOffers ? (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {approvedBusinesses.length > 1 && (
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
                <span>
                  {t("common.business")} <RequiredMark />
                </span>
                <select
                  value={businessId}
                  onChange={(event) => onBusinessIdChange(event.target.value)}
                  className="premium-input w-full min-w-0 p-4 font-semibold"
                >
                  {approvedBusinesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {departments.length > 1 && (
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
                <span>{isGeorgian ? "დეპარტამენტი" : "Department"}</span>
                <select
                  value={departmentId}
                  onChange={(event) => onDepartmentIdChange(event.target.value)}
                  className="premium-input w-full min-w-0 p-4 font-semibold"
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {getDepartmentDisplayName(department, language)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {isGeorgian ? "სათაური" : "Title"} <RequiredMark />
              </span>
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                maxLength={120}
                className="premium-input w-full min-w-0 p-4 font-semibold"
                placeholder={t("businessOnboarding.recommendedTitleValue")}
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body md:col-span-2">
              {isGeorgian ? "აღწერა" : "Description"}
              <textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                maxLength={500}
                className="premium-input min-h-28 w-full min-w-0 p-4 font-semibold"
                placeholder={
                  isGeorgian
                    ? "დღევანდელი დახურვისას დარჩენილი ახალი საცხობი პროდუქცია."
                    : "Fresh bakery items saved from today's closing stock."
                }
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {t("common.category")} <RequiredMark />
              </span>
              <select
                value={category}
                onChange={(event) =>
                  onCategoryChange(normalizeOfferCategory(event.target.value))
                }
                required
                className="premium-input w-full min-w-0 p-4 font-semibold"
              >
                {OFFER_CATEGORIES.map((offerCategory) => (
                  <option key={offerCategory} value={offerCategory}>
                    {isGeorgian
                      ? getOfferCategoryLabel(offerCategory, language)
                      : offerCategory}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {t("common.size")} <RequiredMark />
              </span>
              <select
                value={size}
                onChange={(event) =>
                  onSizeChange(normalizeBagSize(event.target.value) ?? "M")
                }
                required
                className="premium-input w-full min-w-0 p-4 font-semibold"
              >
                {BAG_SIZES.map((bagSize) => (
                  <option key={bagSize} value={bagSize}>
                    {bagSize} · {getBagSizeLabel(bagSize, language)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {t("common.price")} <RequiredMark />
              </span>
              <input
                value={price}
                onChange={(event) => onPriceChange(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="premium-input w-full min-w-0 p-4 font-semibold"
                placeholder="5.00"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              {isGeorgian ? "საწყისი ფასი" : "Original price"}
              <input
                value={oldPrice}
                onChange={(event) => onOldPriceChange(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="premium-input w-full min-w-0 p-4 font-semibold"
                placeholder="10.00"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {t("common.quantity")} <RequiredMark />
              </span>
              <input
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="premium-input w-full min-w-0 p-4 font-semibold"
                placeholder="3"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {t("offerDetail.pickupDate")} <RequiredMark />
              </span>
              <input
                value={pickupDate}
                onChange={(event) => onPickupDateChange(event.target.value)}
                type="date"
                min={getTbilisiDateKey()}
                className="premium-input w-full min-w-0 p-4 font-semibold"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {isGeorgian ? "წაღების დაწყება" : "Pickup start"} <RequiredMark />
              </span>
              <input
                value={pickupStart}
                onChange={(event) => onPickupStartChange(event.target.value)}
                type="time"
                className="premium-input w-full min-w-0 p-4 font-semibold"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body">
              <span>
                {isGeorgian ? "წაღების დასრულება" : "Pickup end"} <RequiredMark />
              </span>
              <input
                value={pickupEnd}
                onChange={(event) => onPickupEndChange(event.target.value)}
                type="time"
                className="premium-input w-full min-w-0 p-4 font-semibold"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-semibold text-body md:col-span-2">
              {isGeorgian ? "შეთავაზების სურათი" : "Offer image"}
              <input
                key={imageInputKey}
                type="file"
                accept={IMAGE_INPUT_ACCEPT}
                onChange={onImageFileChange}
              className="premium-input w-full min-w-0 p-4 font-semibold file:mr-4 file:rounded-full file:border-0 file:bg-page file:px-4 file:py-2 file:font-semibold file:text-cream focus-visible:ring-2 focus-visible:ring-mint"
            />
          </label>
          </div>

          {imageFile && (
            <p className="mt-4 rounded-2xl bg-well px-4 py-3 text-sm font-semibold text-cream">
              {t("businessDashboard.selectedImage")}: {imageFile.name}
            </p>
          )}

          <button
            onClick={(event) => onCreateOffer(event.timeStamp)}
            disabled={publishing}
            className="premium-button mt-6 w-full px-8 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-4"
          >
            {publishing
              ? t("businessDashboard.publishing")
              : t("businessDashboard.createOfferButton")}
          </button>
        </>
      ) : (
        <div className="mt-6 rounded-2xl bg-well p-5 font-semibold text-cream">
          {businessStatusMessage}
        </div>
      )}
    </div>
  );
}
