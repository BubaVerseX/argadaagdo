"use client";

import dynamic from "next/dynamic";
import type { LatLng } from "@/lib/location";
import { PhoneVerification } from "@/components/PhoneVerification";
import {
  BAG_SIZES,
  categoryForBusinessType,
  type BagSize,
  type OfferCategory,
} from "@/lib/offerCategories";
import { BUSINESS_TERMS_VERSION, recordConsent } from "@/lib/consents";
import { useLanguage } from "@/lib/useLanguage";
import {
  isValidIdCode,
  isTbcIban,
  isValidGeorgianIban,
  isValidRegistryExtract,
  LEGAL_FORMS,
  normalizeIban,
  type LegalForm,
} from "@/lib/verification";
import { useEffect, useState } from "react";

// The map loads only when this step is on screen.
const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), { ssr: false });

const DRAFT_KEY = "argadaagdo-business-registration-draft";

const BUSINESS_TYPES = ["Cafe", "Bakery", "Restaurant", "Supermarket", "Hotel", "Other"];

const georgianBusinessTypes: Record<string, string> = {
  Cafe: "კაფე",
  Bakery: "საცხობი",
  Restaurant: "რესტორანი",
  Supermarket: "სუპერმარკეტი",
  Hotel: "სასტუმრო",
  Other: "სხვა",
};

export type CompanyDetails = {
  name: string;
  businessType: string;
  address: string;
  legalName: string;
  idCode: string;
  legalForm: LegalForm;
  ownerFullName: string;
  /** Pickup pin for the app's map; optional, admin can set it later. */
  location?: LatLng | null;
};

export type FirstBag = {
  title: string;
  category: OfferCategory;
  size: BagSize;
  price: string;
  oldPrice: string;
  dailyQuantity: string;
  pickupStart: string;
  pickupEnd: string;
};

export type BusinessApplication = {
  company: CompanyDetails;
  iban: string;
  /** Optional: the admin can check the ID code on enreg.reestri.gov.ge instead. */
  extractFile: File | null;
  /** Null when the business already has a bag (a resubmitted application). */
  firstBag: FirstBag | null;
};

const emptyCompany: CompanyDetails = {
  name: "",
  businessType: "Cafe",
  address: "",
  legalName: "",
  idCode: "",
  legalForm: "ie",
  ownerFullName: "",
};

export function clearBusinessRegistrationDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

function readDraft(): Partial<CompanyDetails> | null {
  try {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    return saved ? (JSON.parse(saved) as Partial<CompanyDetails>) : null;
  } catch {
    return null;
  }
}

/**
 * Four screens, one topic each: company, phone, payout, first bag. Nothing is
 * sent until the last screen. Only the company details are saved on the device;
 * the IBAN is never written to browser storage.
 */
