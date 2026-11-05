"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import {
  BusinessOnboardingWizard,
  clearBusinessRegistrationDraft,
  type BusinessApplication,
  type CompanyDetails,
} from "@/components/business/BusinessOnboardingWizard";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { getUserErrorMessage } from "@/lib/errors";
import { translateUserMessage } from "@/lib/messageTranslations";
import { notifyBusinessRegistrationSubmitted } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import type { LegalForm } from "@/lib/verification";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WizardSetup = {
  userId: string;
  phoneVerified: boolean;
  initialCompany: Partial<CompanyDetails> | null;
  hasExistingBag: boolean;
  rejectionReason: string | null;
};

export default function BusinessRegisterPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";
  const [setup, setSetup] = useState<WizardSetup | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "warning">("error");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const authResult = await getConfirmedUser();

      if (!active) return;

      if (authResult.status === "signed_out") {
        router.replace("/login?redirect=/business/register");
        return;
      }

      if (authResult.status === "unverified") {
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        return;
      }

      const profile = await getProfileById(authResult.user.id, 4);

      if (!active) return;

      if (!profile) {
        setMessageTone("warning");
        setMessage(
          "Your account profile is still being created. Please wait a moment and try again."
        );
        return;
      }

      if (profile.role !== "business") {
        setMessageTone("warning");
        setMessage("Only business accounts can register a business.");
        return;
      }

      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, business_type, address, approved, rejected_at, rejection_reason")
        .eq("owner_id", authResult.user.id);

      if (!active) return;

      const rows = businesses || [];
      const rejected = rows.find((row) => row.rejected_at);

      if (!rejected && rows.some((row) => !row.approved)) {
        setMessageTone("warning");
        setMessage("You already have a business application waiting for admin approval.");
        return;
      }

      let initialCompany: Partial<CompanyDetails> | null = null;
      let hasExistingBag = false;

      // A rejected application reopens with its saved details. The IBAN and the
      // extract are entered again: the owner can't read them back.
      if (rejected) {
        const [{ data: verification }, { count }] = await Promise.all([
          supabase
            .from("business_verifications")
            .select("legal_name, id_code, legal_form, owner_full_name")
            .eq("business_id", rejected.id)
            .maybeSingle(),
          supabase
            .from("bag_templates")
            .select("id", { count: "exact", head: true })
            .eq("business_id", rejected.id),
        ]);

        if (!active) return;

        initialCompany = {
          name: rejected.name || "",
          businessType: rejected.business_type || "Cafe",
          address: rejected.address || "",
          legalName: verification?.legal_name || "",
          idCode: verification?.id_code || "",
          legalForm: (verification?.legal_form as LegalForm) || "llc",
          ownerFullName: verification?.owner_full_name || "",
        };
        hasExistingBag = Boolean(count);
      }

      setSetup({
        userId: authResult.user.id,
        phoneVerified: Boolean(authResult.user.phone_confirmed_at && authResult.user.phone),
        initialCompany,
        hasExistingBag,
        rejectionReason: rejected?.rejection_reason ?? null,
      });
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  async function submitApplication(application: BusinessApplication) {
    if (submitting || !setup) return;

    setSubmitting(true);
    setMessage("");
    setMessageTone("error");

    const { company, iban, extractFile, firstBag } = application;
    const extension = extractFile.type === "application/pdf" ? "pdf" : "jpg";
    const extractPath = `${setup.userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("business-documents")
      .upload(extractPath, extractFile, { contentType: extractFile.type });

    if (uploadError) {
      setSubmitting(false);
      setMessage("The extract could not be uploaded. Please try again.");
      return;
    }

    const { error } = await supabase.rpc("submit_business_application", {
      p_name: company.name,
      p_business_type: company.businessType,
      p_address: company.address,
      p_legal_name: company.legalName,
      p_id_code: company.idCode,
      p_legal_form: company.legalForm,
      p_owner_full_name: company.ownerFullName,
      p_iban: iban,
      p_registry_extract_path: extractPath,
      p_bag_title: firstBag?.title ?? null,
      p_bag_category: firstBag?.category ?? null,
      p_bag_size: firstBag?.size ?? null,
      p_bag_price: firstBag ? Number(firstBag.price) : null,
      p_bag_old_price: firstBag?.oldPrice.trim() ? Number(firstBag.oldPrice) : null,
      p_bag_daily_quantity: firstBag ? Number(firstBag.dailyQuantity) : null,
      p_bag_pickup_start: firstBag?.pickupStart ?? null,
      p_bag_pickup_end: firstBag?.pickupEnd ?? null,
    });

    setSubmitting(false);

    if (error) {
      setMessage(
        getUserErrorMessage(
          error,
          "Business registration could not be submitted. Please check the details and try again."
        )
      );
      return;
    }

    clearBusinessRegistrationDraft();
    setSubmitted(true);
    notifyBusinessRegistrationSubmitted({ businessName: company.name });
  }

  return (
    <main className="app-shell">
      <Navbar />

      <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-semibold text-cream sm:text-4xl">
          {t("businessRegister.title")}
        </h1>
        <p className="mt-2 text-body">{t("businessRegister.subtitle")}</p>

        {setup?.rejectionReason && !submitted && (
          <div className="mt-5">
            <Notice tone="warning">
              {isGeorgian ? "უარის მიზეზი: " : "Reason for rejection: "}
              {setup.rejectionReason}
            </Notice>
          </div>
        )}

        <div className="mt-6">
          {submitted ? (
            <div className="ui-card rounded-3xl p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-cream">
                {isGeorgian ? "განაცხადი გაიგზავნა ✓" : "Application sent ✓"}
              </h2>
              <p className="mt-2 text-body">
                {isGeorgian
                  ? "დამტკიცების შემდეგ ელფოსტით მოგწერთ."
                  : "We'll email you once it's approved."}
              </p>
              <Link href="/business/dashboard" className="premium-button mt-5 px-6 py-3">
                {t("nav.dashboard")}
              </Link>
            </div>
          ) : (
            setup && (
              <BusinessOnboardingWizard
                initialCompany={setup.initialCompany}
                phoneAlreadyVerified={setup.phoneVerified}
                hasExistingBag={setup.hasExistingBag}
                submitting={submitting}
                onSubmit={(application) => void submitApplication(application)}
              />
            )
          )}
        </div>

        {message && (
          <div className="mt-4">
            <Notice tone={messageTone}>{translateUserMessage(message, language)}</Notice>
          </div>
        )}
      </section>
    </main>
  );
}
