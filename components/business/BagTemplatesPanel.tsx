"use client";

import { RequiredMark } from "@/components/RequiredMark";
import type { Language } from "@/lib/i18n";
import {
  ISO_WEEKDAYS,
  formatWeekdays,
  getDepartmentDisplayName,
  getWeekdayLabel,
} from "@/lib/greenBag";
import {
  BAG_SIZES,
  OFFER_CATEGORIES,
  getBagSizeLabel,
  getGreenBagLabel,
  getOfferCategoryLabel,
  normalizeBagSize,
  normalizeOfferCategory,
  type BagSize,
  type OfferCategory,
} from "@/lib/offerCategories";
import { formatMoney } from "@/lib/offerLifecycle";
import type { BagTemplate, Business, Department } from "@/lib/types";
import { IMAGE_INPUT_ACCEPT, type ImageUploadResult } from "@/lib/business/prepareImage";
import { translateUserMessage } from "@/lib/messageTranslations";
import { useState, type ChangeEvent } from "react";

export type BagTemplateInput = {
  business_id: number;
  department_id: number | null;
  title: string;
  description: string | null;
  category: OfferCategory;
  size: BagSize;
  price: number;
  old_price: number | null;
  daily_quantity: number | null;
  pickup_start: string;
  pickup_end: string;
  days_of_week: number[];
  publish_time: string;
  publish_days_before: number;
  image_url: string | null;
};

type BagTemplatesPanelProps = {
  language: Language;
  business: Business;
  departments: Department[];
  templates: BagTemplate[];
  busyTemplateId: number | null;
  onSave: (input: BagTemplateInput, templateId: number | null) => Promise<boolean>;
  onToggleActive: (template: BagTemplate) => void;
  onDelete: (template: BagTemplate) => void;
  onPublishNow: (template: BagTemplate, day: "today" | "tomorrow") => void;
  onUploadImage: (file: File) => Promise<ImageUploadResult>;
};

type FormState = {
  departmentId: string;
  title: string;
  description: string;
  category: OfferCategory;
  size: BagSize;
  price: string;
  oldPrice: string;
  quantityMode: "fixed" | "unlimited";
  dailyQuantity: string;
  pickupStart: string;
  pickupEnd: string;
  days: number[];
  publishTime: string;
  publishDaysBefore: 0 | 1;
  imageUrl: string;
};

function defaultTitle(size: BagSize, language: Language) {
  return language === "ka" ? `ლანჩ ბოქსი ${size}` : `Lunch Box ${size}`;
}

function emptyForm(departments: Department[], language: Language): FormState {
  const defaultDepartment = departments.find((d) => d.is_default) || departments[0];
  return {
    departmentId: defaultDepartment ? String(defaultDepartment.id) : "",
    title: defaultTitle("M", language),
    description: "",
    category: "Bakery",
    size: "M",
    price: "",
    oldPrice: "",
    quantityMode: "fixed",
    dailyQuantity: "5",
    pickupStart: "19:00",
    pickupEnd: "21:00",
    days: [...ISO_WEEKDAYS],
    publishTime: "12:00",
    publishDaysBefore: 0,
    imageUrl: "",
  };
}

function formFromTemplate(template: BagTemplate): FormState {
  return {
    departmentId: template.department_id ? String(template.department_id) : "",
    title: template.title,
    description: template.description || "",
    category: normalizeOfferCategory(template.category),
    size: normalizeBagSize(template.size) ?? "M",
    price: String(template.price ?? ""),
    oldPrice: template.old_price ? String(template.old_price) : "",
    quantityMode: template.daily_quantity === null ? "unlimited" : "fixed",
    dailyQuantity: template.daily_quantity ? String(template.daily_quantity) : "5",
    pickupStart: template.pickup_start.slice(0, 5),
    pickupEnd: template.pickup_end.slice(0, 5),
    days: template.days_of_week?.length ? [...template.days_of_week] : [...ISO_WEEKDAYS],
    publishTime: (template.publish_time || "12:00").slice(0, 5),
    publishDaysBefore: template.publish_days_before === 1 ? 1 : 0,
    imageUrl: template.image_url || "",
  };
}

