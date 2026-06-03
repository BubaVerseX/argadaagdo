"use client";

import AnalyticsBarCard from "@/components/AnalyticsBarCard";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import StatCard from "@/components/StatCard";
import { getProfileById } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, Order } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function AdminPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState(true);
  const [updatingBusinessId, setUpdatingBusinessId] = useState<number | null>(
    null
  );
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAdminAndLoadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const profile = await getProfileById(userData.user.id, 4);

    if (!profile || profile.role !== "admin") {
      router.replace("/offers");
      return;
    }

    const [businessResult, offerResult, orderResult] = await Promise.all([
      supabase.from("businesses").select("*").order("id", { ascending: false }),
      supabase.from("offers").select("*"),
      supabase.from("orders").select("*"),
    ]);

    if (businessResult.error || offerResult.error || orderResult.error) {
      setMessageTone("error");
      setMessage(
        "Admin data could not be loaded. Check that your admin database policies allow this view."
      );
      setLoading(false);
      return;
    }

    setBusinesses((businessResult.data || []) as Business[]);
    setOffers((offerResult.data || []) as Offer[]);
    setOrders((orderResult.data || []) as Order[]);
    setLoading(false);
  }, [router]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(
      () => void checkAdminAndLoadData(),
      200
    );
  }, [checkAdminAndLoadData]);

  async function approveBusiness(id: number) {
    setUpdatingBusinessId(id);
    const { error } = await supabase
      .from("businesses")
      .update({ approved: true })
      .eq("id", id);

    if (error) {
      setUpdatingBusinessId(null);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    setMessageTone("success");
    setMessage("Business approved.");
    setUpdatingBusinessId(null);
    await checkAdminAndLoadData();
  }

  async function moveToPending(id: number) {
    setUpdatingBusinessId(id);
    const { error } = await supabase
      .from("businesses")
      .update({ approved: false })
      .eq("id", id);

    if (error) {
      setUpdatingBusinessId(null);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    setMessageTone("success");
    setMessage("Business moved to pending.");
    setUpdatingBusinessId(null);
    await checkAdminAndLoadData();
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void checkAdminAndLoadData(),
      0
    );

    const channel = supabase
      .channel("admin-dashboard-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoad);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [checkAdminAndLoadData, scheduleRefresh]);

  const pendingBusinesses = businesses.filter((business) => !business.approved);
  const approvedBusinesses = businesses.filter((business) => business.approved);
  const activeOffers = offers.filter((offer) => offer.active);
  const reservedOrders = orders.filter((order) => order.status === "reserved");
  const completedOrders = orders.filter((order) => order.status === "completed");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");
  const adminAnalytics = [
    {
      title: "Reservations",
      value: reservedOrders.length,
      caption: `${reservedOrders.length} active of ${orders.length} total orders`,
      percentage: getPercentage(reservedOrders.length, orders.length),
      tone: "yellow" as const,
    },
    {
      title: "Completed pickups",
      value: completedOrders.length,
      caption: `${completedOrders.length} completed of ${orders.length} total orders`,
      percentage: getPercentage(completedOrders.length, orders.length),
      tone: "green" as const,
    },
    {
      title: "Cancelled orders",
      value: cancelledOrders.length,
      caption: `${cancelledOrders.length} cancelled of ${orders.length} total orders`,
      percentage: getPercentage(cancelledOrders.length, orders.length),
      tone: "red" as const,
    },
    {
      title: "Active offers",
      value: activeOffers.length,
      caption: `${activeOffers.length} public of ${offers.length} total offers`,
      percentage: getPercentage(activeOffers.length, offers.length),
      tone: "green" as const,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F6EF]">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <div className="h-56 animate-pulse rounded-3xl bg-white" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF]">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-12">
        <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-12">
          <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
            Platform overview
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            Admin dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:text-lg">
            Review business approvals and monitor the food-rescue marketplace.
          </p>
        </div>

        {message && (
          <div className="mt-5">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-4 xl:grid-cols-8">
          <StatCard title="Businesses" value={businesses.length} />
          <StatCard title="Pending" value={pendingBusinesses.length} tone="yellow" />
          <StatCard title="Approved" value={approvedBusinesses.length} tone="green" />
          <StatCard title="Active offers" value={activeOffers.length} tone="green" />
          <StatCard title="Total orders" value={orders.length} />
          <StatCard title="Reserved" value={reservedOrders.length} tone="yellow" />
          <StatCard title="Completed pickups" value={completedOrders.length} tone="green" />
          <StatCard title="Cancelled orders" value={cancelledOrders.length} tone="red" />
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Live marketplace health
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Analytics snapshot
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
              Lightweight status cards based on the current orders and offers
              visible to admins.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {adminAnalytics.map((metric) => (
              <AnalyticsBarCard key={metric.title} {...metric} />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black sm:text-2xl">Pending businesses</h2>
            <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-800">
              {pendingBusinesses.length} waiting
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            {pendingBusinesses.length === 0 && (
              <p className="text-gray-600">No pending businesses.</p>
            )}

            {pendingBusinesses.map((business) => (
              <div
                key={business.id}
                className="flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-xl font-black">{business.name}</h3>
                  <p className="text-gray-600">
                    {business.business_type} · {business.address}
                  </p>
                  <p className="text-gray-600">{business.phone}</p>
                  <p className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-700">
                    Pending approval
                  </p>
                </div>

                <button
                  onClick={() => approveBusiness(business.id)}
                  disabled={updatingBusinessId !== null}
                  className="min-h-12 rounded-full bg-green-700 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingBusinessId === business.id ? "Updating..." : "Approve"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <h2 className="text-xl font-black sm:text-2xl">Approved businesses</h2>

          <div className="mt-6 grid gap-4">
            {approvedBusinesses.length === 0 && (
              <p className="text-gray-600">No approved businesses yet.</p>
            )}

            {approvedBusinesses.map((business) => (
              <div
                key={business.id}
                className="flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-xl font-black">{business.name}</h3>
                  <p className="text-gray-600">
                    {business.business_type} · {business.address}
                  </p>
                  <p className="text-gray-600">{business.phone}</p>
                  <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                    Approved
                  </p>
                </div>

                <button
                  onClick={() => moveToPending(business.id)}
                  disabled={updatingBusinessId !== null}
                  className="min-h-12 rounded-full bg-red-600 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingBusinessId === business.id
                    ? "Updating..."
                    : "Move to pending"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
