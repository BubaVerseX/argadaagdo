"use client";

import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useMemo, useState } from "react";

const BUSINESS_REGISTRATION_DRAFT_KEY =
  "argadaagdo-business-registration-draft";

type BusinessOnboardingWizardProps = {
  name: string;
  businessType: string;
  address: string;
  phone: string;
  submitting: boolean;
  accessReady: boolean;
  canRegister: boolean;
  onNameChange: (value: string) => void;
  onBusinessTypeChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
};

type Draft = {
  name?: string;
  businessType?: string;
  address?: string;
  phone?: string;
  description?: string;
  imagePlan?: string;
  step?: number;
};

const steps = [
  {
    title: "Business Information",
    helper: "Tell us the name and type of business you want to onboard.",
  },
  {
    title: "Location",
    helper: "Add the pickup address customers should visit.",
  },
  {
    title: "Contact",
    helper: "Add a phone number admins can use during approval.",
  },
  {
    title: "Business Description",
    helper: "Prepare a short description for your public profile.",
  },
  {
    title: "Images",
    helper: "Prepare your logo or a clear storefront image for trust.",
  },
  {
    title: "Preview",
    helper: "Review the application before sending it to admin approval.",
  },
  {
    title: "Submit",
    helper: "Submit your business for review.",
  },
];

// Same steps, in the same order, for Georgian.
const georgianSteps: typeof steps = [
  {
    title: "ბიზნესის ინფორმაცია",
    helper: "მოგვიყევი იმ ბიზნესის სახელი და ტიპი, რომლის დარეგისტრირებაც გინდა.",
  },
  {
    title: "მდებარეობა",
    helper: "დაამატე წაღების მისამართი, სადაც მომხმარებლები უნდა მოვიდნენ.",
  },
  {
    title: "კონტაქტი",
    helper: "დაამატე ტელეფონის ნომერი, რომლითაც ადმინი დამტკიცებისას დაგიკავშირდება.",
  },
  {
    title: "ბიზნესის აღწერა",
    helper: "მოამზადე მოკლე აღწერა საჯარო პროფილისთვის.",
  },
  {
    title: "სურათები",
    helper: "ნდობისთვის მოამზადე ლოგო ან ფასადის მკაფიო ფოტო.",
  },
  {
    title: "გადახედვა",
    helper: "გადახედე განაცხადს, სანამ ადმინს დასამტკიცებლად გაუგზავნი.",
  },
  {
    title: "გაგზავნა",
    helper: "გაგზავნე ბიზნესი განსახილველად.",
  },
];

// Display labels for the business type options. The stored values stay in
// English.
const georgianBusinessTypeLabels = new Map<string, string>([
  ["Cafe", "კაფე"],
  ["Bakery", "საცხობი"],
  ["Restaurant", "რესტორანი"],
  ["Supermarket", "სუპერმარკეტი"],
  ["Hotel", "სასტუმრო"],
  ["Other", "სხვა"],
]);

