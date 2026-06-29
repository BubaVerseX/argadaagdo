"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { LoadingState } from "@/components/LoadingState";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import {
  AdminAccountView,
  AdminHealthSections,
  AdminHero,
  AdminMarketplaceOverview,
  AdminRevenueInsights,
  AdminModerationVisibility,
  AdminPaymentPreparation,
  ApprovedBusinesses,
  PendingBusinesses,
  type AdminBusiness,
} from "@/components/admin/AdminSections";
import { getConfirmedProfile } from "@/lib/auth";
import { calculateMarketplaceAnalytics } from "@/lib/analytics";
import {
  checkApplicationHealth,
  type ApplicationHealthItem,
} from "@/lib/diagnostics";
import { logAppError } from "@/lib/errors";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  formatMoney,
  getEffectiveOfferStatus,
  getTbilisiDateKey,
} from "@/lib/offerLifecycle";
import { notifyBusinessApproved } from "@/lib/notifications";
import {
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { calculatePaymentPreparationSummary } from "@/lib/paymentArchitecture";
import { paginateItems } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import type { Offer, Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

type AdminOfferFilter = "all" | "active" | "inactive" | "expired" | "sold_out";
type AdminOrderFilter =
  | "all"
  | "reserved"
  | "completed"
  | "cancelled"
  | "no_show";
type AdminProfileFilter = "all" | "customer" | "business" | "admin";

const ADMIN_LIST_PAGE_SIZE = 8;
const ADMIN_QUERY_LIMIT = 1000;

export default function AdminPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [applicationHealth, setApplicationHealth] = useState<
    ApplicationHealthItem[]
  >([]);
  const [totalRatings, setTotalRatings] = useState(0);
  const [ratingScores, setRatingScores] = useState<
    Array<{ rating: number | string | null }>
  >([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [loading, setLoading] = useState(true);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminOfferFilter, setAdminOfferFilter] =
    useState<AdminOfferFilter>("all");
  const [adminOrderFilter, setAdminOrderFilter] =
    useState<AdminOrderFilter>("all");
  const [adminProfileFilter, setAdminProfileFilter] =
    useState<AdminProfileFilter>("all");
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
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
          .order("id", { ascending: false })
          .limit(ADMIN_QUERY_LIMIT),
        supabase.from("offers").select("*").limit(ADMIN_QUERY_LIMIT),
        supabase.from("orders").select("*").limit(ADMIN_QUERY_LIMIT),
        supabase.from("profiles").select(`
          id,
          email,
          role,
          reliability_score,
          reliability_status,
          no_show_count,
          completed_pickup_count,
          cancelled_order_count
        `).limit(ADMIN_QUERY_LIMIT),
        supabase
          .from("business_ratings")
          .select("rating", { count: "exact" })
          .limit(ADMIN_QUERY_LIMIT),
      ]);

    if (
      businessResult.error ||
      offerResult.error ||
      orderResult.error ||
      profilesResult.error ||
      ratingsResult.error
    ) {
      logAppError(
        "Admin dashboard failed to load marketplace data",
        businessResult.error ||
          offerResult.error ||
          orderResult.error ||
          profilesResult.error ||
          ratingsResult.error,
        {
          operation: "load_admin_dashboard",
        }
      );
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
    setRatingScores(
      (ratingsResult.data || []) as Array<{ rating: number | string | null }>
    );
    setApplicationHealth(await checkApplicationHealth());
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
      logAppError("Business approval failed", error, {
        operation: "approve_business",
        businessId: id,
      });
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
      logAppError("Business status update failed", error, {
        operation: "move_business_to_pending",
        businessId: id,
      });
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
  const businessNameById = businesses.reduce<Record<number, string>>(
    (businessMap, business) => {
      businessMap[business.id] = business.name;
      return businessMap;
    },
    {}
  );
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
  const activeReservationOrders = orders.filter((order) =>
    isConfirmedOrderStatus(order.status)
  );
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
  const marketplaceAnalytics = calculateMarketplaceAnalytics({
    businessesCount: businesses.length,
    customersCount: customerProfiles.length,
    offers,
    orders,
    ratings: ratingScores,
  });
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
  const normalizedAdminSearch = adminSearch.trim().toLowerCase();
  const filteredPendingBusinesses = pendingBusinesses.filter((business) => {
    const searchText =
      `${business.name} ${business.business_type} ${business.address} ${business.phone}`.toLowerCase();
    return normalizedAdminSearch === "" || searchText.includes(normalizedAdminSearch);
  });
  const filteredApprovedBusinesses = approvedBusinesses.filter((business) => {
    const searchText =
      `${business.name} ${business.business_type} ${business.address} ${business.phone}`.toLowerCase();
    return normalizedAdminSearch === "" || searchText.includes(normalizedAdminSearch);
  });
  const filteredAdminOffers = offers.filter((offer) => {
    const status = getEffectiveOfferStatus(offer);
    const searchText =
      `${offer.title} ${offer.category} ${businessNameById[offer.business_id] || ""}`.toLowerCase();
    const matchesSearch =
      normalizedAdminSearch === "" || searchText.includes(normalizedAdminSearch);
    const matchesFilter = adminOfferFilter === "all" || status === adminOfferFilter;

    return matchesSearch && matchesFilter;
  });
  const filteredAdminOrders = orders.filter((order) => {
    const isCompleted = isCollectedOrderStatus(order.status);
    const isCancelled =
      order.status === "cancelled" || order.status === "refunded";
    const searchText =
      `${order.id} ${order.user_id} ${order.offer_id} ${order.status}`.toLowerCase();
    const matchesSearch =
      normalizedAdminSearch === "" || searchText.includes(normalizedAdminSearch);
    const matchesFilter =
      adminOrderFilter === "all" ||
      (adminOrderFilter === "reserved" &&
        isConfirmedOrderStatus(order.status)) ||
      (adminOrderFilter === "completed" && isCompleted) ||
      (adminOrderFilter === "cancelled" && isCancelled) ||
      (adminOrderFilter === "no_show" && order.status === "no_show");

    return matchesSearch && matchesFilter;
  });
  const filteredAdminProfiles = profiles.filter((profile) => {
    const searchText = `${profile.email} ${profile.role}`.toLowerCase();
    const matchesSearch =
      normalizedAdminSearch === "" || searchText.includes(normalizedAdminSearch);
    const matchesFilter =
      adminProfileFilter === "all" || profile.role === adminProfileFilter;

    return matchesSearch && matchesFilter;
  });
  const paginatedPendingBusinesses = paginateItems(
    filteredPendingBusinesses,
    pendingPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const paginatedApprovedBusinesses = paginateItems(
    filteredApprovedBusinesses,
    approvedPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const todayDateKey = getTbilisiDateKey();
  const todayOfferIds = new Set(
    offers
      .filter((offer) => offer.pickup_date === todayDateKey)
      .map((offer) => offer.id)
  );
  const todayReservations = orders.filter((order) =>
    todayOfferIds.has(order.offer_id)
  );
  const todayPickups = todayReservations.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const businessIdsWithOffers = new Set(offers.map((offer) => offer.business_id));
  const businessesWithZeroOffers = businesses.filter(
    (business) => !businessIdsWithOffers.has(business.id)
  );
  const customersWithActiveReservations = new Set(
    activeReservationOrders
      .map((order) => order.user_id)
      .filter((userId): userId is string => Boolean(userId))
  );
  const marketplaceOperations = [
    {
      title: "Pending businesses",
      value: pendingBusinesses.length,
      tone: pendingBusinesses.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Active offers",
      value: activeOffers.length,
      tone: activeOffers.length > 0 ? ("green" as const) : undefined,
    },
    {
      title: "Today's reservations",
      value: todayReservations.length,
      tone: todayReservations.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Today's pickups",
      value: todayPickups.length,
      tone: todayPickups.length > 0 ? ("green" as const) : undefined,
    },
    {
      title: "Expired offers",
      value: expiredOffers.length,
      tone: expiredOffers.length > 0 ? ("red" as const) : undefined,
    },
    {
      title: "Businesses with zero offers",
      value: businessesWithZeroOffers.length,
      tone: businessesWithZeroOffers.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Customers with active reservations",
      value: customersWithActiveReservations.size,
      tone:
        customersWithActiveReservations.size > 0
          ? ("green" as const)
          : undefined,
    },
  ];
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
          <LoadingState
            title="Loading admin dashboard..."
            description="Checking businesses, offers, orders and marketplace health."
          />
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

        <AdminRevenueInsights analytics={marketplaceAnalytics} />

        <AdminHealthSections
          t={t}
          marketplaceHealth={marketplaceHealth}
          marketplaceOperations={marketplaceOperations}
          operationalStats={operationalStats}
          customerReliabilityStats={customerReliabilityStats}
          applicationHealth={applicationHealth}
        />

        <AdminPaymentPreparation metrics={paymentOverview} />

        <AdminAccountView metrics={accountOverview} profiles={profiles} />

        <AdminModerationVisibility metrics={moderationStats} />

        <FilterBar
          className="mt-6 sm:mt-8"
          title="Admin search tools"
          description="Search businesses, offers, customers and orders from one place."
        >
          <SearchBar
            value={adminSearch}
            onChange={(value) => {
              setAdminSearch(value);
              setPendingPage(1);
              setApprovedPage(1);
            }}
            placeholder="Search admin data..."
            label="Search admin data"
          />

          <select
            value={adminOfferFilter}
            onChange={(event) =>
              setAdminOfferFilter(event.target.value as AdminOfferFilter)
            }
            aria-label="Filter admin offers"
            className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All offer statuses</option>
            <option value="active">Active offers</option>
            <option value="inactive">Inactive offers</option>
            <option value="expired">Expired offers</option>
            <option value="sold_out">Sold out offers</option>
          </select>

          <select
            value={adminOrderFilter}
            onChange={(event) =>
              setAdminOrderFilter(event.target.value as AdminOrderFilter)
            }
            aria-label="Filter admin orders"
            className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All order statuses</option>
            <option value="reserved">Reserved</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled/refunded</option>
            <option value="no_show">No-show</option>
          </select>

          <select
            value={adminProfileFilter}
            onChange={(event) =>
              setAdminProfileFilter(event.target.value as AdminProfileFilter)
            }
            aria-label="Filter admin profiles"
            className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All account roles</option>
            <option value="customer">Customers</option>
            <option value="business">Businesses</option>
            <option value="admin">Admins</option>
          </select>
        </FilterBar>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-gray-500">Businesses found</p>
            <p className="mt-2 text-3xl font-black">
              {filteredPendingBusinesses.length + filteredApprovedBusinesses.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-gray-500">Offers found</p>
            <p className="mt-2 text-3xl font-black">
              {filteredAdminOffers.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-gray-500">Orders found</p>
            <p className="mt-2 text-3xl font-black">
              {filteredAdminOrders.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-gray-500">Accounts found</p>
            <p className="mt-2 text-3xl font-black">
              {filteredAdminProfiles.length}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-gray-950">Offer matches</h3>
            <div className="mt-4 grid gap-3">
              {filteredAdminOffers.slice(0, 5).map((offer) => (
                <div key={offer.id} className="rounded-2xl bg-[#F7F6EF] p-4">
                  <p className="font-black text-gray-950">{offer.title}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    {businessNameById[offer.business_id] || "Business"} ·{" "}
                    {getEffectiveOfferStatus(offer)}
                  </p>
                </div>
              ))}
              {filteredAdminOffers.length === 0 && (
                <p className="font-semibold text-gray-600">No offers found.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-gray-950">Order matches</h3>
            <div className="mt-4 grid gap-3">
              {filteredAdminOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded-2xl bg-[#F7F6EF] p-4">
                  <p className="font-black text-gray-950">Order #{order.id}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    Offer #{order.offer_id} · {order.status}
                  </p>
                </div>
              ))}
              {filteredAdminOrders.length === 0 && (
                <p className="font-semibold text-gray-600">No orders found.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-gray-950">Account matches</h3>
            <div className="mt-4 grid gap-3">
              {filteredAdminProfiles.slice(0, 5).map((profile) => (
                <div key={profile.id} className="rounded-2xl bg-[#F7F6EF] p-4">
                  <p className="break-words font-black text-gray-950">
                    {profile.email || "Email unavailable"}
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-gray-600">
                    {profile.role || "Missing role"}
                  </p>
                </div>
              ))}
              {filteredAdminProfiles.length === 0 && (
                <p className="font-semibold text-gray-600">No accounts found.</p>
              )}
            </div>
          </div>
        </div>

        <PendingBusinesses
          t={t}
          language={language}
          businesses={paginatedPendingBusinesses.items}
          updatingBusinessId={updatingBusinessId}
          onApprove={(id) => void approveBusiness(id)}
        />

        <Pagination
          className="mt-5"
          page={paginatedPendingBusinesses.page}
          totalItems={filteredPendingBusinesses.length}
          pageSize={ADMIN_LIST_PAGE_SIZE}
          label="Pending businesses"
          onPageChange={setPendingPage}
        />

        <ApprovedBusinesses
          businesses={paginatedApprovedBusinesses.items}
          updatingBusinessId={updatingBusinessId}
          onMoveToPending={(id) => void moveToPending(id)}
        />

        <Pagination
          className="mt-5"
          page={paginatedApprovedBusinesses.page}
          totalItems={filteredApprovedBusinesses.length}
          pageSize={ADMIN_LIST_PAGE_SIZE}
          label="Approved businesses"
          onPageChange={setApprovedPage}
        />
      </section>
    </main>
  );
}
