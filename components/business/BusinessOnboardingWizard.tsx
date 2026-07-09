"use client";

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
  const [initialDraft] = useState<Draft | null>(() => readSavedDraft());
  const [step, setStep] = useState(() =>
    initialDraft?.step && initialDraft.step >= 1 && initialDraft.step <= steps.length
      ? initialDraft.step
      : 1
  );
  const [description, setDescription] = useState(
    () => initialDraft?.description || ""
  );
  const [imagePlan, setImagePlan] = useState(
    () => initialDraft?.imagePlan || ""
  );
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    if (!initialDraft) return;
    if (initialDraft.name) onNameChange(initialDraft.name);
    if (initialDraft.businessType) {
      onBusinessTypeChange(initialDraft.businessType);
    }
    if (initialDraft.address) onAddressChange(initialDraft.address);
    if (initialDraft.phone) onPhoneChange(initialDraft.phone);
  }, [
    initialDraft,
    onAddressChange,
    onBusinessTypeChange,
    onNameChange,
    onPhoneChange,
  ]);

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

    window.localStorage.setItem(
      BUSINESS_REGISTRATION_DRAFT_KEY,
      JSON.stringify(draft)
    );

    if (showMessage) {
      setDraftMessage("Progress saved on this device.");
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

  const currentStep = steps[step - 1];

  return (
    <div className="rounded-3xl bg-[#ece7da] p-5 sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c]">
            Step {step} of {steps.length}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#1a1815]">
            {currentStep.title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#6b6558]">
            {currentStep.helper}
          </p>
        </div>

        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#5c7a5c] shadow-[var(--shadow-soft)]">
          {progress}% complete
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#5c7a5c] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((wizardStep, index) => (
          <button
            key={wizardStep.title}
            type="button"
            onClick={() => goToStep(index + 1)}
            className={`min-h-11 rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
              step === index + 1
                ? "bg-[#1a1815] text-white"
                : "bg-white text-[#6b6558] hover:bg-white/70"
            }`}
          >
            {index + 1}. {wizardStep.title}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
        {step === 1 && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-black text-[#6b6558]">
              Business name *
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Bakery, cafe or restaurant name"
                maxLength={80}
                className="premium-input p-4 font-medium"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-[#6b6558]">
              Business type *
              <select
                value={businessType}
                onChange={(event) => onBusinessTypeChange(event.target.value)}
                className="premium-input p-4 font-medium"
              >
                <option value="Cafe">Cafe</option>
                <option value="Bakery">Bakery</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Supermarket">Supermarket</option>
                <option value="Hotel">Hotel</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6558]">
            Pickup address *
            <input
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="Street address in Tbilisi"
              maxLength={160}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6558]">
              Customers will use this address to collect reserved surprise bags.
            </span>
          </label>
        )}

        {step === 3 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6558]">
            Phone number *
            <input
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="+995 ..."
              maxLength={40}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6558]">
              Admins may use this number if they need to verify business
              details during approval.
            </span>
          </label>
        )}

        {step === 4 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6558]">
            Short description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: Fresh bakery items saved from today's closing stock."
              maxLength={220}
              rows={5}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6558]">
              This is saved as onboarding progress for now. You can use the
              dashboard profile tools after approval.
            </span>
          </label>
        )}

        {step === 5 && (
          <label className="grid gap-2 text-sm font-black text-[#6b6558]">
            Image plan
            <textarea
              value={imagePlan}
              onChange={(event) => setImagePlan(event.target.value)}
              placeholder="Example: Upload storefront photo and clear offer images after approval."
              maxLength={220}
              rows={5}
              className="premium-input p-4 font-medium"
            />
            <span className="font-semibold leading-6 text-[#6b6558]">
              Logo and offer images are managed after approval. This step helps
              prepare the business profile before launch.
            </span>
          </label>
        )}

        {step === 6 && (
          <div className="grid gap-3">
            {[
              ["Business", name || "Not provided"],
              ["Type", businessType || "Not provided"],
              ["Address", address || "Not provided"],
              ["Phone", phone || "Not provided"],
              ["Description draft", description || "Not added yet"],
              ["Images", imagePlan || "Not added yet"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#ece7da] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#6b6558]">
                  {label}
                </p>
                <p className="mt-1 break-words font-semibold text-[#1a1815]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {step === 7 && (
          <div className="rounded-2xl bg-[#ece7da] p-5">
            <h3 className="text-xl font-black text-[#1a1815]">
              Ready for review
            </h3>
            <p className="mt-2 font-semibold leading-7 text-[#6b6558]">
              Submit your business for admin approval. After approval, your
              dashboard will let you create offers and manage reservations.
            </p>
          </div>
        )}
      </div>

      {draftMessage && (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#5c7a5c] shadow-[var(--shadow-soft)]">
          {draftMessage}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => saveDraft(true)}
          className="premium-button-secondary px-6 py-3"
        >
          Save Progress
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            disabled={step === 1}
            className="min-h-12 rounded-full bg-white px-6 py-3 font-black text-[#6b6558] shadow-[var(--shadow-soft)] transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          {step < steps.length ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="premium-button px-6 py-3"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submitApplication}
              disabled={submitting || !accessReady || !canRegister}
              className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : !accessReady
                ? "Checking access..."
                : "Submit Business"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
