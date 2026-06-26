"use client";

import AnalyticsBarCard from "@/components/AnalyticsBarCard";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import StatCard from "@/components/StatCard";
import { getConfirmedProfile } from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  formatDisplayDateTime,
  getEffectiveOfferStatus,
} from "@/lib/offerLifecycle";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type AdminBusiness = Business & {
  created_at?: string | null;
};

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function AdminPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [totalRatings, setTotalRatings] = useState(0);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [loading, setLoading] = useState(true);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [updatingBusinessId, setUpdatingBusinessId] = useState<number | null>(
    null
  );
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAdminAndLoadData = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (
      profileResult.status !== "confirmed" ||
      profileResult.profile.role !== "admin"
    ) {
      setRealtimeReady(false);
      router.replace("/");
      return;
    }

    await processExpiredMarketplace();

    const [
      businessResult,
      offerResult,
      orderResult,
      profilesResult,
      ratingsResult,
    ] =
      await Promise.all([
        supabase
          .from("businesses")
          .select("*")
          .order("id", { ascending: false }),
        supabase.from("offers").select("*"),
        supabase.from("orders").select("*"),
        supabase.from("profiles").select(`
          id,
          email,
          role,
          reliability_score,
          reliability_status,
          no_show_count,
          completed_pickup_count,
          cancelled_order_count
        `),
        supabase
          .from("business_ratings")
          .select("id", { count: "exact", head: true }),
      ]);

    if (
      businessResult.error ||
      offerResult.error ||
      orderResult.error ||
      profilesResult.error ||
      ratingsResult.error
    ) {
      setMessageTone("error");
      setMessage(
        "Admin data could not be loaded. Check that your admin database policies allow this view."
      );
      setLoading(false);
      return;
    }

    setBusinesses((businessResult.data || []) as AdminBusiness[]);
    setOffers((offerResult.data || []) as Offer[]);
    setOrders((orderResult.data || []) as Order[]);
    setProfiles((profilesResult.data || []) as Profile[]);
    setTotalRatings(ratingsResult.count || 0);
    setRealtimeReady(true);
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
      setMessage("Business could not be approved. Please try again.");
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
      setMessage("Business status could not be updated. Please try again.");
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

    return () => {
      window.clearTimeout(initialLoad);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [checkAdminAndLoadData]);

  useEffect(() => {
    if (!realtimeReady) return;

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_ratings" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [realtimeReady, scheduleRefresh]);

  const pendingBusinesses = businesses.filter((business) => !business.approved);
  const approvedBusinesses = businesses.filter((business) => business.approved);
  const activeOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "active"
  );
  const soldOutOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "sold_out"
  );
  const expiredOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "expired"
  );
  const inactiveOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "inactive"
  );
  const reservedOrders = orders.filter((order) => order.status === "reserved");
  const completedOrders = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter(
    (order) => order.status === "cancelled" || order.status === "refunded"
  );
  const noShowOrders = orders.filter((order) => order.status === "no_show");
  const excellentProfiles = profiles.filter(
    (profile) => profile.reliability_status === "excellent"
  );
  const warningProfiles = profiles.filter(
    (profile) => profile.reliability_status === "warning"
  );
  const restrictedProfiles = profiles.filter(
    (profile) => profile.reliability_status === "restricted"
  );
  const averageReliability =
    profiles.length > 0
      ? Math.round(
          profiles.reduce(
            (total, profile) => total + Number(profile.reliability_score || 0),
            0
          ) / profiles.length
        )
      : 0;
  const totalProfileCompletedPickups = profiles.reduce(
    (total, profile) => total + Number(profile.completed_pickup_count || 0),
    0
  );
  const totalProfileCancellations = profiles.reduce(
    (total, profile) => total + Number(profile.cancelled_order_count || 0),
    0
  );
  const totalProfileNoShows = profiles.reduce(
    (total, profile) => total + Number(profile.no_show_count || 0),
    0
  );
  const marketplaceOverview = [
    {
      title: "Total Businesses",
      value: businesses.length,
      helper: "All submitted business profiles",
      className: "bg-white text-gray-950",
    },
    {
      title: "Approved Businesses",
      value: approvedBusinesses.length,
      helper: "Businesses allowed to publish offers",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Pending Businesses",
      value: pendingBusinesses.length,
      helper: "Registrations waiting for review",
      className: "bg-yellow-50 text-yellow-900",
    },
    {
      title: "Active Offers",
      value: activeOffers.length,
      helper: "Offers currently visible to customers",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Total Orders",
      value: orders.length,
      helper: "All reservations and pickup records",
      className: "bg-white text-gray-950",
    },
    {
      title: "Total Ratings",
      value: totalRatings,
      helper: "Customer reviews submitted",
      className: "bg-yellow-50 text-yellow-900",
    },
  ];
  const marketplaceHealth = [
    {
      title: "Businesses Approved",
      value: approvedBusinesses.length,
      caption: `${approvedBusinesses.length} approved of ${businesses.length} total businesses`,
      percentage: getPercentage(approvedBusinesses.length, businesses.length),
      tone: "green" as const,
    },
    {
      title: "Offers Active",
      value: activeOffers.length,
      caption: `${activeOffers.length} active of ${offers.length} total offers`,
      percentage: getPercentage(activeOffers.length, offers.length),
      tone: "green" as const,
    },
    {
      title: "Reservations Created",
      value: orders.length,
      caption: `${reservedOrders.length} waiting for pickup`,
      percentage: getPercentage(orders.length, Math.max(orders.length, 1)),
      tone: "yellow" as const,
    },
    {
      title: "Ratings Submitted",
      value: totalRatings,
      caption: `${totalRatings} customer ${
        totalRatings === 1 ? "rating" : "ratings"
      } submitted`,
      percentage: getPercentage(totalRatings, Math.max(totalRatings, 1)),
      tone: "yellow" as const,
    },
  ];
  const operationalStats = [
    { title: "Sold Out", value: soldOutOffers.length, tone: "yellow" as const },
    { title: "Expired", value: expiredOffers.length, tone: "red" as const },
    { title: "Inactive", value: inactiveOffers.length },
    { title: t("orders.reserved"), value: reservedOrders.length, tone: "yellow" as const },
    { title: t("orders.collected"), value: completedOrders.length, tone: "green" as const },
    { title: t("orders.cancelled"), value: cancelledOrders.length, tone: "red" as const },
    { title: "No-show", value: noShowOrders.length, tone: "red" as const },
    { title: "Profiles", value: profiles.length },
    { title: "Avg score", value: averageReliability, tone: "green" as const },
    { title: "Warning", value: warningProfiles.length, tone: "yellow" as const },
    { title: "Restricted", value: restrictedProfiles.length, tone: "red" as const },
    {
      title: "Profile no-shows",
      value: totalProfileNoShows,
      tone: "red" as const,
    },
  ];
  const customerReliabilityStats = [
    { title: "Excellent", value: excellentProfiles.length, tone: "green" as const },
    {
      title: "Profile pickups",
      value: totalProfileCompletedPickups,
      tone: "green" as const,
    },
    {
      title: "Profile cancels",
      value: totalProfileCancellations,
      tone: "yellow" as const,
    },
  ];
  const moderationStats = [
    {
      title: "Pending businesses",
      value: pendingBusinesses.length,
      helper: "Applications waiting for approval",
      className: "bg-yellow-50 text-yellow-900",
    },
    {
      title: "Approved businesses",
      value: approvedBusinesses.length,
      helper: "Businesses allowed to publish offers",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Inactive offers",
      value: inactiveOffers.length,
      helper: "Offers hidden by businesses or admins",
      className: "bg-gray-100 text-gray-800",
    },
    {
      title: "Expired offers",
      value: expiredOffers.length,
      helper: "Pickup windows that have already passed",
      className: "bg-red-50 text-red-800",
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
            {t("admin.analytics")}
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            {t("admin.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:text-lg">
            {t("admin.subtitle")}
          </p>
        </div>

        {message && (
          <div className="mt-5">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Marketplace overview
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Pilot operations snapshot
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
              The core numbers admins need before approving businesses or
              checking marketplace activity.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {marketplaceOverview.map((metric) => (
              <div
                key={metric.title}
                className={`rounded-2xl p-4 shadow-sm sm:rounded-3xl sm:p-5 ${metric.className}`}
              >
                <p className="text-sm font-black opacity-75">{metric.title}</p>
                <p className="mt-2 text-3xl font-black sm:text-4xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 opacity-70">
                  {metric.helper}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              Admin guidance
            </p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">
              Use this dashboard to approve businesses and monitor marketplace
              activity.
            </h2>
            <p className="mt-4 font-semibold leading-7 text-green-50">
              Review pending businesses before they can publish offers, then
              watch orders, active offers, ratings and reliability signals as
              the pilot grows.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                  Live marketplace health
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  {t("admin.analytics")}
                </h2>
              </div>

              <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
                Lightweight status cards based on the current businesses,
                offers, orders and ratings visible to admins.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {marketplaceHealth.map((metric) => (
                <AnalyticsBarCard key={metric.title} {...metric} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Operational details
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Status and reliability
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
              Extra signals for spotting sold-out offers, no-shows and customer
              reliability risks during the pilot.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {operationalStats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}

            {customerReliabilityStats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Moderation visibility
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Business and offer review signals
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
              Rejected businesses are not a separate state in the current
              approval model; unapproved businesses stay in the pending queue.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {moderationStats.map((metric) => (
              <div
                key={metric.title}
                className={`rounded-2xl p-4 shadow-sm sm:rounded-3xl sm:p-5 ${metric.className}`}
              >
                <p className="text-sm font-black opacity-75">{metric.title}</p>
                <p className="mt-2 text-3xl font-black sm:text-4xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 opacity-70">
                  {metric.helper}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-700 sm:text-sm">
                Approval queue
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {t("admin.pendingBusinesses")}
              </h2>
              <p className="mt-2 max-w-2xl font-semibold leading-7 text-gray-600">
                Review new business registrations before they can publish food
                rescue offers.
              </p>
            </div>

            <span className="w-full rounded-full bg-yellow-100 px-4 py-2 text-center text-sm font-black text-yellow-800 sm:w-auto">
              {pendingBusinesses.length} waiting
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "1. Review details",
                text: "Check the business type, address and phone before approving.",
              },
              {
                title: "2. Approve verified businesses",
                text: "Approved businesses can open their dashboard and publish offers.",
              },
              {
                title: "3. Monitor pilot activity",
                text: "Use marketplace health cards to watch offers, orders and ratings.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-2xl bg-[#F7F6EF] p-4 text-sm"
              >
                <p className="font-black text-gray-950">{step.title}</p>
                <p className="mt-2 font-semibold leading-6 text-gray-600">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            {pendingBusinesses.length === 0 && (
              <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/70 p-6 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-green-700">
                  ✓
                </div>
                <h3 className="mt-4 text-2xl font-black text-gray-950">
                  No businesses awaiting approval
                </h3>
                <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
                  New registrations will appear here.
                </p>
              </div>
            )}

            {pendingBusinesses.map((business) => (
              <div
                key={business.id}
                className="flex flex-col gap-5 rounded-3xl border border-yellow-100 bg-yellow-50/40 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black sm:text-2xl">
                      {business.name}
                    </h3>
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-800">
                      Pending approval
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm font-semibold text-gray-700 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Business type
                      </p>
                      <p className="mt-1 break-words text-gray-950">
                        {business.business_type || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Address
                      </p>
                      <p className="mt-1 break-words text-gray-950">
                        {business.address || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Phone
                      </p>
                      <p className="mt-1 break-words text-gray-950">
                        {business.phone || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Registered
                      </p>
                      <p className="mt-1 break-words text-gray-950">
                        {formatDisplayDateTime(business.created_at, language)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => approveBusiness(business.id)}
                  disabled={updatingBusinessId !== null}
                  className="min-h-12 w-full shrink-0 rounded-full bg-green-700 px-6 py-3 font-black text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
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
              <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/70 p-6 text-center sm:p-8">
                <h3 className="text-2xl font-black text-gray-950">
                  No approved businesses yet
                </h3>
                <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
                  Approved businesses will appear here after you review new registrations.
                </p>
              </div>
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
