"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { LoadingState } from "@/components/LoadingState";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrdersEmptyState } from "@/components/orders/OrdersEmptyState";
import { OrdersHeader } from "@/components/orders/OrdersHeader";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  notifyOrderCancelled,
  notifyRatingSubmitted,
} from "@/lib/notifications";
import {
  getEffectiveOrderStatus,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import {
  getCancellationErrorMessage,
  getLoginRedirectUrl,
} from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import type { Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { validateTextField } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MessageTone = "success" | "error" | "warning";

function getInitialPaymentReturnMessage():
  | { tone: MessageTone; message: string }
  | null {
  if (typeof window === "undefined") return null;

  const paymentStatus = new URLSearchParams(window.location.search).get(
    "payment"
  );

  if (paymentStatus === "success") {
    return {
      tone: "success",
      message: "Payment confirmed. Your pickup code is ready below.",
    };
  }

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
      message: "Payment was not completed. The offer quantity was released.",
    };
  }

  return null;
}

export default function OrdersPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const initialPaymentMessage = getInitialPaymentReturnMessage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState(initialPaymentMessage?.message || "");
  const [messageTone, setMessageTone] = useState<MessageTone>(
    initialPaymentMessage?.tone || "success"
  );
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(
    null
  );
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<number, number>>({});
  const [reviewTexts, setReviewTexts] = useState<Record<number, string>>({});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadOrders(userId: string, showLoading = false) {
    if (showLoading) setLoading(true);
    await processExpiredMarketplace();

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        offers(
          id,
          title,
          pickup_date,
          pickup_start,
          pickup_end,
          price,
          quantity,
          active,
          businesses(name, address, business_type)
        )
      `
      )
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) {
      setMessageTone("error");
      setMessage("Orders could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    setOrders((data || []) as Order[]);
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
      label: "Review",
      value: reviewTexts[order.id] || "",
      maxLength: 500,
      required: false,
      multiline: true,
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
    await loadOrders(order.user_id);
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

    const response = await fetch("/api/payments/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: order.id }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setMessageTone("error");
      setMessage(getCancellationErrorMessage(result?.error));
      await loadOrders(order.user_id);
      setCancellingOrderId(null);
      return;
    }

    setMessageTone("success");
    setMessage("Reservation cancelled.");
    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id ? { ...item, status: "cancelled" } : item
      )
    );
    notifyOrderCancelled({
      orderId: order.id,
      offerTitle: order.offers?.title,
      businessName: order.offers?.businesses?.name,
    });
    await loadOrders(order.user_id);
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

      const userId = authResult.user.id;
      const currentProfile = await getProfileById(userId, 3);
      if (active) setProfile(currentProfile);

      await loadOrders(userId, true);

      if (!active) return;

      channel = supabase
        .channel(`orders-live-updates-${userId}`)
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

  const confirmedCount = orders.filter((order) =>
    isConfirmedOrderStatus(getEffectiveOrderStatus(order))
  ).length;
  const collectedCount = orders.filter((order) =>
    isCollectedOrderStatus(getEffectiveOrderStatus(order))
  ).length;
  const cancelledCount = orders.filter((order) =>
    isCancelledOrderStatus(getEffectiveOrderStatus(order))
  ).length;
  const reliabilityStatus = profile?.reliability_status || "good";
  const reliabilityTone =
    reliabilityStatus === "excellent" || reliabilityStatus === "good"
      ? "green"
      : reliabilityStatus === "warning"
      ? "yellow"
      : "red";
  const shouldShowRatingEducation =
    !loading && orders.length > 0 && collectedCount === 0;

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <OrdersHeader
          t={t}
          confirmedCount={confirmedCount}
          collectedCount={collectedCount}
          cancelledCount={cancelledCount}
          profile={profile}
          reliabilityStatus={reliabilityStatus}
          reliabilityTone={reliabilityTone}
        />

        {!loading && orders.length > 0 && (
          <div className="mt-5 rounded-3xl bg-green-50 p-5 shadow-sm sm:mt-6 sm:p-6">
            <p className="text-lg font-black text-green-900">
              {t("orders.pickupInstructionTitle")}
            </p>
            <p className="mt-2 font-semibold leading-7 text-green-900">
              {t("orders.pickupInstructionText")}
            </p>
          </div>
        )}

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        {shouldShowRatingEducation && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-lg font-black text-green-800">
              {t("orders.ratingEducationTitle")}
            </p>
            <p className="mt-2 font-semibold leading-7 text-gray-600">
              {t("orders.ratingEducationText")}
            </p>
          </div>
        )}

        {loading && (
          <LoadingState
            className="mt-8"
            title={t("orders.loading")}
            description="Preparing your reservations, pickup codes and order history."
          />
        )}

        {!loading && orders.length === 0 && <OrdersEmptyState t={t} />}

        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              language={language}
              t={t}
              selectedRating={ratingValues[order.id] || 0}
              reviewText={reviewTexts[order.id] || ""}
              cancellingOrderId={cancellingOrderId}
              ratingOrderId={ratingOrderId}
              onCancelOrder={(selectedOrder) => void cancelOrder(selectedOrder)}
              onRateOrder={(selectedOrder) => void rateOrder(selectedOrder)}
              onRatingChange={(orderId, rating) =>
                setRatingValues((currentRatings) => ({
                  ...currentRatings,
                  [orderId]: rating,
                }))
              }
              onReviewChange={(orderId, value) =>
                setReviewTexts((currentReviews) => ({
                  ...currentReviews,
                  [orderId]: value,
                }))
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}
