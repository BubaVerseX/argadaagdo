"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import StatCard from "@/components/StatCard";
import { createMapsSearchUrl } from "@/lib/maps";
import { notifyOrderCancelled } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(
    null
  );
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadOrders(userId: string, showLoading = false) {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        offers(
          id,
          title,
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

  async function cancelOrder(order: Order) {
    if (order.status !== "reserved") return;

    setCancellingOrderId(order.id);
    setMessage("");
    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id ? { ...item, status: "cancelled" } : item
      )
    );

    const { error: orderError } = await supabase.rpc("cancel_order", {
      p_order_id: order.id,
    });

    if (orderError) {
      setCancellingOrderId(null);
      setMessageTone("error");
      setMessage(orderError.message);
      await loadOrders(order.user_id);
      return;
    }

    setMessageTone("success");
    setMessage("Order cancelled. Quantity restored.");
    notifyOrderCancelled({
      orderId: order.id,
      offerTitle: order.offers?.title,
      businessName: order.offers?.businesses?.name,
    });
    setCancellingOrderId(null);
    await loadOrders(order.user_id);
  }

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialiseOrders() {
      const { data: userData } = await supabase.auth.getUser();

      if (!active) return;

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const userId = userData.user.id;
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

  const reservedCount = orders.filter((order) => order.status === "reserved").length;
  const completedCount = orders.filter((order) => order.status === "completed").length;
  const cancelledCount = orders.filter((order) => order.status === "cancelled").length;
  const visibleOrders = orders.filter((order) => order.status !== "cancelled");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");

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

          <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
            <StatCard title="Reserved" value={reservedCount} tone="yellow" />
            <StatCard title="Completed" value={completedCount} tone="green" />
            <StatCard title="Cancelled" value={cancelledCount} tone="red" />
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

        {!loading && visibleOrders.length === 0 && (
          <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              🥡
            </div>

            <h2 className="mt-5 text-3xl font-black">
              {orders.length === 0 ? "No orders yet" : "No active orders"}
            </h2>

            <p className="mt-3 font-medium text-gray-600">
              {orders.length === 0
                ? "Reserve your first food offer and it will appear here."
                : "Cancelled reservations are removed from the active pickup flow."}
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
          {visibleOrders.map((order) => {
            const businessAddress =
              order.offers?.businesses?.address || "Address unavailable";
            const mapsUrl = createMapsSearchUrl(
              order.offers?.businesses?.address,
              order.offers?.businesses?.name
            );
            const statusClass =
              order.status === "completed"
                ? "bg-green-100 text-green-700"
                : order.status === "cancelled"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700";

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
                        {order.status}
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
                        ⏰ Pickup: {order.offers?.pickup_start} -{" "}
                        {order.offers?.pickup_end}
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

                    {order.status === "reserved" ? (
                      <>
                        <div className="mt-3 rounded-2xl bg-white px-4 py-4 shadow-sm sm:rounded-3xl sm:px-6 sm:py-5">
                          <p className="font-mono text-3xl font-black tracking-[0.18em] text-green-700 sm:text-4xl">
                            {order.pickup_code || "------"}
                          </p>
                        </div>

                        <p className="mt-3 text-sm font-bold text-gray-600">
                          Show this code at pickup.
                        </p>
                      </>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-white px-5 py-5 font-bold text-gray-600 shadow-sm">
                        {order.status === "completed"
                          ? "Pickup completed"
                          : "Reservation cancelled"}
                      </div>
                    )}

                    {order.status === "reserved" && (
                      <button
                        onClick={() => cancelOrder(order)}
                        disabled={cancellingOrderId !== null}
                        className="mt-5 min-h-12 w-full rounded-full bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancellingOrderId === order.id
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && cancelledOrders.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black sm:text-2xl">
                Cancelled reservations
              </h2>
              <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-black text-red-700">
                Not active
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {cancelledOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-red-100 bg-red-50/40 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-gray-950">
                        {order.offers?.title || "Offer unavailable"}
                      </h3>
                      <p className="mt-1 font-semibold text-gray-600">
                        {order.offers?.businesses?.name ||
                          "Business unavailable"}
                      </p>
                    </div>

                    <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-black text-red-700">
                      Cancelled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
