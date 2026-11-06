"use client";

import PhoneGate from "@/components/PhoneGate";
import { isPhoneRequiredError } from "@/lib/phoneGate";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeCheckoutScreen } from "@/components/native/screens";
import OfferImage from "@/components/OfferImage";
import { WaveEdge } from "@/components/design/Decor";
import { ArrowLeftIcon } from "@/components/icons";
import {
  getConfirmedUser,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { getUserErrorMessage } from "@/lib/errors";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  formatMoney,
  getOriginalPrice,
  formatPickupTimeRange,
  getOfferDateLabel,
  isOfferReservable,
} from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { getOfferCategoryTone } from "@/lib/offerCategories";
import { useLanguage } from "@/lib/useLanguage";
import { useMinuteTick } from "@/lib/useMinuteTick";
import { getNativeBrowser } from "@/lib/native";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type CheckoutOffer = Offer & {
  businesses?: {
    name: string;
    address: string;
    business_type: string;
    approved?: boolean | string | null;
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
    .select("*, businesses(name, address, business_type, approved)")
    .eq("id", offerId)
    .eq("active", true)
    .gt("quantity", 0)
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

  const offer = data as CheckoutOffer;

  if (!isOfferReservable(offer)) {
    return {
      status: "warning",
      message: "This offer is no longer available for checkout.",
    };
  }

  return { status: "success", offer };
}

function getReservationErrorMessage(message?: string) {
  return getUserErrorMessage(
    message,
    "Reservation could not be completed. Please try again."
  );
}

function getLoginRedirectUrl(path: string) {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const offerId = useMemo(() => Number(params.id), [params.id]);
  const checkoutPath = useMemo(
    () =>
      Number.isFinite(offerId) && offerId > 0
        ? `/checkout/${offerId}`
        : "/discover",
    [offerId]
  );

  useMinuteTick();
  const [offer, setOffer] = useState<CheckoutOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  // Set synchronously so a double tap can't start two checkouts (and two
  // inventory holds) while the auth check below is still awaiting.
  const payingRef = useRef(false);
  const [phoneRequired, setPhoneRequired] = useState(false);
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
        router.replace(getLoginRedirectUrl(checkoutPath));
        return;
      }

      if (authResult.status === "unverified") {
        setCheckoutBlocked(true);
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        return;
      }

      setCheckoutBlocked(false);

      // Off until the second verification migration is applied.
      const { data: required } = await supabase.rpc(
        "phone_verification_required"
      );

      if (isCurrent) setPhoneRequired(required === true);
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
  }, [checkoutPath, offerId, router]);

  async function refreshOffer() {
    const result = await fetchCheckoutOffer(offerId);

    if (result.status === "success") {
      setOffer(result.offer);
      return;
    }

    // The offer sold out or expired while the user was on this page — don't
    // keep showing it as payable.
    setOffer(null);
  }

  async function confirmPilotReservation() {
    if (payingRef.current) return;

    payingRef.current = true;

    try {
      await startCheckout();
    } finally {
      payingRef.current = false;
    }
  }

  async function startCheckout() {
    setMessage("");

    if (!offer) return;

    if (phoneRequired) {
      setMessageTone("warning");
      setMessage("Please verify your phone number before ordering.");
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
      router.replace(getLoginRedirectUrl(checkoutPath));
      return;
    }

    if (authResult.status === "unverified") {
      setCheckoutBlocked(true);
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      return;
    }

    setPaying(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setCheckoutBlocked(true);
      router.replace(getLoginRedirectUrl(checkoutPath));
      return;
    }

    let response: Response;

    try {
      response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId: offer.id,
          provider: "tbc",
        }),
      });
    } catch {
      setMessageTone("error");
      setMessage("Network problem. Please check your connection and try again.");
      setPaying(false);
      return;
    }

    const paymentSession = await response.json().catch(() => null);

    if (!response.ok || !paymentSession?.redirectUrl) {
      if (isPhoneRequiredError(paymentSession?.error)) {
        setPhoneRequired(true);
        setPaying(false);
        return;
      }
      setMessageTone("error");
      setMessage(
        getReservationErrorMessage(
          paymentSession?.error ||
            "Secure payment checkout could not be started."
        )
      );
      setPaying(false);
      await refreshOffer();
      return;
    }

    // App Store review demo bag: reserved without a bank page.
    if (paymentSession.provider === "review_demo") {
      router.replace(paymentSession.redirectUrl);
      return;
    }

    const nativeBrowser = getNativeBrowser();

    if (nativeBrowser) {
      // iOS/Android app: open the bank page in an in-app browser sheet. A
      // normal navigation to the bank's host is handed to Safari/Chrome,
      // where the customer isn't signed in and the app stays on this page.
      // When the sheet closes (paid or not), show the customer's orders —
      // the payment itself is confirmed server-side by the bank callback.
      try {
        const finishedListener = await nativeBrowser.addListener(
          "browserFinished",
          () => {
            void finishedListener.remove();
            router.replace("/orders");
          }
        );
        await nativeBrowser.open({ url: paymentSession.redirectUrl });
        return;
      } catch {
        // Fall through to a normal navigation if the plugin fails.
      }
    }

    window.location.assign(paymentSession.redirectUrl);
  }

  const free = offer ? Number(offer.price) === 0 : false;

  return (
    <main className="app-shell">
      <Navbar hideBottomNav />

      <section className="theme-forest bg-page px-4 pb-3 pt-3 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Link
            href={Number.isFinite(offerId) && offerId > 0 ? `/offers/${offerId}` : "/discover"}
            aria-label={t("native.back")}
            className="ui-well flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 text-cream"
          >
            <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
          </Link>
          <h1 className="min-w-0 font-serif text-[1.375rem] font-bold leading-tight text-cream sm:text-3xl">
            {t("native.checkout.title")}
          </h1>
        </div>
      </section>
      <WaveEdge />

      <section className="px-4 pb-32 pt-2 sm:px-6 md:px-12 lg:pb-6">
        <div className="mx-auto max-w-xl">
          {message && (
            <div className="mt-5">
              <Notice tone={messageTone}>
                {translateUserMessage(message, language)}
              </Notice>
            </div>
          )}

          {loading && (
            <div className="mt-5 h-28 animate-pulse rounded-[22px] bg-well" aria-busy="true" />
          )}

          {!loading && !offer && (
            <Link
              href="/discover"
              className="premium-button mt-5 w-full rounded-2xl px-6 py-3 font-bold"
            >
              {t("native.orders.emptyAction")}
            </Link>
          )}

          {!loading && offer && (
            <>
              <div className={`${getOfferCategoryTone(offer.category)} mt-5 flex items-center gap-4 rounded-[22px] bg-cat p-3.5`}>
                <div className="photo-frame relative isolate h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                  <OfferImage src={offer.image_url} alt={offer.title} sizes="80px" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-lg font-bold leading-snug text-cat-ink">
                    {offer.title}
                  </h2>
                  <p className="truncate text-sm text-cat-ink/80">
                    {offer.businesses?.name || t("common.business")}
                  </p>
                  <p className="text-sm text-cat-ink/80">
                    {getOfferDateLabel(offer, language)} {formatPickupTimeRange(offer, language)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-4 rounded-[22px] bg-well p-4">
                <span className="font-semibold text-body">{t("native.checkout.total")}</span>
                <span className="flex items-baseline gap-2">
                  {getOriginalPrice(offer) !== null && (
                    <span className="text-sm text-muted line-through">
                      {formatMoney(getOriginalPrice(offer))}
                    </span>
                  )}
                  <span className="text-3xl font-semibold text-mint">
                    {formatMoney(offer.price)}
                  </span>
                </span>
              </div>

              {phoneRequired && (
                <div className="mt-3">
                  <PhoneGate
                    onVerified={() => {
                      setPhoneRequired(false);
                      setMessage("");
                    }}
                  />
                </div>
              )}

              {checkoutBlocked && (
                <Link
                  href={getLoginRedirectUrl(checkoutPath)}
                  className="premium-button-secondary mt-3 w-full px-6 py-3"
                >
                  {t("nav.signIn")}
                </Link>
              )}

              <div className="theme-forest fixed inset-x-3 bottom-[calc(0.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] z-40 rounded-3xl bg-page p-3 lg:static lg:mt-5">
                <button
                  onClick={confirmPilotReservation}
                  disabled={
                    paying ||
                    checkoutBlocked ||
                    phoneRequired ||
                    !isOfferReservable(offer)
                  }
                  className="premium-button w-full rounded-2xl px-6 py-3 font-bold disabled:cursor-not-allowed"
                >
                  {paying
                    ? t("checkout.reserving")
                    : !isOfferReservable(offer)
                    ? Number(offer.quantity || 0) <= 0
                      ? t("common.soldOut")
                      : t("common.unavailable")
                    : free
                    ? t("native.offer.reserve")
                    : `${t("native.checkout.pay")} · ${formatMoney(offer.price)}`}
                </button>
                <p className="mt-2 text-center text-[11px] leading-snug text-body">
                  {t(free ? "native.checkout.freeNote" : "native.checkout.payNote")}
                  {" · "}
                  <Link href="/terms" className="underline underline-offset-2">
                    {t("native.checkout.cancelNote")}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default withNativeScreen(CheckoutPage, NativeCheckoutScreen);
