"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import {
  AdminAccountView,
  AdminHealthSections,
  AdminHero,
  AdminMarketplaceOverview,
  AdminModerationVisibility,
  AdminPaymentPreparation,
  ApprovedBusinesses,
  PendingBusinesses,
  type AdminBusiness,
} from "@/components/admin/AdminSections";
import { getConfirmedProfile } from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  formatMoney,
  getEffectiveOfferStatus,
} from "@/lib/offerLifecycle";
import { notifyBusinessApproved } from "@/lib/notifications";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { calculatePaymentPreparationSummary } from "@/lib/paymentArchitecture";
import { supabase } from "@/lib/supabase";
import type { Offer, Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
    const approvedBusiness = businesses.find((business) => business.id === id);
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
    if (approvedBusiness) {
      notifyBusinessApproved({ businessName: approvedBusiness.name });
    }
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
  const customerProfiles = profiles.filter(
    (profile) => profile.role === "customer"
  );
  const businessProfiles = profiles.filter(
    (profile) => profile.role === "business"
  );
  const adminProfiles = profiles.filter((profile) => profile.role === "admin");
  const unknownProfiles = profiles.filter((profile) => !profile.role);
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
    {
      title: "Customers",
      value: customerProfiles.length,
      helper: "Customer accounts in profiles",
      className: "bg-white text-gray-950",
    },
    {
      title: "Business Accounts",
      value: businessProfiles.length,
      helper: "Users with business account role",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Admins",
      value: adminProfiles.length,
      helper: "Admin accounts with approval access",
      className: "bg-white text-gray-950",
    },
  ];
  const accountOverview = [
    {
      title: "Customers",
      value: customerProfiles.length,
      helper: "Can browse, reserve, favorite and rate completed pickups",
      className: "bg-white text-gray-950",
    },
    {
      title: "Businesses",
      value: businessProfiles.length,
      helper: "Can register businesses and manage approved business offers",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Admins",
      value: adminProfiles.length,
      helper: "Can approve businesses and monitor marketplace activity",
      className: "bg-yellow-50 text-yellow-900",
    },
    {
      title: "Missing role",
      value: unknownProfiles.length,
      helper: "Profiles that may need support review",
      className: "bg-red-50 text-red-800",
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
  const paymentPreparationSummary =
    calculatePaymentPreparationSummary(orders);
  const paymentOverview = [
    {
      title: "Paid reservations",
      value: paymentPreparationSummary.activePaidCount,
      helper: "Current reserved/completed orders with recorded amounts",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Refunded/cancelled",
      value: paymentPreparationSummary.refundedCount,
      helper: `${formatMoney(
        paymentPreparationSummary.refundedAmount
      )} marked for refund history`,
      className: "bg-yellow-50 text-yellow-900",
    },
    {
      title: "Platform revenue",
      value: formatMoney(paymentPreparationSummary.platformRevenue),
      helper: "Prepared 10% marketplace fee estimate",
      className: "bg-white text-gray-950",
    },
    {
      title: "Business payout",
      value: formatMoney(paymentPreparationSummary.businessPayout),
      helper: "Prepared 90% business revenue estimate",
      className: "bg-white text-gray-950",
    },
    {
      title: "Pending payouts",
      value: formatMoney(paymentPreparationSummary.pendingPayoutEstimate),
      helper: "Future weekly payout estimate from completed pickups",
      className: "bg-green-50 text-green-900",
    },
    {
      title: "Failed payments",
      value: 0,
      helper: "Provider failures will appear after real payment integration",
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
        <AdminHero t={t} />

        {message && (
          <div className="mt-5">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        <AdminMarketplaceOverview metrics={marketplaceOverview} />

        <AdminHealthSections
          t={t}
          marketplaceHealth={marketplaceHealth}
          operationalStats={operationalStats}
          customerReliabilityStats={customerReliabilityStats}
        />

        <AdminPaymentPreparation metrics={paymentOverview} />

        <AdminAccountView metrics={accountOverview} profiles={profiles} />

        <AdminModerationVisibility metrics={moderationStats} />

        <PendingBusinesses
          t={t}
          language={language}
          businesses={pendingBusinesses}
          updatingBusinessId={updatingBusinessId}
          onApprove={(id) => void approveBusiness(id)}
        />

        <ApprovedBusinesses
          businesses={approvedBusinesses}
          updatingBusinessId={updatingBusinessId}
          onMoveToPending={(id) => void moveToPending(id)}
        />
      </section>
    </main>
  );
}
