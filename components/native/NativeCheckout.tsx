"use client";

import PhoneGate from "@/components/PhoneGate";
import { isPhoneRequiredError, needsPhoneVerification } from "@/lib/phoneGate";
import { WaveEdge } from "@/components/design/Decor";
import { ArrowLeftIcon } from "@/components/icons";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import {
  getConfirmedUser,
  isEmailConfirmed,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { getUserErrorMessage } from "@/lib/errors";
import { translateUserMessage } from "@/lib/messageTranslations";
import { getNativeBrowser } from "@/lib/native";
import {
  getCachedOffer,
  sweepExpiredOffersOnce,
  type NativeOffer,
} from "@/lib/nativeData";
import { getOfferCategoryTone } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupTimeRange,
  getOfferDateLabel,
  getOriginalPrice,
  isOfferReservable,
} from "@/lib/offerLifecycle";
import { getLoginRedirectUrl } from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { useMinuteTick } from "@/lib/useMinuteTick";
import Link from "./AppLink";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tone = "success" | "error" | "warning";

// The same flow as app/checkout/[id]/page.tsx on one screen: the server route
// creates the hold and the TBC payment; nothing about payment is decided here.
export default function NativeCheckout() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language, t } = useLanguage();
  useMinuteTick();
  const offerId = Number(params.id);
  const checkoutPath = `/checkout/${offerId}`;
  const [offer, setOffer] = useState<NativeOffer | null>(() =>
    getCachedOffer(offerId)
  );
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(true);
  // First reservation: confirm a phone by SMS once (lib/phoneGate.ts).
  const [needsPhone, setNeedsPhone] = useState(false);
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<Tone>("warning");

  useEffect(() => {
    let active = true;

    // Both at once. The stored session decides what to show right away; the
    // server-checked user is confirmed again when the button is pressed.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      if (!session) {
        router.replace(getLoginRedirectUrl(checkoutPath));
        return;
      }

      if (!isEmailConfirmed(session.user)) {
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        return;
      }

      setBlocked(false);
      void needsPhoneVerification().then((required) => {
        if (active) setNeedsPhone(required);
      });
    });

    sweepExpiredOffersOnce();

    // A live read, never the cached public one: this is what gets paid for.
    void supabase
      .from("offers")
      .select("*, businesses(name, address, business_type, approved)")
      .eq("id", offerId)
      .eq("active", true)
      .gt("quantity", 0)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;

        const live = data as NativeOffer | null;

        if (error) {
          setMessageTone("error");
          setMessage("Checkout could not be loaded. Please try again.");
        } else if (!live || !isOfferReservable(live)) {
          setOffer(null);
          setMessageTone("warning");
          setMessage("This offer is no longer available for checkout.");
        } else {
          setOffer(live);
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [checkoutPath, offerId, router]);

  async function startCheckout() {
    setMessage("");

    if (!offer) return;

    if (!isOfferReservable(offer)) {
      setMessageTone("warning");
      setMessage("This offer is no longer available for reservation.");
      return;
    }

    const authResult = await getConfirmedUser();

    if (authResult.status === "signed_out") {
      setBlocked(true);
      router.replace(getLoginRedirectUrl(checkoutPath));
      return;
    }

    if (authResult.status === "unverified") {
      setBlocked(true);
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      return;
    }

    setPaying(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setBlocked(true);
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
        body: JSON.stringify({ offerId: offer.id, provider: "tbc" }),
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
        setNeedsPhone(true);
        setPaying(false);
        return;
      }
      setMessageTone("error");
      setMessage(
        getUserErrorMessage(
          paymentSession?.error ||
            "Secure payment checkout could not be started.",
          "Reservation could not be completed. Please try again."
        )
      );
      setPaying(false);
      return;
    }

    // App Store review demo bag: reserved without a bank page.
    if (paymentSession.provider === "review_demo") {
      router.replace(paymentSession.redirectUrl);
      return;
    }

    const nativeBrowser = getNativeBrowser();

    if (nativeBrowser) {
      // The bank page opens in an in-app browser sheet. A normal navigation to
      // the bank's host is handed to Safari/Chrome and leaves the app behind.
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

  async function confirm() {
    if (payingRef.current) return;
    payingRef.current = true;

    try {
      await startCheckout();
    } finally {
      payingRef.current = false;
    }
  }

  const oldPrice = offer ? getOriginalPrice(offer) : null;
  const free = offer ? Number(offer.price) === 0 : false;
  const unavailable = !loading && !offer;

  return (
    <main className="native-main">
      <header className="px-4 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <Link
            href={offer ? `/offers/${offer.id}` : "/"}
            aria-label={t("native.back")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-cream"
          >
            <ArrowLeftIcon className="h-[18px] w-[18px]" strokeWidth={2} />
          </Link>
          <h1 className="text-[17px] font-semibold text-cream">
            {t("native.checkout.title")}
          </h1>
        </div>
      </header>
      <WaveEdge />

      <section className="grid gap-3 px-4">
        {needsPhone && <PhoneGate onVerified={() => setNeedsPhone(false)} />}

        {!offer && loading && (
          <>
            <div className="native-skeleton h-[6.5rem] rounded-[26px]" />
            <div className="native-skeleton h-36 rounded-[22px]" />
          </>
        )}

        {offer && (
          <>
            <div
              className={`${getOfferCategoryTone(
                offer.category
              )} relative flex items-center gap-3 overflow-hidden rounded-[26px] bg-cat p-3.5 text-cat-ink`}
            >
              <span
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cat-soft"
              />
              <div className="photo-leaf-sm relative isolate h-[4.5rem] w-[4.5rem] flex-none">
                <OfferImage src={offer.image_url} alt={offer.title} sizes="72px" priority />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="font-serif text-base font-bold leading-snug">
                  {offer.title}
                </p>
                <p className="truncate text-[13px] text-cat-ink-2">
                  {offer.businesses?.name || t("common.business")}
                </p>
                <p className="truncate text-[13px] font-medium text-cat-ink-2">
                  {getOfferDateLabel(offer, language)}{" "}
                  {formatPickupTimeRange(offer, language)}
                </p>
              </div>
            </div>

            <p className="flex items-baseline justify-between rounded-[22px] bg-card p-4 font-bold shadow-[var(--shadow-card)]">
              <span>{t("native.checkout.total")}</span>
              <span className="flex items-baseline gap-2">
                {oldPrice !== null && (
                  <span className="text-sm font-normal text-body line-through">
                    {formatMoney(oldPrice)}
                  </span>
                )}
                <span className="text-[1.625rem]">{formatMoney(offer.price)}</span>
              </span>
            </p>
          </>
        )}

        {message && (
          <Notice tone={messageTone}>
            {translateUserMessage(message, language)}
          </Notice>
        )}

        {messageTone === "error" && message && offer && (
          <Link
            href={`${checkoutPath}?full=1`}
            className="text-center text-sm font-bold underline underline-offset-2"
          >
            {t("native.checkout.fullPage")}
          </Link>
        )}

        {unavailable && (
          <Link
            href="/"
            className="premium-button w-full rounded-2xl px-6 py-3 font-bold"
          >
            {t("native.orders.emptyAction")}
          </Link>
        )}
      </section>

      {offer && (
        <div className="theme-forest native-fixed-bottom fixed inset-x-3 z-40 rounded-3xl bg-brand-forest p-3">
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={paying || blocked || needsPhone || !isOfferReservable(offer)}
            className="native-press flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand-mint text-base font-bold text-brand-forest disabled:cursor-not-allowed disabled:bg-brand-forest-2 disabled:text-brand-mint"
          >
            {paying
              ? t("checkout.reserving")
              : !isOfferReservable(offer)
              ? t("common.unavailable")
              : free
              ? t("native.offer.reserve")
              : `${t("native.checkout.pay")} · ${formatMoney(offer.price)}`}
          </button>
          <p className="mt-2 text-center text-[11px] leading-snug text-brand-ground/80">
            {t(free ? "native.checkout.freeNote" : "native.checkout.payNote")}
            {" · "}
            <Link href="/terms" className="underline underline-offset-2">
              {t("native.checkout.cancelNote")}
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