/** "Same day 12:00" / "Day before 19:00" (Tbilisi time). */
export function formatPublishSchedule(
  template: Pick<BagTemplate, "publish_time" | "publish_days_before">,
  language: Language
) {
  const time = (template.publish_time || "12:00").slice(0, 5);
  const dayBefore = template.publish_days_before === 1;
  if (language === "ka") {
    return dayBefore ? `ქვეყნდება წინა დღეს ${time}-ზე` : `ქვეყნდება იმავე დღეს ${time}-ზე`;
  }
  return dayBefore ? `goes live the day before at ${time}` : `goes live the same day at ${time}`;
}

function minutesOf(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function BagTemplatesPanel({
  language,
  business,
  departments,
  templates,
  busyTemplateId,
  onSave,
  onToggleActive,
  onDelete,
  onPublishNow,
  onUploadImage,
}: BagTemplatesPanelProps) {
  const isGeorgian = language === "ka";
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(departments, language));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const showDepartmentSelect = departments.length > 1;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(departments, language));
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(template: BagTemplate) {
    setEditingId(template.id);
    setForm(formFromTemplate(template));
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError("");
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageError("");
    setUploading(true);
    const result = await onUploadImage(file);
    setUploading(false);
    if (result.url) update("imageUrl", result.url);
    else setImageError(translateUserMessage(result.error ?? "", language));
    setImageInputKey((key) => key + 1);
  }

  async function submit() {
    setFormError("");
    const title = form.title.trim();
    const price = Number(form.price);
    const oldPrice = form.oldPrice ? Number(form.oldPrice) : null;
    const dailyQuantity =
      form.quantityMode === "unlimited" ? null : Number(form.dailyQuantity);

    if (title.length < 3) {
      setFormError(isGeorgian ? "დაამატე სათაური (მინ. 3 სიმბოლო)." : "Add a title (at least 3 characters).");
      return;
    }
    // Price 0 is allowed only for the App Review demo business (same rule as
    // offers, enforced again by the database).
    if (!Number.isFinite(price) || price < 0 || (price === 0 && !business.is_review_demo)) {
      setFormError(isGeorgian ? "მიუთითე ფასი 0-ზე მეტი." : "Add a price greater than 0.");
      return;
    }
    if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price)) {
      setFormError(
        isGeorgian
          ? "საწყისი ფასი ფასდაკლებულ ფასზე მეტი უნდა იყოს, ან დატოვე ცარიელი."
          : "The original price must be higher than the box price, or leave it empty."
      );
      return;
    }
    if (dailyQuantity !== null && (!Number.isInteger(dailyQuantity) || dailyQuantity < 1 || dailyQuantity > 500)) {
      setFormError(isGeorgian ? "ლანჩ ბოქსების რაოდენობა 1-დან 500-მდე უნდა იყოს." : "Boxes per day must be between 1 and 500.");
      return;
    }
    if (!form.pickupStart || !form.pickupEnd || form.pickupStart >= form.pickupEnd) {
      setFormError(isGeorgian ? "წაღების დასრულება დაწყების შემდეგ უნდა იყოს." : "Pickup end must be after pickup start.");
      return;
    }
    if (form.days.length === 0) {
      setFormError(isGeorgian ? "აირჩიე ერთი დღე მაინც." : "Choose at least one day of the week.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(form.publishTime)) {
      setFormError(isGeorgian ? "მიუთითე გამოქვეყნების დრო." : "Add a publish time.");
      return;
    }
    if (form.publishDaysBefore === 0 && form.publishTime >= form.pickupEnd) {
      setFormError(
        isGeorgian
          ? "იმავე დღეს გამოქვეყნება წაღების დასრულებამდე უნდა მოხდეს."
          : "On the same day, the box must go live before pickup ends."
      );
      return;
    }

    setSaving(true);
    const ok = await onSave(
      {
        business_id: business.id,
        department_id: form.departmentId ? Number(form.departmentId) : null,
        title,
        description: form.description.trim() || null,
        category: form.category,
        size: form.size,
        price,
        old_price: oldPrice,
        daily_quantity: dailyQuantity,
        pickup_start: form.pickupStart,
        pickup_end: form.pickupEnd,
        days_of_week: [...form.days].sort((a, b) => a - b),
        publish_time: form.publishTime,
        publish_days_before: form.publishDaysBefore,
        image_url: form.imageUrl.trim() || null,
      },
      editingId
    );
    setSaving(false);
    if (ok) closeForm();
  }

  const inputClass = "premium-input w-full min-w-0 p-3 font-semibold";
  const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-body";

  return (
    <div id="bag-templates" className="premium-card mt-4 scroll-mt-24 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {isGeorgian ? "შაბლონები" : "Templates"}
          </h2>
          <p className="mt-1 text-sm text-body">
            {isGeorgian
              ? "თითო შაბლონი თავისი განრიგით ქვეყნდება"
              : "Each template goes live on its own schedule"}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="premium-button min-h-11 shrink-0 px-4 py-2.5"
        >
          {isGeorgian ? "+ ახალი" : "+ New"}
        </button>
      </div>

      {formOpen && (
        <div className="premium-muted-card mt-6 rounded-3xl p-4 sm:p-6">
          <h3 className="text-xl font-semibold">
            {editingId
              ? isGeorgian
                ? "შაბლონის რედაქტირება"
                : "Edit template"
              : isGeorgian
              ? "ახალი შაბლონი"
              : "New template"}
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {showDepartmentSelect && (
              <label className={labelClass}>
                <span>{isGeorgian ? "დეპარტამენტი" : "Department"} <RequiredMark /></span>
                <select
                  value={form.departmentId}
                  onChange={(event) => update("departmentId", event.target.value)}
                  className={inputClass}
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {getDepartmentDisplayName(department, language)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className={labelClass}>
              <span>{isGeorgian ? "სათაური" : "Title"} <RequiredMark /></span>
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              <span>{isGeorgian ? "კატეგორია" : "Category"} <RequiredMark /></span>
              <select
                value={form.category}
                onChange={(event) => update("category", normalizeOfferCategory(event.target.value))}
                className={inputClass}
              >
                {OFFER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {getOfferCategoryLabel(category, language)}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>{isGeorgian ? "ზომა" : "Size"} <RequiredMark /></span>
              <select
                value={form.size}
                onChange={(event) => {
                  const size = normalizeBagSize(event.target.value) ?? "M";
                  setForm((current) => ({
                    ...current,
                    size,
                    title:
                      current.title === defaultTitle(current.size, language)
                        ? defaultTitle(size, language)
                        : current.title,
                  }));
                }}
                className={inputClass}
              >
                {BAG_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} · {getBagSizeLabel(size, language)}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>{isGeorgian ? "ფასი (₾)" : "Price (₾)"} <RequiredMark /></span>
              <input
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className={inputClass}
                placeholder="9.00"
              />
            </label>

            <label className={labelClass}>
              {isGeorgian ? "საწყისი ფასი (₾)" : "Original price (₾)"}
              <input
                value={form.oldPrice}
                onChange={(event) => update("oldPrice", event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className={inputClass}
                placeholder="25.00"
              />
            </label>

            <div className={`${labelClass} md:col-span-2`}>
              <span>{isGeorgian ? "ლანჩ ბოქსები დღეში" : "Boxes per day"} <RequiredMark /></span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => update("quantityMode", "fixed")}
                  aria-pressed={form.quantityMode === "fixed"}
                  className={`${
                    form.quantityMode === "fixed" ? "premium-button" : "premium-button-secondary"
                  } min-h-11 px-4 py-2 text-sm`}
                >
                  {isGeorgian ? "ფიქსირებული რაოდენობა" : "Fixed number"}
                </button>
                <button
                  type="button"
                  onClick={() => update("quantityMode", "unlimited")}
                  aria-pressed={form.quantityMode === "unlimited"}
                  className={`${
                    form.quantityMode === "unlimited" ? "premium-button" : "premium-button-secondary"
                  } min-h-11 px-4 py-2 text-sm`}
                >
                  {isGeorgian ? "სანამ არ გავაჩერებ" : "Until stopped"}
                </button>
                {form.quantityMode === "fixed" && (
                  <input
                    value={form.dailyQuantity}
                    onChange={(event) => update("dailyQuantity", event.target.value)}
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    inputMode="numeric"
                    aria-label={isGeorgian ? "ლანჩ ბოქსები დღეში" : "Boxes per day"}
                    className="premium-input w-28 p-3 font-semibold"
                  />
                )}
              </div>
            </div>

            <label className={labelClass}>
              <span>{isGeorgian ? "წაღების დაწყება" : "Pickup start"} <RequiredMark /></span>
              <input
                value={form.pickupStart}
                onChange={(event) => update("pickupStart", event.target.value)}
                type="time"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              <span>{isGeorgian ? "წაღების დასრულება" : "Pickup end"} <RequiredMark /></span>
              <input
                value={form.pickupEnd}
                onChange={(event) => update("pickupEnd", event.target.value)}
                type="time"
                className={inputClass}
              />
            </label>

            <div className={`${labelClass} md:col-span-2`}>
              <span>{isGeorgian ? "კვირის დღეები" : "Days of the week"} <RequiredMark /></span>
              <div className="flex flex-wrap gap-2">
                {ISO_WEEKDAYS.map((day) => {
                  const selected = form.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update(
                          "days",
                          selected ? form.days.filter((d) => d !== day) : [...form.days, day]
                        )
                      }
                      className={`${
                        selected ? "premium-button" : "premium-button-secondary"
                      } min-h-11 min-w-12 px-3 py-2 text-sm`}
                    >
                      {getWeekdayLabel(day, language)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`${labelClass} md:col-span-2`}>
              <span>{isGeorgian ? "გამოქვეყნება" : "Goes live"} <RequiredMark /></span>
              <div className="flex flex-wrap items-center gap-2">
                {([0, 1] as const).map((daysBefore) => (
                  <button
                    key={daysBefore}
                    type="button"
                    aria-pressed={form.publishDaysBefore === daysBefore}
                    onClick={() => update("publishDaysBefore", daysBefore)}
                    className={`${
                      form.publishDaysBefore === daysBefore ? "premium-button" : "premium-button-secondary"
                    } min-h-11 px-4 py-2 text-sm`}
                  >
                    {daysBefore === 0
                      ? isGeorgian
                        ? "იმავე დღეს"
                        : "Same day"
                      : isGeorgian
                      ? "წინა დღეს"
                      : "Day before"}
                  </button>
                ))}
                <input
                  value={form.publishTime}
                  onChange={(event) => update("publishTime", event.target.value)}
                  type="time"
                  aria-label={isGeorgian ? "გამოქვეყნების დრო" : "Publish time"}
                  className="premium-input w-40 p-3 font-semibold"
                />
              </div>
              <span className="text-xs font-normal text-body">
                {isGeorgian
                  ? "მომხმარებელს გაუქმება შეუძლია წაღებამდე 2 საათით ადრე. ამის შემდეგ ნაყიდი ბოქსი აღარ უქმდება."
                  : "Customers can cancel until 2 h before pickup starts. Boxes bought after that can't be cancelled."}
                {form.publishDaysBefore === 0 &&
                  form.pickupStart &&
                  /^\d{2}:\d{2}$/.test(form.publishTime) &&
                  minutesOf(form.pickupStart) - minutesOf(form.publishTime) < 120 &&
                  (isGeorgian
                    ? " ამ განრიგით ყველა ჯავშანი გაუქმების გარეშე იქნება."
                    : " With this schedule, no order can be cancelled.")}
              </span>
            </div>

            <label className={`${labelClass} md:col-span-2`}>
              {isGeorgian ? "აღწერა" : "Description"}
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                maxLength={500}
                className={`${inputClass} min-h-24`}
                placeholder={
                  isGeorgian
                    ? "დღის ბოლოს დარჩენილი ახალი პროდუქცია."
                    : "Fresh items left at the end of the day."
                }
              />
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              {isGeorgian ? "სურათი" : "Image"}
              <input
                key={imageInputKey}
                type="file"
                accept={IMAGE_INPUT_ACCEPT}
                onChange={(event) => void handleImage(event)}
                disabled={uploading}
                className="premium-input w-full min-w-0 p-3 font-semibold file:mr-4 file:rounded-full file:border-0 file:bg-page file:px-4 file:py-2 file:font-semibold file:text-cream"
              />
              {imageError && !uploading && (
                <span role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                  {imageError}
                </span>
              )}
              {uploading && (
                <span className="text-xs text-body">
                  {isGeorgian ? "იტვირთება..." : "Uploading..."}
                </span>
              )}
              {form.imageUrl && !uploading && (
                <span className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <span className="text-xs text-mint">
                    {isGeorgian ? "სურათი დამატებულია" : "Image attached"}
                  </span>
                </span>
              )}
            </label>
          </div>

          {formError && (
            <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {formError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving || uploading}
              className="premium-button min-h-11 px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? isGeorgian
                  ? "ინახება..."
                  : "Saving..."
                : editingId
                ? isGeorgian
                  ? "ცვლილებების შენახვა"
                  : "Save changes"
                : isGeorgian
                ? "შაბლონის შენახვა"
                : "Save template"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="premium-button-secondary min-h-11 px-5 py-2.5"
            >
              {isGeorgian ? "გაუქმება" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {templates.length === 0 && !formOpen && (
          <div className="ui-card rounded-2xl p-4 text-center text-sm font-semibold text-body">
            {isGeorgian ? "შაბლონები ჯერ არ არის" : "No templates yet"}
          </div>
        )}

        {templates.map((template) => {
          const busy = busyTemplateId === template.id;
          const department = template.department_id
            ? departmentById.get(template.department_id)
            : null;

          return (
            <div
              key={template.id}
              className="ui-card grid gap-4 rounded-2xl p-4 md:grid-cols-[1fr_auto] md:items-start"
            >
              <div className="flex min-w-0 gap-3">
                {template.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-cream">{template.title}</p>
                  <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold text-mint">
                    {getGreenBagLabel(template, language)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      template.active ? "bg-well text-mint" : "bg-well text-body"
                    }`}
                  >
                    {template.active
                      ? isGeorgian
                        ? "აქტიური"
                        : "Active"
                      : isGeorgian
                      ? "გაჩერებული"
                      : "Paused"}
                  </span>
                  {showDepartmentSelect && (
                    <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold text-body">
                      {getDepartmentDisplayName(department, language)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-body">
                  {formatMoney(template.price)}
                  {template.old_price ? ` (${formatMoney(template.old_price)})` : ""} ·{" "}
                  {template.daily_quantity === null
                    ? isGeorgian
                      ? "სანამ არ გავაჩერებ"
                      : "until stopped"
                    : isGeorgian
                    ? `${template.daily_quantity} ლანჩ ბოქსი დღეში`
                    : template.daily_quantity === 1
                    ? "1 box per day"
                    : `${template.daily_quantity} boxes per day`}{" "}
                  · {template.pickup_start.slice(0, 5)}–{template.pickup_end.slice(0, 5)} ·{" "}
                  {formatWeekdays(template.days_of_week || [], language)}
                </p>
                <p className="mt-0.5 text-sm text-body">
                  {formatPublishSchedule(template, language)}
                </p>
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                <button
                  type="button"
                  disabled={busy || !template.active}
                  onClick={() => onPublishNow(template, "today")}
                  className="premium-button min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                >
                  {isGeorgian ? "დღეს" : "Today"}
                </button>
                <button
                  type="button"
                  disabled={busy || !template.active}
                  onClick={() => onPublishNow(template, "tomorrow")}
                  className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                >
                  {isGeorgian ? "ხვალ" : "Tomorrow"}
                </button>
                <details className="group relative">
                  <summary
                    aria-label={isGeorgian ? "მეტი" : "More"}
                    className="premium-button-secondary flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center px-3 text-sm [&::-webkit-details-marker]:hidden"
                  >
                    ⋯
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(template)}
                  className="premium-button-secondary min-h-11 px-3 py-2 text-sm disabled:opacity-60"
                >
                  {isGeorgian ? "რედაქტირება" : "Edit"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleActive(template)}
                  className="premium-button-secondary min-h-11 px-3 py-2 text-sm disabled:opacity-60"
                >
                  {template.active
                    ? isGeorgian
                      ? "გაჩერება"
                      : "Pause"
                    : isGeorgian
                    ? "ჩართვა"
                    : "Resume"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDelete(template)}
                  className="premium-button-danger min-h-11 px-3 py-2 text-sm disabled:opacity-60"
                >
                  {isGeorgian ? "წაშლა" : "Delete"}
                </button>
                  </div>
                </details>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
