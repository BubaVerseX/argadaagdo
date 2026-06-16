"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import {
  getConfirmedUser,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { notifyReservationConfirmed } from "@/lib/notifications";
import { formatPickupWindow, isOfferReservable } from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CheckoutOffer = Offer & {
  businesses?: {
    name: string;
    address: string;
    business_type: string;
  } | null;
};

type CheckoutOfferResult =
  | { status: "success"; offer: CheckoutOffer }
  | { status: "error" | "warning"; message: string };

async function fetchCheckoutOffer(
  offerId: number,
): Promise<CheckoutOfferResult> {
  if (!Number.isFinite(offerId) || offerId <= 0) {
    return {
      status: "error",
      message: "This checkout link is not valid.",
    };
  }

  await processExpiredMarketplace();

  const { data, error } = await supabase
    .from("offers")
    .select("*, businesses(name, address, business_type)")
    .eq("id", offerId)
    .eq("active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: "Checkout could not be loaded. Please try again.",
    };
  }

  if (!data) {
    return {
      status: "warning",
      message: "This offer is no longer available for checkout.",
    };
  }

  return { status: "success", offer: data as CheckoutOffer };
}

function getReservationErrorMessage(message?: string) {
  const normalizedMessage = (message || "").toLowerCase();

  if (normalizedMessage.includes("at most 3 active reservations")) {
    return "You already have 3 active reservations. Complete or cancel one before reserving another.";
  }

  if (normalizedMessage.includes("not logged in")) {
    return "Please sign in first.";
  }

  if (normalizedMessage.includes("offer sold out")) {
    return "Offer is sold out.";
  }

  if (normalizedMessage.includes("offer is not available")) {
    return "This offer is no longer available for checkout. It may be expired, sold out, or inactive.";
  }

  if (normalizedMessage.includes("restricted customer")) {
    return "Only customer accounts in good standing can reserve offers.";
  }

  return message || "Demo payment could not be completed.";
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const offerId = useMemo(() => Number(params.id), [params.id]);

  const [offer, setOffer] = useState<CheckoutOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [checkoutBlocked, setCheckoutBlocked] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");

  useEffect(() => {
    let isCurrent = true;

    async function checkCheckoutAccess() {
      const authResult = await getConfirmedUser();

      if (!isCurrent) return;

      if (authResult.status === "signed_out") {
        setCheckoutBlocked(true);
        setMessageTone("warning");
        setMessage("Please sign in first.");
        return;
      }

      if (authResult.status === "unverified") {
        setCheckoutBlocked(true);
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        return;
      }

      setCheckoutBlocked(false);
    }

    async function loadInitialOffer() {
      const result = await fetchCheckoutOffer(offerId);

      if (!isCurrent) return;

      if (result.status === "success") {
        setOffer(result.offer);
        setLoading(false);
        return;
      }

      setOffer(null);
      setMessageTone(result.status);
      setMessage(result.message);
      setLoading(false);
    }

    void checkCheckoutAccess();
    void loadInitialOffer();

    return () => {
      isCurrent = false;
    };
  }, [offerId, router]);

  async function refreshOffer() {
    const result = await fetchCheckoutOffer(offerId);

    if (result.status === "success") {
      setOffer(result.offer);
    }
  }

  async function confirmMockPayment() {
    if (paying) return;

    setMessage("");

    if (!offer) return;

    if (!rulesAccepted) {
      setMessageTone("warning");
      setMessage(
        "Please confirm that you understand the pickup and cancellation rules."
      );
      return;
    }

    if (!isOfferReservable(offer)) {
      setMessageTone("warning");
      setMessage("This offer is no longer available for reservation.");
      await refreshOffer();
      return;
    }

    const authResult = await getConfirmedUser();

    if (authResult.status === "signed_out") {
      setCheckoutBlocked(true);
      setMessageTone("warning");
      setMessage("Please sign in first.");
      return;
    }

    if (authResult.status === "unverified") {
      setCheckoutBlocked(true);
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      return;
    }

    setPaying(true);

    const { error } = await supabase.rpc("mock_pay_and_reserve_offer", {
      p_offer_id: offer.id,
    });

    if (error) {
      setMessageTone("error");
      setMessage(getReservationErrorMessage(error.message));
      setPaying(false);
      await refreshOffer();
      return;
    }

    notifyReservationConfirmed({
      offerId: offer.id,
      offerTitle: offer.title,
      businessName: offer.businesses?.name,
      pickupStart: offer.pickup_start,
      pickupEnd: offer.pickup_end,
    });

    setMessageTone("success");
    setMessage("Payment confirmed. Your pickup code is in Orders.");
    router.push("/orders");
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-10">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("common.continueCheckout")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("checkout.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:text-lg">
              {t("checkout.subtitle")}
            </p>
          </div>

          {message && (
            <div className="mt-5 sm:mt-6">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          {loading && (
            <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
              <p className="font-semibold text-gray-600">
                {t("common.loading")}
              </p>
            </div>
          )}

          {!loading && offer && (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm sm:rounded-[2rem]">
                <div className="relative h-64 bg-gradient-to-br from-green-100 to-yellow-100 sm:h-80">
                  <OfferImage
                    src={offer.image_url}
                    alt={offer.title}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>

                <div className="p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-green-700">
                        {offer.businesses?.business_type || t("common.food")}
                      </p>
                      <h2 className="mt-2 text-3xl font-black">
                        {offer.title}
                      </h2>
                      <p className="mt-2 text-lg font-bold text-gray-800">
                        {offer.businesses?.name || t("common.business")}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-green-50 px-5 py-4 text-center">
                      <p className="text-xs font-black text-green-700">
                        {t("offers.boxesLeft")}
                      </p>
                      <p className="text-3xl font-black text-green-800">
                        {offer.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 font-semibold text-gray-700">
                    <p>{t("common.pickup")}: {formatPickupWindow(offer, language)}</p>
                    <p>
                      {t("checkout.address")}:{" "}
                      {offer.businesses?.address || t("common.addressUnavailable")}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
                <h2 className="text-2xl font-black">{t("checkout.summary")}</h2>

                <div className="mt-6 grid gap-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-semibold text-gray-600">
                      {t("checkout.rescueBox")}
                    </span>
                    <span className="text-3xl font-black text-green-700">
                      ₾{offer.price}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-600">
                      {t("checkout.quantityRemaining")}
                    </span>
                    <span className="font-black text-gray-950">
                      {offer.quantity}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-sm font-black uppercase tracking-widest text-green-700">
                      {t("checkout.cancellationPolicy")}
                    </p>
                    <p className="mt-2 text-sm font-bold text-green-900">
                      {t("orders.cancelPolicy")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-yellow-50 p-4">
                    <p className="text-sm font-black uppercase tracking-widest text-yellow-700">
                      {t("checkout.noShowWarning")}
                    </p>
                    <p className="mt-2 text-sm font-bold text-yellow-900">
                      {t("checkout.noShowText")}
                    </p>
                  </div>

                  {offer.old_price && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-600">
                        {t("checkout.regularPrice")}
                      </span>
                      <span className="font-black text-gray-400 line-through">
                        ₾{offer.old_price}
                      </span>
                    </div>
                  )}

                  <div className="rounded-2xl bg-[#F7F6EF] p-4">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">
                      {t("checkout.paymentMethod")}
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {t("checkout.demoPayment")}
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-green-100 bg-white p-4 font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={rulesAccepted}
                      onChange={(event) =>
                        setRulesAccepted(event.target.checked)
                      }
                      className="mt-1 h-5 w-5 shrink-0 accent-green-700"
                    />
                    <span>
                      {t("checkout.rules")}
                    </span>
                  </label>
                </div>

                <button
                  onClick={confirmMockPayment}
                  disabled={
                    paying ||
                    checkoutBlocked ||
                    !rulesAccepted ||
                    !isOfferReservable(offer)
                  }
                  className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paying
                    ? t("checkout.reserving")
                    : !isOfferReservable(offer)
                    ? Number(offer.quantity || 0) <= 0
                      ? t("common.soldOut")
                      : t("common.unavailable")
                    : t("checkout.payReserve")}
                </button>

                {checkoutBlocked && (
                  <Link
                    href="/login"
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 py-3 font-black text-green-700 ring-1 ring-green-100 transition hover:bg-green-50"
                  >
                    {t("nav.signIn")}
                  </Link>
                )}

                <Link
                  href="/offers"
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-50 px-6 py-3 font-black text-green-700 transition hover:bg-green-100"
                >
                  {t("offerDetail.back")}
                </Link>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
