"use client";

import NativeHero from "./NativeHero";
import Notice from "@/components/Notice";
import { CollectSlider } from "@/components/orders/CollectSlider";
import { ConfirmSheet } from "@/components/orders/ConfirmSheet";
import {
  ActiveOrderCard,
  isActiveOrder,
  PastOrderRow,
} from "@/components/orders/OrderCard";
import { OrdersEmptyState } from "@/components/orders/OrdersEmptyState";
import {
  isEmailConfirmed,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { logAppError } from "@/lib/errors";
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
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import {
  getEffectiveOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { getCancellationErrorMessage, getLoginRedirectUrl } from "@/lib/orders";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import type { Order } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useMinuteTick } from "@/lib/useMinuteTick";
import { validateTextField } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tone = "success" | "error" | "warning";

const PAYMENT_RETURN_MESSAGES: Record<string, { tone: Tone; message: string }> = {
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
  const [loading, setLoading] = useState(() => !readPrivateMemory("orders"));
  const [tab, setTab] = useState<"active" | "history">("active");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<Tone>("success");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<number, number>>({});
  const [reviewTexts, setReviewTexts] = useState<Record<number, string>>({});
  const [collectingOrder, setCollectingOrder] = useState<Order | null>(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<Order | null>(null);
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

  const activeOrders = orders.filter(isActiveOrder);
  const pastOrders = orders.filter((order) => !isActiveOrder(order));

  return (
    <main className="native-main">
      <NativeHero className="px-4 pb-2 pt-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate whitespace-nowrap font-serif text-[1.375rem] font-bold text-cream">{t("nav.orders")}</h1>
          <div className="flex rounded-full bg-card p-1" role="tablist">
            {(["active", "history"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={tab === option}
                onClick={() => setTab(option)}
                className={`min-h-11 rounded-full px-4 text-[13px] font-semibold ${
                  tab === option ? "bg-brand-mint text-brand-forest" : "text-cream"
                }`}
              >
                {t(option === "active" ? "native.orders.active" : "native.orders.history")}
              </button>
            ))}
          </div>
        </header>
      </NativeHero>

      <section className="native-under-hero relative z-[1] grid gap-4 px-4">
        {loading && (
          <>
            <div className="native-skeleton h-[23rem] rounded-[30px]" aria-hidden="true" />
            <div className="native-skeleton h-20 rounded-[18px]" aria-hidden="true" />
          </>
        )}

        {tab === "active" &&
          activeOrders.map((order) => (
            <ActiveOrderCard
              key={order.id}
              order={order}
              language={language}
              t={t}
              cancellingOrderId={cancellingOrderId}
              onAskCancel={(selected) => setConfirmCancelOrder(selected)}
              onOpenCollect={(selected) => setCollectingOrder(selected)}
            />
          ))}

        {message && (
          <Notice tone={messageTone}>
            {translateUserMessage(message, language)}
          </Notice>
        )}

        {!loading && tab === "active" && activeOrders.length === 0 && (
          <OrdersEmptyState t={t} href="/" />
        )}

        {!loading && tab === "history" && pastOrders.length === 0 && (
          <p className="rounded-[20px] bg-card p-6 text-center text-sm text-body">
            {t("native.orders.emptyHistory")}
          </p>
        )}

        {tab === "history" && pastOrders.length > 0 && (
          <div className="grid gap-2">
            {pastOrders.map((order) => (
              <PastOrderRow
                key={order.id}
                order={order}
                language={language}
                t={t}
                selectedRating={ratingValues[order.id] || 0}
                reviewText={reviewTexts[order.id] || ""}
                ratingOrderId={ratingOrderId}
                onRateOrder={(selected) => void rateOrder(selected)}
                onRatingChange={(orderId, rating) =>
                  setRatingValues((current) => ({ ...current, [orderId]: rating }))
                }
                onReviewChange={(orderId, value) =>
                  setReviewTexts((current) => ({ ...current, [orderId]: value }))
                }
              />
            ))}
          </div>
        )}
      </section>

      {confirmCancelOrder && (
        <ConfirmSheet
          title={t("native.orders.cancelTitle")}
          confirmLabel={t("native.orders.cancelConfirm")}
          cancelLabel={t("native.orders.keep")}
          busy={cancellingOrderId !== null}
          onConfirm={() => {
            const order = confirmCancelOrder;
            void cancelOrder(order).finally(() => setConfirmCancelOrder(null));
          }}
          onClose={() => setConfirmCancelOrder(null)}
        />
      )}

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
