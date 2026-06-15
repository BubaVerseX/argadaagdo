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
import { formatPickupWindow } from "@/lib/offerLifecycle";
import {
  getInactiveOrderMessage,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  getOrderStatusClassName,
  getOrderStatusLabel,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Order, Profile } from "@/lib/types";
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

export default function OrdersPage() {
  const router = useRouter();
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
      setMessage(error.message || "Rating could not be saved.");
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
    if (!isConfirmedOrderStatus(order.status)) return;
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
        router.replace("/login");
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
    isConfirmedOrderStatus(order.status)
  ).length;
  const collectedCount = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  ).length;
  const cancelledCount = orders.filter((order) =>
    isCancelledOrderStatus(order.status)
  ).length;
  const reliabilityStatus = profile?.reliability_status || "good";
  const reliabilityTone =
    reliabilityStatus === "excellent" || reliabilityStatus === "good"
      ? "green"
      : reliabilityStatus === "warning"
      ? "yellow"
      : "red";

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6 md:p-10">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            My reservations
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            Your pickup orders
          </h1>

          <p className="mt-4 max-w-2xl text-base font-semibold text-gray-700 md:text-lg">
            Show your pickup code at the business during pickup time.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-5">
            <StatCard title="Reserved" value={confirmedCount} tone="yellow" />
            <StatCard title="Collected" value={collectedCount} tone="green" />
            <StatCard title="Cancelled" value={cancelledCount} tone="red" />
            <StatCard
              title="Reliability"
              value={profile?.reliability_score ?? "--"}
              tone={reliabilityTone}
            />
            <StatCard
              title="Status"
              value={reliabilityStatus}
              tone={reliabilityTone}
            />
          </div>
        </div>

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
            <p className="font-semibold text-gray-600">Loading orders...</p>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              🥡
            </div>

            <h2 className="mt-5 text-3xl font-black">
              No orders yet
            </h2>

            <p className="mt-3 font-medium text-gray-600">
              Reserve your first food offer and it will appear here.
            </p>

            <Link
              href="/offers"
              className="mt-6 inline-block min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white sm:py-4"
            >
              Browse Offers
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5">
          {orders.map((order) => {
            const businessAddress =
              order.offers?.businesses?.address || "Address unavailable";
            const mapsUrl = createMapsSearchUrl(
              order.offers?.businesses?.address,
              order.offers?.businesses?.name
            );
            const statusClass = getOrderStatusClassName(order.status);
            const isConfirmed = isConfirmedOrderStatus(order.status);
            const selectedRating = ratingValues[order.id] || 0;
            const reviewText = reviewTexts[order.id] || "";

            return (
              <div
                key={order.id}
                className="rounded-3xl bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5 md:p-8"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-black ${statusClass}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>

                      <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
                        {order.offers?.businesses?.business_type || "Food"}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                      {order.offers?.title || "Offer deleted"}
                    </h2>

                    <p className="mt-2 text-lg font-bold text-gray-800">
                      {order.offers?.businesses?.name || "Business unavailable"}
                    </p>

                    <div className="mt-4 grid gap-2 text-gray-700">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <p className="font-medium">📍 {businessAddress}</p>

                        {order.offers?.businesses?.address && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open map for ${order.offers?.businesses?.name || order.offers?.title || "pickup location"}`}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                          >
                            Open map
                          </a>
                        )}
                      </div>

                      <p className="font-medium">
                        ⏰ Pickup:{" "}
                        {order.offers
                          ? formatPickupWindow(order.offers)
                          : "Time unavailable"}
                      </p>

                      <p className="font-black text-green-700">
                        Price: ₾{order.offers?.price}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-[#F7F6EF] p-4 text-center sm:rounded-[2rem] sm:p-5 lg:min-w-[240px]">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">
                      Pickup Code
                    </p>

                    {isConfirmed ? (
                      <>
                        <div className="mt-3 rounded-2xl bg-white px-4 py-4 shadow-sm sm:rounded-3xl sm:px-6 sm:py-5">
                          <p className="font-mono text-3xl font-black tracking-[0.18em] text-green-700 sm:text-4xl">
                            {order.pickup_code || "------"}
                          </p>
                        </div>

                        <p className="mt-3 text-sm font-bold text-gray-600">
                          Show this code at pickup.
                        </p>

                        <p className="mt-2 text-xs font-bold text-gray-500">
                          You can cancel up to 2 hours before pickup for a full
                          refund.
                        </p>
                      </>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-white px-5 py-5 font-bold text-gray-600 shadow-sm">
                        {getInactiveOrderMessage(order.status)}
                      </div>
                    )}

                    {isConfirmed && (
                      <button
                        onClick={() => cancelOrder(order)}
                        disabled={cancellingOrderId !== null}
                        className="mt-5 min-h-12 w-full rounded-full bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancellingOrderId === order.id
                          ? "Cancelling..."
                          : "Cancel Reservation"}
                      </button>
                    )}

                    {isCollectedOrderStatus(order.status) && (
                      <div className="mt-5 rounded-2xl bg-white p-4 text-left shadow-sm">
                        {order.rated_at ? (
                          <p className="text-center font-black text-green-700">
                            Business rated
                          </p>
                        ) : (
                          <>
                            <p className="text-center text-sm font-black text-gray-700">
                              Rate this pickup
                            </p>
                            <div className="mt-3 grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
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
                              placeholder="Optional review for the business"
                              className="mt-3 min-h-24 w-full rounded-2xl border bg-white p-3 text-sm font-semibold text-gray-800 outline-none focus:border-green-600"
                            />

                            <button
                              type="button"
                              onClick={() => void rateOrder(order)}
                              disabled={ratingOrderId !== null || !selectedRating}
                              className="mt-3 min-h-11 w-full rounded-full bg-green-700 px-5 py-2.5 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ratingOrderId === order.id
                                ? "Saving review..."
                                : "Submit review"}
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
