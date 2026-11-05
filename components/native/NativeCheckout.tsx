"use client";

import { WaveEdge } from "@/components/design/Decor";
import { ArrowLeftIcon, LockIcon } from "@/components/icons";
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
import { getGreenBagLabel, getOfferCategoryTone } from "@/lib/offerCategories";
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
import Link from "next/link";
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
  const [rulesAccepted, setRulesAccepted] = useState(false);
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
  const savings = offer && oldPrice !== null ? oldPrice - Number(offer.price) : 0;
  const unavailable = !loading && !offer;

  return (
    <main className="native-main">
      <header className="theme-forest bg-brand-forest px-4 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <Link
            href={offer ? `/offers/${offer.id}` : "/"}
            aria-label={t("native.back")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-forest-2 text-brand-ground"
          >
            <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
          </Link>
          <h1 className="font-serif text-[1.375rem] font-bold text-brand-ground">
            {t("native.checkout.title")}
          </h1>
        </div>
      </header>
      <WaveEdge />

      <section className="grid gap-3 px-4">
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
                <p className="truncate font-serif text-base font-bold">
                  {offer.businesses?.name || t("common.business")}
                </p>
                <p className="truncate text-[13px] text-cat-ink-2">
                  {getGreenBagLabel(offer, language)}
                </p>
                <p className="truncate text-[13px] font-medium text-cat-ink-2">
                  {getOfferDateLabel(offer, language)}{" "}
                  {formatPickupTimeRange(offer, language)}
                </p>
              </div>
            </div>

            <div className="rounded-[22px] bg-card p-4 shadow-[var(--shadow-card)]">
              {oldPrice !== null && (
                <>
                  <p className="flex justify-between text-sm text-body">
                    <span>{t("native.checkout.regular")}</span>
                    <span className="line-through">{formatMoney(oldPrice)}</span>
                  </p>
                  <p className="mt-1.5 flex justify-between text-sm font-bold text-cream">
                    <span>{t("native.checkout.save")}</span>
                    <span>−{formatMoney(savings)}</span>
                  </p>
                  <div className="my-3 h-px bg-line" />
                </>
              )}
              <p className="flex items-baseline justify-between font-bold">
                <span>{t("native.checkout.total")}</span>
                <span className="text-[1.625rem]">{formatMoney(offer.price)}</span>
              </p>
            </div>

            <p className="flex items-center gap-2.5 rounded-[18px] bg-well px-4 py-3 text-[13px] leading-snug">
              <LockIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {t("native.checkout.secure")}
            </p>

            {Number(offer.price) === 0 && (
              <Notice tone="success">
                {language === "ka"
                  ? "სადემონსტრაციო ჯავშანი App Review-სთვის: გადახდა არ ხდება."
                  : "Demo reservation for App Review: no payment is taken."}
              </Notice>
            )}

            <label className="flex min-h-11 items-start gap-3 px-1 text-sm leading-snug">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(event) => setRulesAccepted(event.target.checked)}
                className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-brand-forest"
              />
              <span>
                {t("native.checkout.rules")}{" "}
                <Link href="/terms" className="font-bold underline underline-offset-2">
                  {t("native.checkout.rulesLink")}
                </Link>
              </span>
            </label>
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
            disabled={paying || blocked || !rulesAccepted || !isOfferReservable(offer)}
            className="native-press flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand-mint text-base font-bold text-brand-forest disabled:cursor-not-allowed disabled:bg-brand-forest-2 disabled:text-brand-mint"
          >
            {paying
              ? t("checkout.reserving")
              : !isOfferReservable(offer)
              ? t("common.unavailable")
              : `${t("native.checkout.pay")} · ${formatMoney(offer.price)}`}
          </button>
        </div>
      )}
    </main>
  );
}
