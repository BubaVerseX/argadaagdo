"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import StatCard from "@/components/StatCard";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import { notifyOrderCancelled } from "@/lib/notifications";
import {
  formatMoney,
  formatPickupTimeRange,
  getOfferDateLabel,
} from "@/lib/offerLifecycle";
import {
  getEffectiveOrderStatus,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  getOrderStatusClassName,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function getCancellationErrorMessage(message?: string) {
  const normalizedMessage = (message || "").toLowerCase();

  if (normalizedMessage.includes("cancellation window has closed")) {
    return "Cancellation deadline has passed. You can cancel only up to 2 hours before pickup.";
  }

  if (normalizedMessage.includes("only reserved orders")) {
    return "Only confirmed reservations can be cancelled.";
  }

  if (normalizedMessage.includes("order not found")) {
    return "This order could not be found or no longer belongs to your account.";
  }

  return message || "Order could not be cancelled. Please try again.";
}

function getLoginRedirectUrl(path: string) {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

function normalizeTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

function getTbilisiDateTimeKey(date = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const year = dateParts.find((part) => part.type === "year")?.value || "1970";
  const month = dateParts.find((part) => part.type === "month")?.value || "01";
  const day = dateParts.find((part) => part.type === "day")?.value || "01";
  const hour = timeParts.find((part) => part.type === "hour")?.value || "00";
  const minute = timeParts.find((part) => part.type === "minute")?.value || "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getCancellationDeadlineKey(order: Order) {
  const offer = order.offers;
  if (!offer?.pickup_date || !offer.pickup_start) return null;

  const pickupDate = new Date(
    `${offer.pickup_date}T${normalizeTime(offer.pickup_start)}:00+04:00`
  );

  if (Number.isNaN(pickupDate.getTime())) return null;

  pickupDate.setHours(pickupDate.getHours() - 2);
  return getTbilisiDateTimeKey(pickupDate);
}

function canShowCancellationAvailable(order: Order) {
  const deadline = getCancellationDeadlineKey(order);
  if (!deadline) return true;
  return getTbilisiDateTimeKey() <= deadline;
}

function getCustomerStatusLabel(status: OrderStatus, language: "en" | "ka") {
  if (isConfirmedOrderStatus(status)) {
    return language === "ka" ? "წაღების მოლოდინში" : "Waiting for pickup";
  }
  if (isCollectedOrderStatus(status)) {
    return language === "ka" ? "წაღებულია" : "Collected";
  }
  if (status === "no_show") {
    return language === "ka" ? "წაღება გამოტოვებულია" : "Missed Pickup";
  }
  if (status === "expired") {
    return language === "ka" ? "ვადაგასულია" : "Expired";
  }
  if (isCancelledOrderStatus(status)) {
    return language === "ka" ? "გაუქმებულია" : "Cancelled";
  }
  return language === "ka" ? "უცნობი" : "Unknown";
}

export default function OrdersPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
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

    setRatingOrderId(order.id);
    setMessage("");

    const { error } = await supabase.rpc("rate_business", {
      p_order_id: order.id,
      p_rating: selectedRating,
      p_comment: reviewTexts[order.id]?.trim() || null,
    });

    if (error) {
      setMessageTone("error");
      setMessage("Your review could not be saved. Please try again.");
      setRatingOrderId(null);
      return;
    }

    setMessageTone("success");
    setMessage("Thanks. Your review was saved.");
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

    const { error: orderError } = await supabase.rpc("cancel_paid_order", {
      p_order_id: order.id,
    });

    if (orderError) {
      setMessageTone("error");
      setMessage(getCancellationErrorMessage(orderError.message));
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
        <div className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6 md:p-10">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            {t("orders.reserved")}
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            {t("orders.title")}
          </h1>

          <p className="mt-4 max-w-2xl text-base font-semibold text-gray-700 md:text-lg">
            {t("orders.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-5">
            <StatCard title={t("orders.reserved")} value={confirmedCount} tone="yellow" />
            <StatCard title={t("orders.collected")} value={collectedCount} tone="green" />
            <StatCard title={t("orders.cancelled")} value={cancelledCount} tone="red" />
            <StatCard
              title={t("orders.reliability")}
              value={profile?.reliability_score ?? t("common.unavailable")}
              tone={reliabilityTone}
            />
            <StatCard
              title={t("orders.status")}
              value={reliabilityStatus}
              tone={reliabilityTone}
            />
          </div>

        </div>

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
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
            <p className="font-semibold text-gray-600">{t("orders.loading")}</p>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              🥡
            </div>

            <p className="mt-5 text-sm font-black uppercase tracking-widest text-green-700">
              {t("orders.emptyTitle")}
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {t("orders.educationTitle")}
            </h2>

            <p className="mx-auto mt-3 max-w-xl font-medium leading-7 text-gray-600">
              {t("orders.educationText")}
            </p>

            <div className="mx-auto mt-5 max-w-xl rounded-3xl bg-green-50 p-4 text-left">
              <p className="font-black text-green-800">
                {t("orders.ratingEducationTitle")}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-green-900">
                {t("orders.ratingEducationText")}
              </p>
            </div>

            <p className="mt-4 text-sm font-bold text-gray-500">
              {t("orders.emptyHint")}
            </p>

            <Link
              href="/offers"
              className="mt-6 inline-block min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white sm:py-4"
            >
              {t("common.browseOffers")}
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5">
          {orders.map((order) => {
            const businessAddress =
              order.offers?.businesses?.address || t("common.addressUnavailable");
            const mapsUrl = createMapsSearchUrl(
              order.offers?.businesses?.address,
              order.offers?.businesses?.name
            );
            const displayStatus = getEffectiveOrderStatus(order);
            const statusClass = getOrderStatusClassName(displayStatus);
            const isConfirmed = isConfirmedOrderStatus(displayStatus);
            const isCancellationAvailable =
              isConfirmed && canShowCancellationAvailable(order);
            const pickupDateLabel = order.offers
              ? getOfferDateLabel(order.offers, language)
              : t("orders.pickupUnavailable");
            const pickupTimeLabel = order.offers
              ? formatPickupTimeRange(order.offers, language)
              : t("orders.pickupUnavailable");
            const inactiveOrderMessage = isCollectedOrderStatus(displayStatus)
              ? t("orders.collectedMessage")
              : displayStatus === "no_show"
              ? t("orders.noShowMessage")
              : displayStatus === "expired"
              ? t("orders.expiredMessage")
              : isCancelledOrderStatus(displayStatus)
              ? t("orders.cancelledMessage")
              : t("orders.pickupCodeAvailable");
            const selectedRating = ratingValues[order.id] || 0;
            const reviewText = reviewTexts[order.id] || "";

            return (
              <div
                key={order.id}
                className="rounded-3xl bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5 md:p-8"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="order-2 lg:order-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-black ${statusClass}`}
                      >
                        {getCustomerStatusLabel(displayStatus, language)}
                      </span>

                      <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
                        {order.offers?.businesses?.business_type || t("common.food")}
                      </span>

                      {isCollectedOrderStatus(displayStatus) && !order.rated_at && (
                        <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-yellow-900">
                          Ready to rate
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                      {order.offers?.title || t("common.offerUnavailable")}
                    </h2>

                    <p className="mt-2 text-lg font-bold text-gray-800">
                      {order.offers?.businesses?.name || t("common.businessUnavailable")}
                    </p>

                    <div className="mt-4 rounded-3xl bg-[#F7F6EF] p-4">
                      <p className="text-sm font-black uppercase tracking-widest text-green-700">
                        {t("orders.pickupReminder")}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            {t("orders.pickupDate")}
                          </p>
                          <p className="mt-1 font-black text-gray-950">
                            {pickupDateLabel}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            {t("orders.pickupTime")}
                          </p>
                          <p className="mt-1 font-black text-gray-950">
                            {pickupTimeLabel}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            {t("orders.businessName")}
                          </p>
                          <p className="mt-1 font-black text-gray-950">
                            {order.offers?.businesses?.name ||
                              t("common.businessUnavailable")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            {t("orders.businessAddress")}
                          </p>
                          <p className="mt-1 font-semibold text-gray-700">
                            {businessAddress}
                          </p>
                          {order.offers?.businesses?.address && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${t("common.openMap")} ${
                                order.offers?.businesses?.name ||
                                order.offers?.title ||
                                "pickup location"
                              }`}
                              className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                            >
                              {t("common.openMap")}
                            </a>
                          )}
                        </div>
                      </div>

                      <p className="mt-3 font-black text-green-700">
                        {t("common.price")}:{" "}
                        {order.offers
                          ? formatMoney(order.offers.price)
                          : t("common.unavailable")}
                      </p>
                    </div>
                  </div>

                  <div className="order-1 rounded-3xl bg-[#F7F6EF] p-4 text-center sm:rounded-[2rem] sm:p-5 lg:order-2 lg:min-w-[280px]">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">
                      {t("orders.pickupCode")}
                    </p>

                    {isConfirmed ? (
                      <>
                        <div className="mt-3 rounded-2xl border-2 border-green-200 bg-white px-4 py-5 shadow-sm sm:rounded-3xl sm:px-6 sm:py-6">
                          <p className="text-sm font-black text-green-700">
                            {t("orders.pickupCode")}:
                          </p>
                          <p className="font-mono text-3xl font-black tracking-[0.18em] text-green-700 sm:text-4xl">
                            {order.pickup_code || t("common.pending")}
                          </p>
                        </div>

                        <p className="mt-3 text-sm font-bold text-gray-600">
                          {t("orders.showCode")}
                        </p>

                        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-left">
                          <p className="text-sm font-black leading-6 text-green-900">
                            {t("orders.activePickupReminder")}
                          </p>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white p-4 text-left shadow-sm">
                          <p className="text-sm font-black text-gray-800">
                            {isCancellationAvailable
                              ? t("orders.cancelAvailable")
                              : t("orders.cancelUnavailable")}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-600">
                            {t("orders.ratingBeforePickup")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-white px-5 py-5 font-bold text-gray-600 shadow-sm">
                        {inactiveOrderMessage}
                      </div>
                    )}

                    {isConfirmed && isCancellationAvailable && (
                      <button
                        onClick={() => cancelOrder(order)}
                        disabled={cancellingOrderId !== null}
                        className="mt-5 min-h-12 w-full rounded-full bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancellingOrderId === order.id
                          ? "Cancelling..."
                          : t("orders.cancelReservation")}
                      </button>
                    )}

                    {isCollectedOrderStatus(displayStatus) && (
                      <div className="mt-5 rounded-2xl bg-white p-4 text-left shadow-sm">
                        {order.rated_at ? (
                          <p className="text-center font-black text-green-700">
                            {t("orders.reviewThanks")}
                          </p>
                        ) : (
                          <>
                            <p className="text-center text-base font-black text-green-800">
                              {t("orders.ratePickup")}
                            </p>
                            <p className="mt-1 text-center text-sm font-semibold text-gray-600">
                              {t("orders.ratingAvailable")}
                            </p>
                            <div className="mt-3 grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  aria-label={`Rate this pickup ${rating} out of 5`}
                                  onClick={() =>
                                    setRatingValues((currentRatings) => ({
                                      ...currentRatings,
                                      [order.id]: rating,
                                    }))
                                  }
                                  disabled={ratingOrderId !== null}
                                  className={`min-h-10 rounded-full font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    selectedRating === rating
                                      ? "bg-yellow-400 text-yellow-950"
                                      : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                                  }`}
                                >
                                  ⭐ {rating}
                                </button>
                              ))}
                            </div>

                            <textarea
                              value={reviewText}
                              onChange={(event) =>
                                setReviewTexts((currentReviews) => ({
                                  ...currentReviews,
                                  [order.id]: event.target.value,
                                }))
                              }
                              maxLength={500}
                              placeholder={t("orders.reviewPlaceholder")}
                              className="mt-3 min-h-24 w-full rounded-2xl border bg-white p-3 text-sm font-semibold text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                            />

                            <button
                              type="button"
                              onClick={() => void rateOrder(order)}
                              disabled={ratingOrderId !== null || !selectedRating}
                              className="mt-3 min-h-11 w-full rounded-full bg-green-700 px-5 py-2.5 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ratingOrderId === order.id
                                ? "Saving review..."
                                : t("orders.submitReview")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
