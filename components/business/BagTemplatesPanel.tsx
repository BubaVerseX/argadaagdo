"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CameraIcon, ChevronDownIcon, ClockIcon, EditIcon, PackageIcon, PlusIcon } from "@/components/icons";
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
  getOfferCategoryLabel,
  normalizeBagSize,
  normalizeOfferCategory,
  type BagSize,
  type OfferCategory,
} from "@/lib/offerCategories";
import { formatMoney, getTbilisiDateKey, isOrderPastPickupEnd } from "@/lib/offerLifecycle";
import type { BagTemplate, Business, Department } from "@/lib/types";
import { IMAGE_INPUT_ACCEPT, type ImageUploadResult } from "@/lib/business/prepareImage";
import { translateUserMessage } from "@/lib/messageTranslations";

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
  /** Templates that already have today's box. */
  todayTemplateIds: number[];
  /** Goes up by one when the home screen asks to add a box. */
  newBoxSignal: number;
  onSave: (input: BagTemplateInput, templateId: number | null) => Promise<boolean>;
  /** "Only today": one box for today, no schedule. */
  onPublishToday: (input: BagTemplateInput) => Promise<boolean>;
  onToggleActive: (template: BagTemplate) => void;
  onDelete: (template: BagTemplate) => void;
  onPublishNow: (template: BagTemplate, day: "today" | "tomorrow") => void;
  onUploadImage: (file: File) => Promise<ImageUploadResult>;
};

type When = "everyday" | "today" | "days";

type FormState = {
  departmentId: string;
  title: string;
  description: string;
  category: OfferCategory;
  size: BagSize;
  price: string;
  oldPrice: string;
  unlimited: boolean;
  dailyQuantity: string;
  pickupStart: string;
  pickupEnd: string;
  when: When;
  days: number[];
  publishTime: string;
  publishDaysBefore: 0 | 1;
  imageUrl: string;
};

function defaultCategory(business: Business): OfferCategory {
  switch (business.business_type) {
    case "Bakery":
      return "Bakery";
    case "Restaurant":
    case "Hotel":
      return "Deli";
    default:
      return "Mixed";
  }
}

function emptyForm(business: Business, departments: Department[]): FormState {
  const defaultDepartment = departments.find((d) => d.is_default) || departments[0];
  return {
    departmentId: defaultDepartment ? String(defaultDepartment.id) : "",
    title: "",
    description: "",
    category: defaultCategory(business),
    size: "M",
    price: "",
    oldPrice: "",
    unlimited: false,
    dailyQuantity: "5",
    pickupStart: "19:00",
    pickupEnd: "21:00",
    when: "everyday",
    days: [...ISO_WEEKDAYS],
    publishTime: "12:00",
    publishDaysBefore: 0,
    imageUrl: "",
  };
}

function formFromTemplate(template: BagTemplate): FormState {
  const days = template.days_of_week?.length ? [...template.days_of_week] : [...ISO_WEEKDAYS];
  return {
    departmentId: template.department_id ? String(template.department_id) : "",
    title: template.title,
    description: template.description || "",
    category: normalizeOfferCategory(template.category),
    size: normalizeBagSize(template.size) ?? "M",
    price: String(template.price ?? ""),
    oldPrice: template.old_price ? String(template.old_price) : "",
    unlimited: template.daily_quantity === null,
    dailyQuantity: template.daily_quantity ? String(template.daily_quantity) : "5",
    pickupStart: template.pickup_start.slice(0, 5),
    pickupEnd: template.pickup_end.slice(0, 5),
    when: days.length >= 7 ? "everyday" : "days",
    days,
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
    return dayBefore ? `აპში ჩნდება წინა დღეს ${time}-ზე` : `აპში ჩნდება ${time}-ზე`;
  }
  return dayBefore ? `in the app the day before at ${time}` : `in the app at ${time}`;
}

