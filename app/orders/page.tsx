"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeOrdersScreen } from "@/components/native/screens";
import Navbar from "@/components/Navbar";
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
  getConfirmedUser,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { logAppError } from "@/lib/errors";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  notifyOrderCancelled,
  notifyPickupCompleted,
  notifyRatingSubmitted,
} from "@/lib/notifications";
import {
  getEffectiveOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import {
  getCancellationErrorMessage,
  getLoginRedirectUrl,
} from "@/lib/orders";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import type { Order } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useMinuteTick } from "@/lib/useMinuteTick";
import { validateTextField } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MessageTone = "success" | "error" | "warning";

// These messages stay in English here; the page translates them (and other
// known messages) with translateUserMessage when rendering the notice.
function getInitialPaymentReturnMessage():
  | { tone: MessageTone; message: string }
  | null {
  if (typeof window === "undefined") return null;

  const paymentStatus = new URLSearchParams(window.location.search).get(
    "payment"
  );

  // "success" shows no message: the pickup code on top is the confirmation
  // (and a free reservation was never a payment).

  if (paymentStatus === "pending") {
    return {
      tone: "warning",
      message:
        "Payment is still being confirmed. Refresh this page in a moment.",
    };
  }

  if (paymentStatus === "failed") {
    return {
      tone: "error",
      message: "Payment was not completed, so this reservation was not confirmed.",
    };
  }

  if (paymentStatus === "refunded") {
    return {
      tone: "warning",
      message:
        "Your payment arrived after the reservation hold had expired, so we refunded it automatically. Please reserve again if the offer is still available.",
    };
  }

  if (paymentStatus === "review") {
    return {
      tone: "warning",
      message:
        "We received your payment, but the reservation could not be confirmed automatically. Please contact support so we can confirm it or refund you.",
    };
  }

  return null;
}

function OrdersPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  useMinuteTick();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(
    null
  );
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<number, number>>({});
  const [reviewTexts, setReviewTexts] = useState<Record<number, string>>({});
  const [collectingOrder, setCollectingOrder] = useState<Order | null>(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<Order | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadOrders(userId: string, showLoading = false) {
    if (showLoading) setLoading(true);
    await processExpiredMarketplace();

    const ordersRequest = supabase
      .from("orders")
      .select(
        `
        ${ORDER_COLUMNS},
        offers(
          id,
          title,
          pickup_date,
          pickup_start,
          pickup_end,
          price,
          quantity,
          active,
          category,
          size,
          businesses(name, address, business_type)
        )
      `
      )
      .eq("user_id", userId)
      .order("id", { ascending: false });
    // Pickup codes aren't readable from the orders table (so businesses
    // can't see them); the customer's own codes come from this RPC.
    const [{ data, error }, codesResult] = await Promise.all([
      ordersRequest,
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

    const codesByOrderId = new Map(
      ((codesResult.data || []) as { order_id: number; pickup_code: string }[]).map(
        (row) => [row.order_id, row.pickup_code]
      )
    );

    setOrders(
      ((data || []) as unknown as Order[]).map((order) => ({
        ...order,
        pickup_code: codesByOrderId.get(order.id) ?? null,
      }))
    );
    setLoading(false);
  }

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
    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id
          ? { ...item, rated_at: new Date().toISOString() }
          : item
      )
    );
    setRatingValues((currentRatings) => {
      const nextRatings = { ...currentRatings };
      delete nextRatings[order.id];
      return nextRatings;
    });
    setReviewTexts((currentReviews) => {
      const nextReviews = { ...currentReviews };
      delete nextReviews[order.id];
      return nextReviews;
    });
    setRatingOrderId(null);
    await loadOrders(order.user_id ?? "");
  }

  // Swipe-to-collect: the customer confirms the pickup in front of staff.
  // collect_my_order sets the same "completed" status as the code check, so
  // the business dashboard updates in real time through its orders channel.
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
      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.id === order.id
            ? { ...item, status: "completed", completed_at: new Date().toISOString() }
            : item
        )
      );
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

    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id ? { ...item, status: "reserved", completed_at: null } : item
      )
    );
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
    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id
          ? { ...item, status: refundPending ? "refund_pending" : "refunded" }
          : item
      )
    );
    notifyOrderCancelled({
      orderId: order.id,
      offerTitle: order.offers?.title,
      businessName: order.offers?.businesses?.name,
    });
    await loadOrders(order.user_id ?? "");
    setCancellingOrderId(null);
  }

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialiseOrders() {
      const authResult = await getConfirmedUser();

      if (!active) return;

      if (authResult.status === "signed_out") {
        router.replace(getLoginRedirectUrl("/orders"));
        return;
      }

      if (authResult.status === "unverified") {
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        setOrders([]);
        setLoading(false);
        return;
      }

      // Read the payment return status after hydration (reading it during
      // render caused a server/client mismatch), then drop it from the URL
      // so a later refresh doesn't repeat a stale "Payment confirmed".
      const paymentReturnMessage = getInitialPaymentReturnMessage();

      if (paymentReturnMessage) {
        setMessageTone(paymentReturnMessage.tone);
        setMessage(paymentReturnMessage.message);
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname
        );
      }

      const userId = authResult.user.id;
      await loadOrders(userId, true);

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
    }

    void initialiseOrders();

    return () => {
      active = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const activeOrders = orders.filter(isActiveOrder);
  const pastOrders = orders.filter((order) => !isActiveOrder(order));

  return (
    <main className="app-shell">
      <Navbar />

      <section className="mx-auto grid max-w-xl gap-4 px-4 py-6 sm:px-5 sm:py-8">
        {loading && (
          <div className="h-80 animate-pulse rounded-[24px] bg-well" aria-busy="true" />
        )}

        {activeOrders.map((order) => (
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

        {!loading && activeOrders.length === 0 && <OrdersEmptyState t={t} />}

        {pastOrders.length > 0 && (
          <div className="mt-2 grid gap-2">
            <h2 className="text-sm font-semibold text-body">{t("native.orders.history")}</h2>
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
          order={orders.find((order) => order.id === collectingOrder.id) || collectingOrder}
          language={language}
          onCollect={() => collectOrder(collectingOrder)}
          onUndo={() => undoCollectOrder(collectingOrder)}
          onClose={() => setCollectingOrder(null)}
        />
      )}
    </main>
  );
}

export default withNativeScreen(OrdersPage, NativeOrdersScreen);
