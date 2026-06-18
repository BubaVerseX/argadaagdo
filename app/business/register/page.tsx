"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BusinessRegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("Cafe");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [submitting, setSubmitting] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [canRegister, setCanRegister] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const authResult = await getConfirmedUser();

      if (!active) return;

      if (authResult.status === "signed_out") {
        router.replace("/login");
        return;
      }

      if (authResult.status === "unverified") {
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        setCanRegister(false);
        setAccessReady(true);
        return;
      }

      const profile = await getProfileById(authResult.user.id, 4);

      if (!active) return;

      if (!profile) {
        setMessageTone("warning");
        setMessage(
          "Your account profile is still being created. Please wait a moment and try again."
        );
        setCanRegister(false);
        setAccessReady(true);
        return;
      }

      if (profile.role !== "business") {
        setMessageTone("warning");
        setMessage("Only business accounts can register a business.");
        setCanRegister(false);
        setAccessReady(true);
        return;
      }

      setCanRegister(true);
      setAccessReady(true);
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  async function registerBusiness() {
    if (submitting) return;

    setMessage("");
    setMessageTone("error");

    if (!canRegister) {
      setMessage("Please sign in first.");
      return;
    }

    if (!name.trim()) {
      setMessage("Business name is required.");
      return;
    }

    if (!address.trim()) {
      setMessage("Address is required.");
      return;
    }

    if (!phone.trim()) {
      setMessage("Phone number is required.");
      return;
    }

    setSubmitting(true);
    const authResult = await getConfirmedUser();

    if (authResult.status === "signed_out") {
      setSubmitting(false);
      router.push("/login");
      return;
    }

    if (authResult.status === "unverified") {
      setSubmitting(false);
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      return;
    }

    const userId = authResult.user.id;
    const profile = await getProfileById(userId, 4);

    if (!profile) {
      setSubmitting(false);
      setMessage(
        "Your account profile is still being created. Please wait a moment and try again."
      );
      return;
    }

    if (profile.role !== "business") {
      setSubmitting(false);
      setMessageTone("warning");
      setMessage("Only business accounts can register a business.");
      return;
    }

    const { error } = await supabase.from("businesses").insert({
      owner_id: userId,
      name: name.trim(),
      business_type: businessType,
      address: address.trim(),
      phone: phone.trim(),
      approved: false,
    });

    if (error) {
      setSubmitting(false);
      setMessage(
        error.message.includes("row-level security")
          ? "Business registration was blocked by security rules. Please make sure you are signed in and try again."
          : error.message
      );
      return;
    }

    setName("");
    setBusinessType("Cafe");
    setAddress("");
    setPhone("");

    setSubmitting(false);
    setMessageTone("success");
    setMessage("Business submitted. Waiting for admin approval.");
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-900">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                {t("businessRegister.badge")}
              </p>

              <h1 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl md:text-6xl">
                {t("businessRegister.title")}
              </h1>

              <p className="mt-4 text-base font-medium leading-7 text-gray-700 sm:mt-5 sm:text-lg sm:leading-8">
                {t("businessRegister.subtitle")}
              </p>

              <div className="mt-8 grid gap-4">
                <div className="rounded-3xl bg-green-50 p-5">
                  <h3 className="text-xl font-black text-green-800">
                    {t("businessRegister.step1")}
                  </h3>
                  <p className="mt-2 font-medium text-green-700">
                    {t("businessRegister.step1Text")}
                  </p>
                </div>

                <div className="rounded-3xl bg-yellow-50 p-5">
                  <h3 className="text-xl font-black text-yellow-800">
                    {t("businessRegister.step2")}
                  </h3>
                  <p className="mt-2 font-medium text-yellow-700">
                    {t("businessRegister.step2Text")}
                  </p>
                </div>

                <div className="rounded-3xl bg-green-50 p-5">
                  <h3 className="text-xl font-black text-green-800">
                    {t("businessRegister.step3")}
                  </h3>
                  <p className="mt-2 font-medium text-green-700">
                    {t("businessRegister.step3Text")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-[#F7F6EF] p-5 sm:rounded-[2rem] sm:p-6">
              <h2 className="text-2xl font-black text-gray-950">
                {t("businessRegister.details")}
              </h2>

              <div className="mt-6 grid gap-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("businessRegister.name")}
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                />

                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                >
                  <option value="Cafe">Cafe</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Supermarket">Supermarket</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("businessRegister.address")}
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                />

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("businessRegister.phone")}
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                />

                <button
                  type="button"
                  onClick={registerBusiness}
                  disabled={submitting || !accessReady || !canRegister}
                  className="min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
                >
                  {submitting
                    ? t("businessRegister.submitting")
                    : !accessReady
                    ? t("businessRegister.checking")
                    : t("businessRegister.submit")}
                </button>

                {message && (
                  <Notice tone={messageTone}>{message}</Notice>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
