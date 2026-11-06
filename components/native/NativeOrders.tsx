"use client";

import { LeafDecor } from "@/components/design/Decor";
import { LeafIcon } from "@/components/icons";
import Notice from "@/components/Notice";
import { CollectSlider } from "@/components/orders/CollectSlider";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrdersStats } from "@/components/orders/OrdersHeader";
import {
  getProfileById,
  isEmailConfirmed,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { logAppError } from "@/lib/errors";
import { createMapsSearchUrl } from "@/lib/maps";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  readPrivateMemory,
  sweepExpiredOffersOnce,
  writePrivateMemory,
} from "@/lib/nativeData";
import {
  notifyOrderCancelled,
  notifyPickupCompleted,
  notifyRatingSubmitted,
} from "@/lib/notifications";
import { getOfferCategoryTone } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupTimeRange,
  formatReviewDate,
  getOfferDateLabel,
} from "@/lib/offerLifecycle";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import {
  getEffectiveOrderStatus,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
  isPendingPaymentOrderStatus,
} from "@/lib/orderStatus";
import {
  canShowCancellationAvailable,
  getCancellationErrorMessage,
  getCustomerStatusLabel,
  getLoginRedirectUrl,
  isCollectWindowOpen,
} from "@/lib/orders";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import type { Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useMinuteTick } from "@/lib/useMinuteTick";
import { validateTextField } from "@/lib/validation";
import Link from "./AppLink";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tone = "success" | "error" | "warning";

const PAYMENT_RETURN_MESSAGES: Record<string, { tone: Tone; message: string }> = {
  success: {
    tone: "success",
    message: "Payment confirmed. Your pickup code is ready below.",
  },
  pending: {
    tone: "warning",
    message: "Payment is still being confirmed. Refresh this page in a moment.",
  },
  failed: {
    tone: "error",
    message: "Payment was not completed, so this reservation was not confirmed.",
  },
  refunded: {
    tone: "warning",
    message:
      "Your payment arrived after the reservation hold had expired, so we refunded it automatically. Please reserve again if the offer is still available.",
  },
  review: {
    tone: "warning",
    message:
      "We received your payment, but the reservation could not be confirmed automatically. Please contact support so we can confirm it or refund you.",
  },
};

function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