function minutesOf(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** ISO weekday (1 = Monday) of today in Tbilisi. */
function todayIsoWeekday() {
  const [year, month, day] = getTbilisiDateKey().split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function BagTemplatesPanel({
  language,
  business,
  departments,
  templates,
  busyTemplateId,
  todayTemplateIds,
  newBoxSignal,
  onSave,
  onPublishToday,
  onToggleActive,
  onDelete,
  onPublishNow,
  onUploadImage,
}: BagTemplatesPanelProps) {
  const isGeorgian = language === "ka";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(business, departments));
  const [moreOpen, setMoreOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const showDepartmentSelect = departments.length > 1;
  const editingTemplate = editingId ? templates.find((t) => t.id === editingId) ?? null : null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openForm(next: FormState, id: number | null) {
    setEditingId(id);
    setForm(next);
    setMoreOpen(false);
    setFormError("");
    setImageError("");
    setFormOpen(true);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  const openCreate = () => openForm(emptyForm(business, departments), null);

  // The home screen's "Add a box" opens an empty form here.
  const lastSignal = useRef(newBoxSignal);
  useEffect(() => {
    if (newBoxSignal === lastSignal.current) return;
    lastSignal.current = newBoxSignal;
    openForm(emptyForm(business, departments), null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBoxSignal]);

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError("");
  }

  // A box deleted while its form is open: the form simply goes away.
  const showForm = formOpen && (editingId === null || templates.some((t) => t.id === editingId));

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

  function setQuantity(next: number) {
    update("dailyQuantity", String(Math.min(500, Math.max(1, next))));
  }

  async function submit() {
    setFormError("");
    const title = form.title.trim();
    const price = Number(form.price);
    const oldPrice = form.oldPrice ? Number(form.oldPrice) : null;
    const onlyToday = form.when === "today";
    const dailyQuantity = form.unlimited && !onlyToday ? null : Number(form.dailyQuantity);
    const days = form.when === "days" ? [...form.days].sort((a, b) => a - b) : [...ISO_WEEKDAYS];

    if (title.length < 3) {
      setFormError(L("დაარქვი ბოქსს სახელი (მინ. 3 სიმბოლო).", "Give the box a name (at least 3 characters)."));
      return;
    }
    // Price 0 is allowed only for the App Review demo business (same rule as
    // offers, enforced again by the database).
    if (!Number.isFinite(price) || price < 0 || (price === 0 && !business.is_review_demo)) {
      setFormError(L("მიუთითე ბოქსის ფასი.", "Add the box price."));
      return;
    }
    if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price)) {
      setFormError(
        L(
          "შიგთავსის ღირებულება ბოქსის ფასზე მეტი უნდა იყოს, ან დატოვე ცარიელი.",
          "The value inside must be higher than the box price, or leave it empty."
        )
      );
      return;
    }
    if (dailyQuantity !== null && (!Number.isInteger(dailyQuantity) || dailyQuantity < 1 || dailyQuantity > 500)) {
      setFormError(L("ბოქსების რაოდენობა 1-დან 500-მდე უნდა იყოს.", "The number of boxes must be between 1 and 500."));
      return;
    }
    if (!form.pickupStart || !form.pickupEnd || form.pickupStart >= form.pickupEnd) {
      setFormError(L("წაღების დასრულება დაწყების შემდეგ უნდა იყოს.", "Pickup must end after it starts."));
      return;
    }
    if (form.when === "days" && form.days.length === 0) {
      setFormError(L("აირჩიე ერთი დღე მაინც.", "Choose at least one day."));
      return;
    }
    if (
      onlyToday &&
      isOrderPastPickupEnd({ pickup_date: getTbilisiDateKey(), pickup_start: form.pickupStart, pickup_end: form.pickupEnd })
    ) {
      setFormError(L("დღეს ეს წაღების დრო უკვე გავიდა. აირჩიე უფრო გვიანი დრო.", "This pickup time has already passed today. Choose a later time."));
      return;
    }
    if (!onlyToday) {
      if (!/^\d{2}:\d{2}$/.test(form.publishTime)) {
        setFormError(L("მიუთითე, რომელ საათზე გამოჩნდეს აპში.", "Add the time it appears in the app."));
        return;
      }
      if (form.publishDaysBefore === 0 && form.publishTime >= form.pickupEnd) {
        setFormError(
          L(
            "ბოქსი აპში წაღების დასრულებამდე უნდა გამოჩნდეს. შეცვალე გამოჩენის დრო: „მეტი პარამეტრი“ → „გამოჩენის დრო“.",
            "The box must appear in the app before pickup ends. Change the time under “More options”."
          )
        );
        setMoreOpen(true);
        return;
      }
    }

    const input: BagTemplateInput = {
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
      days_of_week: days,
      publish_time: form.publishTime,
      publish_days_before: form.publishDaysBefore,
      image_url: form.imageUrl.trim() || null,
    };

    setSaving(true);
    const ok = onlyToday ? await onPublishToday(input) : await onSave(input, editingId);
    setSaving(false);
    if (ok) closeForm();
  }

  const priceValue = Number(form.price);
  const oldPriceValue = Number(form.oldPrice);
  const savingPercent =
    form.price && form.oldPrice && priceValue > 0 && oldPriceValue > priceValue
      ? Math.round((1 - priceValue / oldPriceValue) * 100)
      : null;

  const scheduleLine =
    form.when === "today"
      ? L("აპში ახლავე გამოჩნდება, მხოლოდ დღეს.", "Appears in the app right away, today only.")
      : L(
          `აპში ${form.when === "everyday" ? "ყოველდღე" : "არჩეულ დღეებში"} ${
            form.publishDaysBefore === 1 ? `წინა დღეს ${form.publishTime}-ზე` : `${form.publishTime}-ზე`
          } გამოჩნდება.`,
          `Appears in the app ${form.when === "everyday" ? "every day" : "on the chosen days"} ${
            form.publishDaysBefore === 1 ? `the day before at ${form.publishTime}` : `at ${form.publishTime}`
          }.`
        );

  const inputClass = "premium-input w-full min-w-0 p-3 font-semibold";
  const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-body";
  const chip = (selected: boolean) =>
    `min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${
      selected ? "theme-forest bg-page text-cream" : "ui-card text-cream hover:brightness-[0.98]"
    }`;
  const todayWeekday = todayIsoWeekday();
  const todayKey = getTbilisiDateKey();

  return (
    <div id="bag-templates" className="premium-card mt-4 scroll-mt-24 rounded-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-cream sm:text-2xl">{L("ჩემი ბოქსები", "My boxes")}</h2>
          <p className="mt-1 text-sm text-body">
            {L("ერთხელ შექმენი — აპში თავად გამოჩნდება.", "Create it once — it appears in the app by itself.")}
          </p>
        </div>
        {!showForm && (
          <button type="button" onClick={openCreate} className="premium-button min-h-11 shrink-0 gap-2 px-4 py-2.5">
            <PlusIcon className="h-5 w-5" strokeWidth={2.2} />
            {L("ახალი ბოქსი", "New box")}
          </button>
        )}
      </div>

      {showForm && (
        <div ref={formRef} className="premium-muted-card mt-5 scroll-mt-24 rounded-3xl p-4 sm:p-6">
          <h3 className="text-xl font-bold text-cream">
            {editingId ? L("ბოქსის შეცვლა", "Change box") : L("ახალი ბოქსი", "New box")}
          </h3>

          <div className="mt-5 grid gap-5">
            {/* 1. Photo */}
            <div className="flex items-center gap-4">
              <label
                className={`relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-mint ${
                  form.imageUrl ? "ui-card" : "border-2 border-dashed border-line-strong bg-card"
                }`}
              >
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 px-2 text-center text-xs font-semibold text-mint">
                    <CameraIcon className="h-7 w-7" strokeWidth={1.8} />
                    {L("ფოტოს დამატება", "Add a photo")}
                  </span>
                )}
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                    {L("იტვირთება...", "Uploading...")}
                  </span>
                )}
                <input
                  key={imageInputKey}
                  type="file"
                  accept={IMAGE_INPUT_ACCEPT}
                  onChange={(event) => void handleImage(event)}
                  disabled={uploading}
                  className="sr-only"
                  aria-label={L("ბოქსის ფოტო", "Box photo")}
                />
              </label>
              <div className="min-w-0 text-sm text-body">
                <p className="font-semibold text-cream">{L("ფოტო", "Photo")}</p>
                <p>{L("ნებისმიერი ფოტო ტელეფონიდან.", "Any photo from your phone.")}</p>
                {form.imageUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => update("imageUrl", "")}
                    className="mt-1 min-h-11 text-sm font-semibold text-body underline underline-offset-4"
                  >
                    {L("ფოტოს მოშორება", "Remove photo")}
                  </button>
                )}
              </div>
            </div>
            {imageError && !uploading && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                {imageError}
              </p>
            )}

            {/* 2. Name */}
            <label className={labelClass}>
              <span>
                {L("სახელი", "Name")} <RequiredMark />
              </span>
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                maxLength={120}
                className={inputClass}
                placeholder={L("მაგ. საცხობის ბოქსი", "e.g. Bakery box")}
              />
            </label>

            {/* 3. Price and value */}
            <div className="grid gap-2">
              <div className="grid grid-cols-2 items-end gap-3">
                <label className={labelClass}>
                  <span>
                    {L("ბოქსის ფასი ₾", "Box price ₾")} <RequiredMark />
                  </span>
                  <input
                    value={form.price}
                    onChange={(event) => update("price", event.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="9"
                  />
                </label>
                <label className={labelClass}>
                  {L("შიგთავსის ღირებულება ₾", "Value inside ₾")}
                  <input
                    value={form.oldPrice}
                    onChange={(event) => update("oldPrice", event.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="25"
                  />
                </label>
              </div>
              {savingPercent !== null && (
                <p className="text-sm font-semibold text-mint">
                  {L(`მყიდველი ზოგავს ${savingPercent}%`, `Buyers save ${savingPercent}%`)}
                </p>
              )}
            </div>

            {/* 4. How many */}
            <div className={labelClass}>
              <span>
                {form.when === "today" ? L("რამდენი ბოქსი", "How many boxes") : L("რამდენი ბოქსი დღეში", "Boxes per day")}{" "}
                <RequiredMark />
              </span>
              {form.unlimited && form.when !== "today" ? (
                <p className="text-base font-semibold text-cream">
                  {L("ულიმიტო — სანამ არ გააჩერებ", "Unlimited — until you stop it")}
                </p>
              ) : (
                <div className="ui-well flex w-fit items-center rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setQuantity(Number(form.dailyQuantity || 0) - 1)}
                    aria-label={L("ერთით ნაკლები", "One fewer")}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-cream transition hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                  >
                    −
                  </button>
                  <input
                    value={form.dailyQuantity}
                    onChange={(event) => update("dailyQuantity", event.target.value.replace(/\D/g, "").slice(0, 3))}
                    inputMode="numeric"
                    aria-label={L("ბოქსების რაოდენობა", "Number of boxes")}
                    className="w-14 bg-transparent text-center text-xl font-bold text-cream focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(Number(form.dailyQuantity || 0) + 1)}
                    aria-label={L("ერთით მეტი", "One more")}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-cream transition hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* 5. Pickup time */}
            <div className={labelClass}>
              <span>
                {L("წაღების დრო", "Pickup time")} <RequiredMark />
              </span>
              <div className="grid max-w-sm grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  value={form.pickupStart}
                  onChange={(event) => update("pickupStart", event.target.value)}
                  type="time"
                  aria-label={L("წაღების დაწყება", "Pickup starts")}
                  className="premium-input w-full min-w-0 p-3 font-semibold"
                />
                <span className="text-lg font-bold text-body">–</span>
                <input
                  value={form.pickupEnd}
                  onChange={(event) => update("pickupEnd", event.target.value)}
                  type="time"
                  aria-label={L("წაღების დასრულება", "Pickup ends")}
                  className="premium-input w-full min-w-0 p-3 font-semibold"
                />
              </div>
            </div>

            {/* 6. When */}
            <div className={labelClass}>
              <span>
                {L("როდის", "When")} <RequiredMark />
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["everyday", L("ყოველდღე", "Every day")],
                    ...(editingId ? [] : [["today", L("მხოლოდ დღეს", "Only today")]]),
                    ["days", L("არჩეულ დღეებში", "Chosen days")],
                  ] as [When, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={form.when === value}
                    onClick={() => update("when", value)}
                    className={chip(form.when === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.when === "days" && (
                <div className="flex flex-wrap gap-2">
                  {ISO_WEEKDAYS.map((day) => {
                    const selected = form.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          update("days", selected ? form.days.filter((d) => d !== day) : [...form.days, day])
                        }
                        className={`${chip(selected)} min-w-14 px-3`}
                      >
                        {getWeekdayLabel(day, language)}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="flex items-center gap-2 text-sm font-normal text-body">
                <ClockIcon className="h-4 w-4 shrink-0 text-mint" strokeWidth={2} />
                {scheduleLine}
              </p>
            </div>

            {/* More options */}
            <div className="border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                className="flex min-h-11 items-center gap-2 text-sm font-semibold text-cream"
              >
                <ChevronDownIcon
                  className={`h-4 w-4 transition ${moreOpen ? "rotate-180" : ""}`}
                  strokeWidth={2.2}
                />
                {L("მეტი პარამეტრი", "More options")}
              </button>

              {moreOpen && (
                <div className="mt-3 grid gap-5">
                  {showDepartmentSelect && (
                    <label className={labelClass}>
                      {L("განყოფილება", "Department")}
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

                  <div className={labelClass}>
                    {L("კატეგორია (აპის ფილტრისთვის)", "Category (for the app's filter)")}
                    <div className="flex flex-wrap gap-2">
                      {OFFER_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          aria-pressed={form.category === category}
                          onClick={() => update("category", category)}
                          className={chip(form.category === category)}
                        >
                          {getOfferCategoryLabel(category, language)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={labelClass}>
                    {L("ზომა", "Size")}
                    <div className="flex flex-wrap gap-2">
                      {BAG_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          aria-pressed={form.size === size}
                          onClick={() => update("size", size)}
                          className={chip(form.size === size)}
                        >
                          {size} · {getBagSizeLabel(size, language)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.when !== "today" && (
                    <>
                      <div className={labelClass}>
                        {L("როდის გამოჩნდეს აპში", "When it appears in the app")}
                        <div className="flex flex-wrap items-center gap-2">
                          {([0, 1] as const).map((daysBefore) => (
                            <button
                              key={daysBefore}
                              type="button"
                              aria-pressed={form.publishDaysBefore === daysBefore}
                              onClick={() => update("publishDaysBefore", daysBefore)}
                              className={chip(form.publishDaysBefore === daysBefore)}
                            >
                              {daysBefore === 0 ? L("იმავე დღეს", "Same day") : L("წინა დღეს", "Day before")}
                            </button>
                          ))}
                          <input
                            value={form.publishTime}
                            onChange={(event) => update("publishTime", event.target.value)}
                            type="time"
                            aria-label={L("გამოჩენის დრო", "Time it appears")}
                            className="premium-input w-36 p-3 font-semibold"
                          />
                        </div>
                        <span className="text-xs font-normal text-body">
                          {L(
                            "მყიდველს გაუქმება შეუძლია წაღებამდე 2 საათით ადრე.",
                            "Buyers can cancel until 2 hours before pickup starts."
                          )}
                          {form.publishDaysBefore === 0 &&
                            form.pickupStart &&
                            /^\d{2}:\d{2}$/.test(form.publishTime) &&
                            minutesOf(form.pickupStart) - minutesOf(form.publishTime) < 120 &&
                            L(" ამ დროით გაუქმება ვერ მოხერხდება.", " With this time, nobody can cancel.")}
                        </span>
                      </div>

                      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-cream">
                        <input
                          type="checkbox"
                          checked={form.unlimited}
                          onChange={(event) => update("unlimited", event.target.checked)}
                          className="h-5 w-5 accent-[var(--brand-forest)]"
                        />
                        {L("ულიმიტო რაოდენობა — სანამ არ გავაჩერებ", "Unlimited — until I stop it")}
                      </label>
                    </>
                  )}

                  <label className={labelClass}>
                    {L("აღწერა", "Description")}
                    <textarea
                      value={form.description}
                      onChange={(event) => update("description", event.target.value)}
                      maxLength={500}
                      className={`${inputClass} min-h-24`}
                      placeholder={L(
                        "მაგ. დღის ბოლოს დარჩენილი პური, ფუნთუშები და ნამცხვრები.",
                        "e.g. bread, buns and pastries from the end of the day."
                      )}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {formError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving || uploading}
              className="premium-button min-h-12 px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? L("ინახება...", "Saving...")
                : form.when === "today"
                  ? L("დღეს გამოქვეყნება", "Publish for today")
                  : editingId
                    ? L("შენახვა", "Save")
                    : L("ბოქსის შენახვა", "Save box")}
            </button>
            <button type="button" onClick={closeForm} className="premium-button-secondary min-h-12 px-5 py-2.5">
              {L("გაუქმება", "Cancel")}
            </button>
            {editingTemplate && (
              <button
                type="button"
                onClick={() => onDelete(editingTemplate)}
                disabled={busyTemplateId === editingTemplate.id}
                className="ml-auto min-h-11 px-2 text-sm font-semibold text-danger underline underline-offset-4 disabled:opacity-60"
              >
                {L("ბოქსის წაშლა", "Delete box")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {templates.length === 0 && !showForm && (
          <div className="ui-card flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-forest text-brand-mint">
              <PackageIcon className="h-6 w-6" strokeWidth={1.9} />
            </span>
            <p className="font-semibold text-cream">{L("ბოქსი ჯერ არ გაქვს", "No boxes yet")}</p>
            <button type="button" onClick={openCreate} className="premium-button min-h-11 gap-2 px-5">
              <PlusIcon className="h-5 w-5" strokeWidth={2.2} />
              {L("პირველი ბოქსის დამატება", "Add your first box")}
            </button>
          </div>
        )}

        {templates.map((template) => {
          const busy = busyTemplateId === template.id;
          const department = template.department_id ? departmentById.get(template.department_id) : null;
          const days = template.days_of_week || [];
          const canPublishToday =
            template.active &&
            days.includes(todayWeekday) &&
            !todayTemplateIds.includes(template.id) &&
            !isOrderPastPickupEnd({
              pickup_date: todayKey,
              pickup_start: template.pickup_start,
              pickup_end: template.pickup_end,
            });

          return (
            <div
              key={template.id}
              className={`ui-card rounded-2xl p-4 ${template.active ? "" : "opacity-80"}`}
            >
              <div className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-well">
                  {template.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={template.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <CameraIcon className="h-6 w-6 text-body" strokeWidth={1.8} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-lg font-bold text-cream">{template.title}</p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={template.active}
                      onClick={() => onToggleActive(template)}
                      disabled={busy}
                      className="flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-body disabled:opacity-60"
                    >
                      <span className="hidden sm:inline">
                        {template.active ? L("ჩართულია", "On") : L("გამორთულია", "Off")}
                      </span>
                      <span
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                          template.active ? "bg-brand-forest" : "border border-line-strong bg-well"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full shadow transition ${
                            template.active ? "translate-x-6 bg-brand-mint" : "translate-x-1 bg-white"
                          }`}
                        />
                      </span>
                      <span className="sr-only">
                        {template.active ? L("ჩართულია", "On") : L("გამორთულია", "Off")}
                      </span>
                    </button>
                  </div>
                  <p className="text-sm text-body">
                    <span className="font-semibold text-cream">{formatMoney(template.price)}</span>
                    {template.old_price ? (
                      <span className="ml-1 line-through">{formatMoney(template.old_price)}</span>
                    ) : null}
                    {" · "}
                    {template.daily_quantity === null
                      ? L("ულიმიტო", "unlimited")
                      : L(`დღეში ${template.daily_quantity}`, `${template.daily_quantity} a day`)}
                  </p>
                  <p className="text-sm text-body">
                    {formatWeekdays(days, language)} · {template.pickup_start.slice(0, 5)}–
                    {template.pickup_end.slice(0, 5)}
                    {showDepartmentSelect && ` · ${getDepartmentDisplayName(department, language)}`}
                  </p>
                  <p className="text-xs text-body">
                    {template.active
                      ? formatPublishSchedule(template, language)
                      : L("გამორთულია — აპში აღარ ჩნდება", "Off — not shown in the app")}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openForm(formFromTemplate(template), template.id)}
                  className="premium-button-secondary min-h-11 gap-2 px-4 py-2 text-sm disabled:opacity-60"
                >
                  <EditIcon className="h-4 w-4" strokeWidth={2} />
                  {L("შეცვლა", "Change")}
                </button>
                {canPublishToday && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPublishNow(template, "today")}
                    className="premium-button min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {L("დღესაც გამოქვეყნება", "Publish today too")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