export function clearBusinessRegistrationDraft() {
  try {
    window.localStorage.removeItem(BUSINESS_REGISTRATION_DRAFT_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

function readSavedDraft() {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = window.localStorage.getItem(
      BUSINESS_REGISTRATION_DRAFT_KEY
    );
    return rawDraft ? (JSON.parse(rawDraft) as Draft) : null;
  } catch {
    window.localStorage.removeItem(BUSINESS_REGISTRATION_DRAFT_KEY);
    return null;
  }
}

export function BusinessOnboardingWizard({
  name,
  businessType,
  address,
  phone,
  submitting,
  accessReady,
  canRegister,
  onNameChange,
  onBusinessTypeChange,
  onAddressChange,
  onPhoneChange,
  onSubmit,
}: BusinessOnboardingWizardProps) {
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";
  const localizedSteps = isGeorgian ? georgianSteps : steps;
  const businessTypeLabel = (value: string) =>
    isGeorgian ? georgianBusinessTypeLabels.get(value) ?? value : value;
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [imagePlan, setImagePlan] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  // Restore the saved draft after mount: reading localStorage during render
  // made the client's first render differ from the prerendered HTML.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedDraft = readSavedDraft();
      if (!savedDraft) return;

      if (
        savedDraft.step &&
        savedDraft.step >= 1 &&
        savedDraft.step <= steps.length
      ) {
        setStep(savedDraft.step);
      }
      if (savedDraft.description) setDescription(savedDraft.description);
      if (savedDraft.imagePlan) setImagePlan(savedDraft.imagePlan);
      if (savedDraft.name) onNameChange(savedDraft.name);
      if (savedDraft.businessType) {
        onBusinessTypeChange(savedDraft.businessType);
      }
      if (savedDraft.address) onAddressChange(savedDraft.address);
      if (savedDraft.phone) onPhoneChange(savedDraft.phone);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
    // Restore once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(
    () => Math.round((step / steps.length) * 100),
    [step]
  );

  function saveDraft(showMessage = false) {
    const draft: Draft = {
      name,
      businessType,
      address,
      phone,
      description,
      imagePlan,
      step,
    };

    try {
      window.localStorage.setItem(
        BUSINESS_REGISTRATION_DRAFT_KEY,
        JSON.stringify(draft)
      );
    } catch {
      return;
    }

    if (showMessage) {
      setDraftMessage(
        isGeorgian
          ? "პროგრესი ამ მოწყობილობაზე შეინახა."
          : "Progress saved on this device."
      );
    }
  }

  function goToStep(nextStep: number) {
    saveDraft(false);
    setDraftMessage("");
    setStep(Math.min(Math.max(nextStep, 1), steps.length));
  }

  function submitApplication() {
    saveDraft(false);
    onSubmit();
  }

  const currentStep = localizedSteps[step - 1];

  return (
    <div className="rounded-3xl bg-[#f4efe4] p-5 sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#a67c52]">
            {isGeorgian ? (
              <>
                ნაბიჯი {step} / {steps.length}
              </>
            ) : (
              <>
                Step {step} of {steps.length}
              </>
            )}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#2e2a22]">
            {currentStep.title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6152]">
            {currentStep.helper}
          </p>
        </div>

        <span className="soft-raised rounded-full px-4 py-2 text-sm font-black text-[#a67c52]">
          {progress}% {isGeorgian ? "დასრულებულია" : "complete"}
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#a67c52] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {localizedSteps.map((wizardStep, index) => (
          <button
            key={wizardStep.title}
            type="button"
            onClick={() => goToStep(index + 1)}
            className={`min-h-11 rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
              step === index + 1
                ? "soft-pressed text-[#a67c52]"
                : "soft-raised text-[#6b6152]"
            }`}
          >
            {index + 1}. {wizardStep.title}
          </button>
        ))}
      </div>

      <div className="soft-raised mt-6 rounded-3xl p-4 sm:p-5">
        {step === 1 && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-black text-[#6b6152]">
              {isGeorgian ? "ბიზნესის სახელი *" : "Business name *"}
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={
                  isGeorgian
                    ? "საცხობის, კაფეს ან რესტორნის სახელი"
                    : "Bakery, cafe or restaurant name"
                }
                maxLength={80}
                className="premium-input p-4 font-medium"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-[#6b6152]">
              {isGeorgian ? "ბიზნესის ტიპი *" : "Business type *"}
              <select
                value={businessType}
                onChange={(event) => onBusinessTypeChange(event.target.value)}
                className="premium-input p-4 font-medium"
              >
                <option value="Cafe">{businessTypeLabel("Cafe")}</option>
                <option value="Bakery">{businessTypeLabel("Bakery")}</option>
                <option value="Restaurant">
                  {businessTypeLabel("Restaurant")}
                </option>
                <option value="Supermarket">
                  {businessTypeLabel("Supermarket")}
                </option>
                <option value="Hotel">{businessTypeLabel("Hotel")}</option>
                <option value="Other">{businessTypeLabel("Other")}</option>
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6152]">
            {isGeorgian ? "წაღების მისამართი *" : "Pickup address *"}
            <input
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder={
                isGeorgian ? "ქუჩის მისამართი თბილისში" : "Street address in Tbilisi"
              }
              maxLength={160}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6152]">
              {isGeorgian
                ? "მომხმარებლები ამ მისამართზე მოვლენ დაჯავშნილი სიურპრიზის ყუთების წასაღებად."
                : "Customers will use this address to collect reserved surprise bags."}
            </span>
          </label>
        )}

        {step === 3 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6152]">
            {isGeorgian ? "ტელეფონის ნომერი *" : "Phone number *"}
            <input
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="+995 ..."
              maxLength={40}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6152]">
              {isGeorgian
                ? "ადმინმა შეიძლება ეს ნომერი გამოიყენოს, თუ დამტკიცებისას ბიზნესის დეტალების გადამოწმება დასჭირდება."
                : "Admins may use this number if they need to verify business details during approval."}
            </span>
          </label>
        )}

        {step === 4 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6152]">
            {isGeorgian ? "მოკლე აღწერა" : "Short description"}
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                isGeorgian
                  ? "მაგალითად: დღევანდელი დახურვისას დარჩენილი ახალი საცხობი პროდუქცია."
                  : "Example: Fresh bakery items saved from today's closing stock."
              }
              maxLength={220}
              rows={5}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6152]">
              {isGeorgian
                ? "ეს ამ ეტაპზე რეგისტრაციის პროგრესად ინახება. დამტკიცების შემდეგ პანელის პროფილის ინსტრუმენტებს გამოიყენებ."
                : "This is saved as onboarding progress for now. You can use the dashboard profile tools after approval."}
            </span>
          </label>
        )}

        {step === 5 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6152]">
            {isGeorgian ? "სურათების გეგმა" : "Image plan"}
            <textarea
              value={imagePlan}
              onChange={(event) => setImagePlan(event.target.value)}
              placeholder={
                isGeorgian
                  ? "მაგალითად: დამტკიცების შემდეგ ავტვირთავ ფასადის ფოტოს და შეთავაზებების მკაფიო სურათებს."
                  : "Example: Upload storefront photo and clear offer images after approval."
              }
              maxLength={220}
              rows={5}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6152]">
              {isGeorgian
                ? "ლოგო და შეთავაზებების სურათები დამტკიცების შემდეგ იმართება. ეს ნაბიჯი ბიზნესის პროფილის გაშვებამდე მომზადებაში გეხმარება."
                : "Logo and offer images are managed after approval. This step helps prepare the business profile before launch."}
            </span>
          </label>
        )}

        {step === 6 && (
          <div className="grid gap-3">
            {(isGeorgian
              ? [
                  ["ბიზნესი", name || "არ არის მითითებული"],
                  [
                    "ტიპი",
                    businessTypeLabel(businessType) || "არ არის მითითებული",
                  ],
                  ["მისამართი", address || "არ არის მითითებული"],
                  ["ტელეფონი", phone || "არ არის მითითებული"],
                  ["აღწერის მონახაზი", description || "ჯერ არ დამატებულა"],
                  ["სურათები", imagePlan || "ჯერ არ დამატებულა"],
                ]
              : [
                  ["Business", name || "Not provided"],
                  ["Type", businessType || "Not provided"],
                  ["Address", address || "Not provided"],
                  ["Phone", phone || "Not provided"],
                  ["Description draft", description || "Not added yet"],
                  ["Images", imagePlan || "Not added yet"],
                ]
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#f4efe4] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                  {label}
                </p>
                <p className="mt-1 break-words font-semibold text-[#2e2a22]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {step === 7 && (
          <div className="rounded-2xl bg-[#f4efe4] p-5">
            <h3 className="text-xl font-black text-[#2e2a22]">
              {isGeorgian ? "მზადაა განსახილველად" : "Ready for review"}
            </h3>
            <p className="mt-2 font-semibold leading-7 text-[#6b6152]">
              {isGeorgian
                ? "გაგზავნე ბიზნესი ადმინის დასამტკიცებლად. დამტკიცების შემდეგ პანელიდან შეძლებ შეთავაზებების შექმნას და ჯავშნების მართვას."
                : "Submit your business for admin approval. After approval, your dashboard will let you create offers and manage reservations."}
            </p>
          </div>
        )}
      </div>

      {draftMessage && (
        <p className="soft-raised mt-4 rounded-2xl px-4 py-3 text-sm font-black text-[#a67c52]">
          {draftMessage}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => saveDraft(true)}
          className="premium-button-secondary px-6 py-3"
        >
          {isGeorgian ? "პროგრესის შენახვა" : "Save Progress"}
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            disabled={step === 1}
            className="soft-raised min-h-12 rounded-full px-6 py-3 font-black text-[#6b6152] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeorgian ? "უკან" : "Back"}
          </button>

          {step < steps.length ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="premium-button px-6 py-3"
            >
              {isGeorgian ? "გაგრძელება" : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submitApplication}
              disabled={submitting || !accessReady || !canRegister}
              className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? t("businessRegister.submitting")
                : !accessReady
                ? isGeorgian
                  ? "წვდომა მოწმდება..."
                  : "Checking access..."
                : isGeorgian
                ? "ბიზნესის გაგზავნა"
                : "Submit Business"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