// Same reads and actions as app/orders/page.tsx: only the look differs. Nothing
// on this screen is cached. The pickup code comes straight from
// get_my_pickup_codes, in parallel with the orders.
export default function NativeOrders() {
  const router = useRouter();
  const { language, t } = useLanguage();
  useMinuteTick();
  const [orders, setOrders] = useState<Order[]>(
    () => readPrivateMemory<Order[]>("orders") ?? []
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(() => !readPrivateMemory("orders"));
  const [tab, setTab] = useState<"active" | "history">("active");
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<Tone>("success");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<number, number>>({});
  const [reviewTexts, setReviewTexts] = useState<Record<number, string>>({});
  const [collectingOrder, setCollectingOrder] = useState<Order | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadOrders(userId: string) {
    const [{ data, error }, codesResult] = await Promise.all([
      supabase
        .from("orders")
        .select(
          `${ORDER_COLUMNS},
          offers(id, title, pickup_date, pickup_start, pickup_end, price, quantity, active, category, size,
            businesses(name, address, business_type))`
        )
        .eq("user_id", userId)
        .order("id", { ascending: false }),
      supabase.rpc("get_my_pickup_codes"),
    ]);

    if (error) {
      setMessageTone("error");
      setMessage("Orders could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    if (codesResult.error) {
      logAppError("Pickup codes could not be loaded", codesResult.error, {
        operation: "get_my_pickup_codes",
      });
    }

    const codes = new Map(
      ((codesResult.data || []) as { order_id: number; pickup_code: string }[]).map(
        (row) => [row.order_id, row.pickup_code]
      )
    );

    const nextOrders = ((data || []) as unknown as Order[]).map((order) => ({
      ...order,
      pickup_code: codes.get(order.id) ?? null,
    }));

    writePrivateMemory("orders", userId, nextOrders);
    setOrders(nextOrders);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        router.replace(getLoginRedirectUrl("/orders"));
        return;
      }

      if (!isEmailConfirmed(session.user)) {
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        setLoading(false);
        return;
      }

      const paymentStatus = new URLSearchParams(window.location.search).get("payment");
      const paymentMessage = paymentStatus
        ? PAYMENT_RETURN_MESSAGES[paymentStatus]
        : undefined;

      if (paymentMessage) {
        setMessageTone(paymentMessage.tone);
        setMessage(paymentMessage.message);
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname
        );
      }

      const userId = session.user.id;

      // Remembered orders belong to another account: don't show them.
      if (readPrivateMemory("orders") && !readPrivateMemory("orders", userId)) {
        setOrders([]);
        setLoading(true);
      }

      sweepExpiredOffersOnce();
      void getProfileById(userId, 3).then((nextProfile) => {
        if (active) setProfile(nextProfile);
      });
      await loadOrders(userId);

      if (!active) return;

      channel = supabase
        .channel(uniqueChannelName(`orders-live-updates-${userId}`))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => void loadOrders(userId), 150);
          }
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  async function rateOrder(order: Order) {
    const selectedRating = ratingValues[order.id];

    if (
      ratingOrderId !== null ||
      !isCollectedOrderStatus(order.status) ||
      order.rated_at
    ) {
      return;
    }

    if (!selectedRating) {
      setMessageTone("warning");
      setMessage("Choose a star rating before submitting your review.");
      return;
    }

    const reviewResult = validateTextField({
      label: language === "ka" ? "შეფასება" : "Review",
      value: reviewTexts[order.id] || "",
      maxLength: 500,
      required: false,
      multiline: true,
      language,
    });

    if (reviewResult.error) {
      setMessageTone("warning");
      setMessage(reviewResult.error);
      return;
    }

    setRatingOrderId(order.id);
    setMessage("");

    const { error } = await supabase.rpc("rate_business", {
      p_order_id: order.id,
      p_rating: selectedRating,
      p_comment: reviewResult.value || null,
    });

    if (error) {
      setMessageTone("error");
      setMessage("Your review could not be saved. Please try again.");
      setRatingOrderId(null);
      return;
    }

    setMessageTone("success");
    setMessage("Thanks. Your review was saved.");
    notifyRatingSubmitted({
      orderId: order.id,
      businessName: order.offers?.businesses?.name,
    });
    setRatingOrderId(null);
    await loadOrders(order.user_id ?? "");
  }

  async function collectOrder(order: Order) {
    const { data, error } = await supabase.rpc("collect_my_order", {
      p_order_id: order.id,
    });

    if (error) {
      logAppError("Swipe collect failed", error, {
        operation: "collect_my_order",
        orderId: order.id,
      });
      return false;
    }

    if (data === "collected" || data === "already_collected") {
      notifyPickupCompleted({
        orderId: order.id,
        offerTitle: order.offers?.title,
        businessName: order.offers?.businesses?.name,
      });
      await loadOrders(order.user_id ?? "");
      return true;
    }

    return false;
  }

  async function undoCollectOrder(order: Order) {
    const { data, error } = await supabase.rpc("undo_collect_my_order", {
      p_order_id: order.id,
    });

    if (error || data !== "reserved") {
      if (error) {
        logAppError("Swipe collect undo failed", error, {
          operation: "undo_collect_my_order",
          orderId: order.id,
        });
      }
      return false;
    }

    await loadOrders(order.user_id ?? "");
    return true;
  }

  async function cancelOrder(order: Order) {
    if (!isConfirmedOrderStatus(getEffectiveOrderStatus(order))) return;
    if (cancellingOrderId !== null) return;

    setCancellingOrderId(order.id);
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setCancellingOrderId(null);
      router.replace(getLoginRedirectUrl("/orders"));
      return;
    }

    let response: Response;

    try {
      response = await fetch("/api/payments/refund", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });
    } catch {
      setMessageTone("error");
      setMessage("Network problem. Please check your connection and try again.");
      setCancellingOrderId(null);
      return;
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setMessageTone("error");
      setMessage(getCancellationErrorMessage(result?.error));
      await loadOrders(order.user_id ?? "");
      setCancellingOrderId(null);
      return;
    }

    const refundPending = Boolean(result?.refundPending);
    setMessageTone(refundPending ? "warning" : "success");
    setMessage(
      refundPending && typeof result?.message === "string"
        ? result.message
        : "Reservation cancelled."
    );
    notifyOrderCancelled({
      orderId: order.id,
      offerTitle: order.offers?.title,
      businessName: order.offers?.businesses?.name,
    });
    await loadOrders(order.user_id ?? "");
    setCancellingOrderId(null);
  }

  const isActive = (order: Order) => {
    const status = getEffectiveOrderStatus(order);
    return isConfirmedOrderStatus(status) || isPendingPaymentOrderStatus(status);
  };
  const activeOrders = orders.filter(isActive);
  const pastOrders = orders.filter((order) => !isActive(order));
  const statuses = orders.map(getEffectiveOrderStatus);
  const reliabilityStatus = profile?.reliability_status || "good";

  const fullCard = (order: Order) => (
    <div className="mt-3">
      <OrderCard
        order={order}
        language={language}
        t={t}
        selectedRating={ratingValues[order.id] || 0}
        reviewText={reviewTexts[order.id] || ""}
        cancellingOrderId={cancellingOrderId}
        ratingOrderId={ratingOrderId}
        onCancelOrder={(selected) => void cancelOrder(selected)}
        onOpenCollect={(selected) => setCollectingOrder(selected)}
        onRateOrder={(selected) => void rateOrder(selected)}
        onRatingChange={(orderId, rating) =>
          setRatingValues((current) => ({ ...current, [orderId]: rating }))
        }
        onReviewChange={(orderId, value) =>
          setReviewTexts((current) => ({ ...current, [orderId]: value }))
        }
      />
    </div>
  );

  return (
    <main className="native-main">
      <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
        <h1 className="font-serif text-[1.625rem] font-bold">{t("nav.orders")}</h1>
        <div className="flex rounded-full bg-well p-1" role="tablist">
          {(["active", "history"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              onClick={() => setTab(option)}
              className={`min-h-9 rounded-full px-3.5 text-[13px] font-bold ${
                tab === option ? "bg-brand-forest text-brand-ground" : "text-cream"
              }`}
            >
              {t(option === "active" ? "native.orders.active" : "native.orders.history")}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-4 px-4 pt-3">
        {message && (
          <Notice tone={messageTone}>
            {translateUserMessage(message, language)}
          </Notice>
        )}

        {loading && (
          <>
            <div className="native-skeleton h-[23rem] rounded-[30px]" aria-hidden="true" />
            <div className="native-skeleton h-20 rounded-[18px]" aria-hidden="true" />
          </>
        )}

        {!loading && tab === "active" && activeOrders.length === 0 && (
          <div className="cat-mixed relative overflow-hidden rounded-[28px] bg-cat px-6 pb-7 pt-9 text-center text-cat-ink">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-forest">
              <LeafIcon className="h-9 w-9 text-brand-mint" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-serif text-2xl font-bold">
              {t("native.orders.emptyTitle")}
            </h2>
            <Link
              href="/"
              className="premium-button mt-6 w-full rounded-2xl px-6 py-3 font-bold"
            >
              {t("native.orders.emptyAction")}
            </Link>
          </div>
        )}

        {tab === "active" &&
          activeOrders.map((order) => {
            const status = getEffectiveOrderStatus(order);
            const confirmed = isConfirmedOrderStatus(status);
            const canCancel = confirmed && canShowCancellationAvailable(order);
            const canCollect =
              confirmed && Boolean(order.pickup_code) && isCollectWindowOpen(order);

            return (
              <div key={order.id}>
                <div className="theme-forest relative overflow-hidden rounded-[30px] bg-brand-forest text-brand-ground">
                  <LeafDecor className="-right-12 -top-12 h-52 w-52 text-brand-forest-2" />

                  <div className="relative px-[18px] pt-[18px]">
                    <p className="text-[13px] font-medium text-brand-mint">
                      {getCustomerStatusLabel(status, language)}
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-bold">
                      {order.offers?.businesses?.name || t("common.businessUnavailable")}
                    </h2>
                    {order.offers && (
                      <p className="mt-0.5 text-sm text-body">
                        {getOfferDateLabel(order.offers, language)}{" "}
                        {formatPickupTimeRange(order.offers, language)}
                      </p>
                    )}
                  </div>

                  <div className="theme-cream relative mx-[18px] mt-4 rounded-[22px] p-4 text-center">
                    <p className="text-[13px] text-brand-secondary">
                      {t("native.orders.code")}
                    </p>
                    {confirmed ? (
                      <p className="mt-1 whitespace-nowrap font-mono text-[2.75rem] font-semibold leading-tight tracking-[0.08em] text-brand-ink">
                        {order.pickup_code
                          ? formatCode(order.pickup_code)
                          : t("common.pending")}
                      </p>
                    ) : (
                      <p className="mt-2 font-bold text-brand-ink">
                        {t("native.orders.pending")}
                      </p>
                    )}
                    {confirmed && (
                      <p className="mt-1 text-[13px] text-brand-secondary">
                        {t("native.orders.show")}
                      </p>
                    )}
                  </div>

                  <div className="relative grid gap-2 p-[18px]">
                    {canCollect && (
                      <button
                        type="button"
                        onClick={() => setCollectingOrder(order)}
                        className="native-press min-h-14 rounded-2xl bg-brand-honey text-base font-bold text-brand-ink"
                      >
                        {t("native.orders.collect")}
                      </button>
                    )}
                    <div className="flex gap-2">
                      {order.offers?.businesses?.address && (
                        <a
                          href={createMapsSearchUrl(
                            order.offers.businesses.address,
                            order.offers.businesses.name
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="native-press flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl bg-brand-mint text-sm font-bold text-brand-forest"
                        >
                          {t("native.orders.route")}
                        </a>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          disabled={cancellingOrderId !== null}
                          onClick={() => void cancelOrder(order)}
                          className="native-press min-h-[3.25rem] flex-1 rounded-2xl bg-brand-forest-2 text-sm font-bold text-brand-ground disabled:opacity-60"
                        >
                          {cancellingOrderId === order.id
                            ? "…"
                            : t("native.orders.cancel")}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-expanded={openOrderId === order.id}
                      onClick={() =>
                        setOpenOrderId((current) =>
                          current === order.id ? null : order.id
                        )
                      }
                      className="min-h-11 text-sm font-bold text-brand-mint"
                    >
                      {t(
                        openOrderId === order.id
                          ? "native.orders.hide"
                          : "native.orders.details"
                      )}
                    </button>
                  </div>
                </div>
                {openOrderId === order.id && fullCard(order)}
              </div>
            );
          })}

        {!loading && tab === "history" && pastOrders.length === 0 && (
          <p className="rounded-[22px] bg-well p-8 text-center font-bold">
            {t("native.orders.emptyHistory")}
          </p>
        )}

        {tab === "history" &&
          pastOrders.map((order) => {
            const status = getEffectiveOrderStatus(order);
            const canRate = isCollectedOrderStatus(status) && !order.rated_at;

            return (
              <div key={order.id}>
                <button
                  type="button"
                  aria-expanded={openOrderId === order.id}
                  onClick={() =>
                    setOpenOrderId((current) =>
                      current === order.id ? null : order.id
                    )
                  }
                  className="native-press flex min-h-[4.5rem] w-full items-center gap-3 rounded-[18px] bg-card p-3 text-left"
                >
                  <span
                    aria-hidden="true"
                    className={`${getOfferCategoryTone(
                      order.offers?.category
                    )} h-11 w-11 flex-none rounded-[12px_24px_12px_12px] bg-cat`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {order.offers?.businesses?.name ||
                        t("common.businessUnavailable")}
                    </span>
                    <span className="block truncate text-[13px] text-body">
                      {getCustomerStatusLabel(status, language)}
                      {order.created_at
                        ? ` · ${formatReviewDate(order.created_at, language)}`
                        : ""}
                      {order.amount ? ` · ${formatMoney(order.amount)}` : ""}
                    </span>
                  </span>
                  {canRate && (
                    <span className="flex-none text-[13px] font-bold">
                      {t("native.orders.rate")}
                    </span>
                  )}
                </button>
                {openOrderId === order.id && fullCard(order)}
              </div>
            );
          })}

        {!loading && tab === "history" && orders.length > 0 && (
          <details className="rounded-[18px] bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center px-4 font-bold [&::-webkit-details-marker]:hidden">
              {t("native.orders.stats")}
            </summary>
            <div className="px-3 pb-3">
              <OrdersStats
                t={t}
                language={language}
                confirmedCount={statuses.filter(isConfirmedOrderStatus).length}
                collectedCount={statuses.filter(isCollectedOrderStatus).length}
                cancelledCount={statuses.filter(isCancelledOrderStatus).length}
                profile={profile}
                reliabilityStatus={reliabilityStatus}
                reliabilityTone={
                  reliabilityStatus === "excellent" || reliabilityStatus === "good"
                    ? "green"
                    : reliabilityStatus === "warning"
                    ? "yellow"
                    : "red"
                }
              />
            </div>
          </details>
        )}
      </section>

      {collectingOrder && (
        <CollectSlider
          order={
            orders.find((order) => order.id === collectingOrder.id) ||
            collectingOrder
          }
          language={language}
          onCollect={() => collectOrder(collectingOrder)}
          onUndo={() => undoCollectOrder(collectingOrder)}
          onClose={() => setCollectingOrder(null)}
        />
      )}
    </main>
  );
}