export function BusinessOnboardingWizard({
  initialCompany,
  phoneAlreadyVerified,
  hasExistingBag,
  submitting,
  onSubmit,
}: {
  initialCompany: Partial<CompanyDetails> | null;
  phoneAlreadyVerified: boolean;
  hasExistingBag: boolean;
  submitting: boolean;
  onSubmit: (application: BusinessApplication) => void;
}) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const text = (ka: string, en: string) => (isGeorgian ? ka : en);

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<CompanyDetails>({
    ...emptyCompany,
    ...initialCompany,
  });
  const [phoneVerified, setPhoneVerified] = useState(phoneAlreadyVerified);
  const [iban, setIban] = useState("");
  const [extractFile, setExtractFile] = useState<File | null>(null);
  // Business Terms, accepted in the last step and stored with the time.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [recordingTerms, setRecordingTerms] = useState(false);
  const [bag, setBag] = useState<FirstBag>({
    title: isGeorgian ? "ლანჩ ბოქსი" : "Lunch Box",
    category: "Bakery",
    size: "M",
    price: "",
    oldPrice: "",
    dailyQuantity: "5",
    pickupStart: "19:00",
    pickupEnd: "21:00",
  });

  // After mount: reading localStorage during render would break hydration.
  useEffect(() => {
    if (initialCompany) return;

    const restoreTimer = window.setTimeout(() => {
      const draft = readDraft();
      if (draft) setCompany((current) => ({ ...current, ...draft }));
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [initialCompany]);

  const steps = [
    text("კომპანია", "Company"),
    text("ტელეფონი", "Phone"),
    text("ანგარიში", "Payout"),
    text("პირველი ლანჩ ბოქსი", "First bag"),
  ];

  function updateCompany(field: Exclude<keyof CompanyDetails, "location">, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
  }

  function updateBag(field: keyof FirstBag, value: string) {
    setBag((current) => ({ ...current, [field]: value }));
  }

  function validateStep() {
    if (step === 1) {
      if (
        company.name.trim().length < 2 ||
        company.address.trim().length < 5 ||
        company.legalName.trim().length < 2 ||
        company.ownerFullName.trim().length < 3
      ) {
        return text("შეავსე ყველა ველი.", "Please fill in every field.");
      }

      if (!isValidIdCode(company.idCode)) {
        return text(
          "საიდენტიფიკაციო კოდი უნდა იყოს 9 ან 11 ციფრი.",
          "The identification code must have 9 or 11 digits."
        );
      }
    }

    if (step === 2 && !phoneVerified) {
      return text("დაადასტურე ტელეფონის ნომერი.", "Please confirm your phone number.");
    }

    if (step === 3) {
      if (!isValidGeorgianIban(iban)) {
        return text(
          "შეიყვანე სწორი IBAN: GE, 2 ციფრი, ბანკის კოდი (მაგ. TB), 16 ციფრი.",
          "Enter a valid IBAN: GE, 2 digits, the bank code (e.g. TB), 16 digits."
        );
      }

      if (extractFile && !isValidRegistryExtract(extractFile)) {
        return text(
          "ამონაწერი: PDF ან JPG, მაქსიმუმ 10 მბ.",
          "Extract: PDF or JPG, up to 10 MB."
        );
      }
    }

    if (step === 4 && !hasExistingBag) {
      const price = Number(bag.price);
      const oldPrice = bag.oldPrice.trim() ? Number(bag.oldPrice) : null;
      const quantity = Number(bag.dailyQuantity);

      if (bag.title.trim().length < 3) {
        return text("ლანჩ ბოქსის სახელი ძალიან მოკლეა.", "The bag name is too short.");
      }

      if (!(price > 0) || (oldPrice !== null && !(oldPrice > price))) {
        return text(
          "ფასი უნდა იყოს 0-ზე მეტი, ძველი ფასი კი ფასზე მეტი.",
          "The price must be above 0, and the old price above the price."
        );
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
        return text("რაოდენობა: 1-დან 500-მდე.", "Bags per day: 1 to 500.");
      }

      if (!bag.pickupStart || !bag.pickupEnd || bag.pickupStart >= bag.pickupEnd) {
        return text(
          "წაღების დასასრული დაწყების შემდეგ უნდა იყოს.",
          "Pickup must end after it starts."
        );
      }
    }

    return "";
  }

  async function goNext() {
    const validationError = validateStep();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    if (step === 1) {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(company));
      } catch {
        // The draft is a convenience; the wizard works without it.
      }
    }

    if (step < steps.length) {
      setStep(step + 1);
      return;
    }

    if (!termsAccepted) {
      setError(text("დაეთანხმე ბიზნესის წესებს.", "Please accept the Business Terms."));
      return;
    }

    setRecordingTerms(true);
    const recorded = await recordConsent("business_terms", BUSINESS_TERMS_VERSION, true, "web");
    setRecordingTerms(false);
    if (!recorded) {
      setError(text("ვერ შევინახეთ. სცადე ხელახლა.", "Couldn't save. Please try again."));
      return;
    }
    onSubmit({
      company,
      iban: normalizeIban(iban),
      extractFile,
      // The category follows the shop type; it can be changed later on the box.
      firstBag: hasExistingBag ? null : { ...bag, category: categoryForBusinessType(company.businessType) },
    });
  }

  // min-w-0/w-full: a long option (legal form) must not widen the page.
  const inputClass = "premium-input w-full min-w-0 p-4 font-medium";
  const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-body";

  return (
    <div className="ui-card rounded-3xl p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-mint">
        {text(`ნაბიჯი ${step} / ${steps.length}`, `Step ${step} of ${steps.length}`)}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-cream">{steps[step - 1]}</h2>

      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step}
        aria-label={steps[step - 1]}
        className="mt-4 h-2 overflow-hidden rounded-full bg-well"
      >
        <div
          className="h-full rounded-full bg-mint transition-all"
          style={{ width: `${(step / steps.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {step === 1 && (
          <>
            <label className={labelClass}>
              {text("ბიზნესის სახელი", "Business name")}
              <input
                value={company.name}
                onChange={(event) => updateCompany("name", event.target.value)}
                maxLength={80}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              {text("ბიზნესის ტიპი", "Business type")}
              <select
                value={company.businessType}
                onChange={(event) => updateCompany("businessType", event.target.value)}
                className={inputClass}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {isGeorgian ? georgianBusinessTypes[type] : type}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              {text("წაღების მისამართი", "Pickup address")}
              <input
                value={company.address}
                onChange={(event) => updateCompany("address", event.target.value)}
                maxLength={160}
                className={inputClass}
              />
            </label>
            <div className={labelClass}>
              <span>{text("რუკაზე მონიშვნა", "Pin on the map")}</span>
              <LocationPicker
                value={company.location ?? null}
                onChange={(location) => setCompany((current) => ({ ...current, location }))}
                initialQuery={company.address}
                language={language}
              />
            </div>
            <label className={labelClass}>
              {text("იურიდიული სახელი", "Company legal name")}
              <input
                value={company.legalName}
                onChange={(event) => updateCompany("legalName", event.target.value)}
                maxLength={160}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              {text("საიდენტიფიკაციო კოდი", "Identification code")}
              <input
                value={company.idCode}
                onChange={(event) =>
                  updateCompany("idCode", event.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                maxLength={11}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              {text("სამართლებრივი ფორმა", "Legal form")}
              <select
                value={company.legalForm}
                onChange={(event) => updateCompany("legalForm", event.target.value)}
                className={inputClass}
              >
                {LEGAL_FORMS.map((form) => (
                  <option key={form.value} value={form.value}>
                    {isGeorgian ? form.ka : form.en}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              {text("მფლობელის სრული სახელი", "Owner's full name")}
              <input
                value={company.ownerFullName}
                onChange={(event) => updateCompany("ownerFullName", event.target.value)}
                maxLength={120}
                autoComplete="name"
                className={inputClass}
              />
            </label>
          </>
        )}

        {step === 2 &&
          (phoneVerified ? (
            <p className="rounded-2xl bg-well p-4 font-semibold text-mint">
              {text("ტელეფონი დადასტურებულია ✓", "Phone confirmed ✓")}
            </p>
          ) : (
            <PhoneVerification
              onVerified={() => {
                setPhoneVerified(true);
                setError("");
              }}
            />
          ))}

        {step === 3 && (
          <>
            <label className={labelClass}>
              {text("ანგარიშის ნომერი (IBAN)", "Bank account (IBAN)")}
              <input
                value={iban}
                onChange={(event) => setIban(event.target.value.toUpperCase())}
                placeholder="GE00TB0000000000000000"
                maxLength={30}
                autoComplete="off"
                className={inputClass}
              />
              <span className="text-xs font-medium">
                {text(
                  "საქართველოს ნებისმიერი ბანკი, კომპანიის სახელზე.",
                  "Any Georgian bank, in the company's name."
                )}
              </span>
              <span className="text-xs font-medium">
                {iban && isTbcIban(iban)
                  ? text(
                      "TBC: შენი წილი ყოველი გადახდისას ავტომატურად ჩაგერიცხება.",
                      "TBC: your share arrives automatically with each payment."
                    )
                  : text(
                      "TBC: წილი ავტომატურად გერიცხება. სხვა ბანკი: წინა კვირის წილს ყოველ ორშაბათს გადმოგირიცხავთ.",
                      "TBC: your share arrives automatically. Other banks: we send last week's share every Monday."
                    )}
              </span>
            </label>
            <label className={labelClass}>
              {text("ამონაწერი საჯარო რეესტრიდან (არასავალდებულო)", "Public Registry extract (optional)")}
              <input
                type="file"
                accept="application/pdf,image/jpeg"
                onChange={(event) => setExtractFile(event.target.files?.[0] ?? null)}
                className={inputClass}
              />
              <span className="text-xs font-medium">
                {text(
                  "PDF ან JPG, 10 მბ-მდე. თუ არ გაქვს, კომპანიას საიდენტიფიკაციო კოდით შევამოწმებთ.",
                  "PDF or JPG, up to 10 MB. If you don't have it, we check the company by its ID code."
                )}
              </span>
            </label>
          </>
        )}

        {step === 4 &&
          (hasExistingBag ? (
            <p className="rounded-2xl bg-well p-4 font-semibold text-mint">
              {text("შენი პირველი ლანჩ ბოქსი უკვე შენახულია ✓", "Your first bag is already saved ✓")}
            </p>
          ) : (
            <>
              <label className={labelClass}>
                {text("ლანჩ ბოქსის სახელი", "Bag name")}
                <input
                  value={bag.title}
                  onChange={(event) => updateBag("title", event.target.value)}
                  maxLength={120}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  {text("ზომა", "Size")}
                  <select
                    value={bag.size}
                    onChange={(event) => updateBag("size", event.target.value)}
                    className={inputClass}
                  >
                    {BAG_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {text("ფასი (₾)", "Price (₾)")}
                  <input
                    value={bag.price}
                    onChange={(event) => updateBag("price", event.target.value)}
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {text("ძველი ფასი (₾, არასავალდებულო)", "Old price (₾, optional)")}
                  <input
                    value={bag.oldPrice}
                    onChange={(event) => updateBag("oldPrice", event.target.value)}
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {text("ლანჩ ბოქსი დღეში", "Bags per day")}
                  <input
                    value={bag.dailyQuantity}
                    onChange={(event) => updateBag("dailyQuantity", event.target.value)}
                    type="number"
                    min="1"
                    max="500"
                    inputMode="numeric"
                    className={inputClass}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={labelClass}>
                    {text("წაღება: დან", "Pickup from")}
                    <input
                      value={bag.pickupStart}
                      onChange={(event) => updateBag("pickupStart", event.target.value)}
                      type="time"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    {text("მდე", "to")}
                    <input
                      value={bag.pickupEnd}
                      onChange={(event) => updateBag("pickupEnd", event.target.value)}
                      type="time"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            </>
          ))}
      </div>

      {step === steps.length && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-well px-4 py-3 text-sm leading-6 text-body">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span>
            {text("ვეთანხმები ", "I accept the ")}
            <a href="/business-terms" target="_blank" rel="noreferrer" className="font-semibold text-cream underline underline-offset-2">
              {text("ბიზნესის წესებს", "Business Terms")}
            </a>
            {text(
              ": სურსათის უვნებლობა, შეკვეთების გადაცემა, საკომისიო და თანხის ჩარიცხვა.",
              ": food safety, handing over orders, commission and payouts."
            )}
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setError("");
            setStep(Math.max(step - 1, 1));
          }}
          disabled={step === 1 || submitting}
          className="premium-button-secondary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {text("უკან", "Back")}
        </button>
        <button
          type="button"
          onClick={() => void goNext()}
          disabled={submitting || recordingTerms || (step === 2 && !phoneVerified)}
          className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? text("იგზავნება...", "Sending...")
            : step < steps.length
              ? text("გაგრძელება", "Continue")
              : text("განაცხადის გაგზავნა", "Send application")}
        </button>
      </div>
    </div>
  );
}
