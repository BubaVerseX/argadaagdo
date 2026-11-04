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
  AdminMarketplaceIntelligence,
  AdminMarketplaceOverview,
  AdminOperationalDashboard,
  AdminRevenueInsights,
  AdminModerationVisibility,
  AdminPaymentsOverview,
  AdminSupportTools,
  ApprovedBusinesses,
  HiddenReviews,
  PendingBusinesses,
  RejectedBusinesses,
  ReportedReviews,
  type AdminReviewReport,
  type AdminBusiness,
} from "@/components/admin/AdminSections";
import { getConfirmedProfile } from "@/lib/auth";
import { calculateMarketplaceAnalytics } from "@/lib/analytics";
import {
  checkApplicationHealth,
  type ApplicationHealthItem,
} from "@/lib/diagnostics";
import { triggerTransactionalEmail } from "@/lib/email/client";
import { logAppError } from "@/lib/errors";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  formatMoney,
  getEffectiveOfferStatus,
  getTbilisiDateKey,
  getTbilisiDateKeyFromValue,
} from "@/lib/offerLifecycle";
import { notifyBusinessApproved } from "@/lib/notifications";
import {
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
  isFailedCheckoutOrder,
} from "@/lib/orderStatus";
import { calculatePaymentSummary } from "@/lib/paymentArchitecture";
import { paginateItems } from "@/lib/pagination";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import type { Offer, Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getBusinessSortTime(business: AdminBusiness) {
  if (!business.created_at) return business.id;
  const createdAt = new Date(business.created_at).getTime();
  return Number.isFinite(createdAt) ? createdAt : business.id;
}

type AdminOfferFilter = "all" | "active" | "inactive" | "expired" | "sold_out";
type AdminOrderFilter =
  | "all"
  | "reserved"
  | "completed"
  | "cancelled"
  | "no_show";
type AdminProfileFilter = "all" | "customer" | "business" | "admin";
type ApprovalQueueFilter =
  | "newest"
  | "oldest"
  | "needs_review"
  | "approved"
  | "rejected";

const ADMIN_LIST_PAGE_SIZE = 8;
// PostgREST returns at most 1000 rows per request, so read in pages; the old
// single .limit(1000) silently truncated every marketplace total.
const ADMIN_PAGE_SIZE = 1000;
const ADMIN_MAX_ROWS = 20000;
// Matches max_attempts in complete_pickup
// (supabase/migrations/20261016141833_pickup_code_attempt_limit.sql).
const PICKUP_CODE_MAX_ATTEMPTS = 5;

async function fetchAllRows<T>(
  table: string,
  columns: string,
  orderColumn = "id"
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];

  for (let from = 0; from < ADMIN_MAX_ROWS; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: false })
      .range(from, from + ADMIN_PAGE_SIZE - 1);

    if (error) return { data: rows, error };

    rows.push(...((data || []) as T[]));

    if (!data || data.length < ADMIN_PAGE_SIZE) break;
  }

  return { data: rows, error: null };
}

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
  const [approvalQueueFilter, setApprovalQueueFilter] =
    useState<ApprovalQueueFilter>("newest");
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [reviewReports, setReviewReports] = useState<AdminReviewReport[]>([]);
  const [reviewReportsPage, setReviewReportsPage] = useState(1);
  const [hiddenReviewsPage, setHiddenReviewsPage] = useState(1);
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null);
  const [updatingBusinessId, setUpdatingBusinessId] = useState<number | null>(
    null
  );
  const [unlockingOrderId, setUnlockingOrderId] = useState<number | null>(
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
      reportsResult,
    ] =
      await Promise.all([
        fetchAllRows<AdminBusiness>("businesses", "*"),
        fetchAllRows<Offer>("offers", "*"),
        fetchAllRows<Order>(
          "orders",
          `${ORDER_COLUMNS}, pickup_code_failed_attempts`
        ),
        fetchAllRows<Profile>(
          "profiles",
          `
          id,
          email,
          role,
          reliability_score,
          reliability_status,
          no_show_count,
          completed_pickup_count,
          cancelled_order_count
        `
        ),
        fetchAllRows<{ rating: number | string | null }>(
          "business_ratings",
          "id, rating"
        ),
        fetchAllRows<AdminReviewReport>(
          "review_reports",
          `
          id,
          review_id,
          reporter_id,
          reason,
          comment,
          created_at,
          status,
          business_ratings(business_id, rating, comment, hidden)
        `
        ),
      ]);

    // Reports are one panel among many: a failure here shouldn't take down the
    // rest of the admin page.
    if (reportsResult.error) {
      logAppError("Admin dashboard failed to load review reports", reportsResult.error, {
        operation: "load_review_reports",
      });
    }
    setReviewReports(reportsResult.error ? [] : reportsResult.data);

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
    setTotalRatings(ratingsResult.data.length);
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

  async function setBusinessFeeRate(id: number, percent: number) {
    if (updatingBusinessId !== null) return;

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setMessageTone("error");
      setMessage("The commission must be between 0 and 100 percent.");
      return;
    }

    setUpdatingBusinessId(id);
    const { error } = await supabase.rpc("set_business_platform_fee_rate", {
      p_business_id: id,
      p_rate: percent / 100,
    });
    setUpdatingBusinessId(null);

    if (error) {
      logAppError("Platform fee update failed", error, {
        operation: "set_business_platform_fee_rate",
        businessId: id,
      });
      setMessageTone("error");
      setMessage("The commission could not be saved. Please try again.");
      return;
    }

    setBusinesses((currentBusinesses) =>
      currentBusinesses.map((business) =>
        business.id === id ? { ...business, platform_fee_rate: percent / 100 } : business
      )
    );
    setMessageTone("success");
    setMessage(`Commission for this business set to ${percent}% for new reservations.`);
  }

  async function approveBusiness(id: number) {
    if (updatingBusinessId !== null) return;

    setUpdatingBusinessId(id);
    const approvedBusiness = businesses.find((business) => business.id === id);
    const { data: updatedRows, error } = await supabase
      .from("businesses")
      .update({ approved: true })
      .eq("id", id)
      .select("id");

    // RLS turns a disallowed update into "0 rows, no error" — don't report
    // success or email the owner in that case.
    if (!error && (!updatedRows || updatedRows.length === 0)) {
      setUpdatingBusinessId(null);
      setMessageTone("error");
      setMessage("Business could not be approved. Please refresh and try again.");
      return;
    }

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
    void triggerTransactionalEmail({
      event: "business_approval",
      businessId: id,
    });
    setUpdatingBusinessId(null);
    await checkAdminAndLoadData();
  }

  async function moveToPending(id: number) {
    if (updatingBusinessId !== null) return;

    const business = businesses.find((item) => item.id === id);
    const businessOfferIds = new Set(
      offers.filter((offer) => offer.business_id === id).map((offer) => offer.id)
    );
    const activeOrderCount = orders.filter(
      (order) =>
        businessOfferIds.has(Number(order.offer_id)) &&
        ["pending_payment", "reserved", "confirmed"].includes(String(order.status))
    ).length;
    const confirmed = window.confirm(
      `Move ${business?.name || "this business"} back to pending?\n\n` +
        "Its offers will be hidden from customers and the owner will lose access to the dashboard." +
        (activeOrderCount > 0
          ? `\n\nWarning: it has ${activeOrderCount} active reservation(s). The owner will not be able to verify these pickups, and they will become no-shows when the pickup window ends.`
          : "")
    );

    if (!confirmed) return;

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

  async function unlockPickupCode(orderId: number) {
    if (unlockingOrderId !== null) return;

    const confirmed = window.confirm(
      `Unlock pickup code for order #${orderId}?\n\n` +
        `It was locked after ${PICKUP_CODE_MAX_ATTEMPTS} wrong codes. Only unlock it once you have confirmed with the business and customer that the pickup is genuine.`
    );

    if (!confirmed) return;

    setUnlockingOrderId(orderId);
    const { error } = await supabase.rpc("reset_pickup_code_attempts", {
      p_order_id: orderId,
    });

    if (error) {
      logAppError("Pickup code unlock failed", error, {
        operation: "reset_pickup_code_attempts",
        orderId,
      });
      setUnlockingOrderId(null);
      setMessageTone("error");
      setMessage("Pickup code could not be unlocked. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage(`Order #${orderId} unlocked. The business can enter the pickup code again.`);
    setUnlockingOrderId(null);
    await checkAdminAndLoadData();
  }

  function requestBusinessChanges(id: number, reason: string) {
    const business = businesses.find((item) => item.id === id);
    setMessageTone("warning");
    setMessage(
      `Change request noted for ${
        business?.name || "this business"
      }. Reason: ${reason || "No reason provided yet."} Current pilot data model keeps the business pending until the owner updates details.`
    );
  }

  async function rejectBusinessApplication(id: number, reason: string) {
    if (updatingBusinessId !== null) return;

    if (!reason) {
      setMessageTone("error");
      setMessage("Write a reason first. The owner will see it and get it by email.");
      return;
    }

    const business = businesses.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Reject ${business?.name || "this business"}?\n\n` +
        "The owner will get an email with this reason, and can edit the details and resubmit."
    );

    if (!confirmed) return;

    setUpdatingBusinessId(id);
    const { data: updatedRows, error } = await supabase
      .from("businesses")
      .update({
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", id)
      .eq("approved", false)
      .is("rejected_at", null)
      .select("id");

    if (error || !updatedRows || updatedRows.length === 0) {
      if (error) {
        logAppError("Business rejection failed", error, {
          operation: "reject_business",
          businessId: id,
        });
      }
      setUpdatingBusinessId(null);
      setMessageTone("error");
      setMessage("Business could not be rejected. Please refresh and try again.");
      return;
    }

    const emailResult = await triggerTransactionalEmail({
      event: "business_rejection",
      businessId: id,
    });

    if (emailResult.ok) {
      setMessageTone("success");
      setMessage("Business rejected. The owner has been emailed the reason.");
    } else {
      setMessageTone("warning");
      setMessage(
        "Business rejected, but the email to the owner could not be sent. They will still see the reason in their dashboard."
      );
    }

    setUpdatingBusinessId(null);
    await checkAdminAndLoadData();
  }

  async function hideReportedReview(reportId: number) {
    if (updatingReportId !== null) return;

    const confirmed = window.confirm(
      "Hide this review?\n\nIt will disappear from all public pages and stop counting toward the business rating."
    );

    if (!confirmed) return;

    setUpdatingReportId(reportId);
    const { error } = await supabase.rpc("admin_hide_reported_review", {
      p_report_id: reportId,
    });
    setUpdatingReportId(null);

    if (error) {
      logAppError("Hiding reported review failed", error, {
        operation: "admin_hide_reported_review",
        reportId,
      });
      setMessageTone("error");
      setMessage("The review could not be hidden. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Review hidden.");
    await checkAdminAndLoadData();
  }

  async function unhideReview(report: AdminReviewReport) {
    if (updatingReportId !== null) return;

    const confirmed = window.confirm(
      "Unhide this review?\n\nIt will be public again and count toward the business rating."
    );

    if (!confirmed) return;

    setUpdatingReportId(report.id);
    const { error } = await supabase.rpc("admin_unhide_review", {
      p_review_id: report.review_id,
    });
    setUpdatingReportId(null);

    if (error) {
      logAppError("Unhiding review failed", error, {
        operation: "admin_unhide_review",
        reviewId: report.review_id,
      });
      setMessageTone("error");
      setMessage("The review could not be unhidden. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Review is public again.");
    await checkAdminAndLoadData();
  }

  async function dismissReviewReport(reportId: number) {
    if (updatingReportId !== null) return;

    setUpdatingReportId(reportId);
    const { data: updatedRows, error } = await supabase
      .from("review_reports")
      .update({ status: "dismissed" })
      .eq("id", reportId)
      .eq("status", "open")
      .select("id");
    setUpdatingReportId(null);

    if (error || !updatedRows || updatedRows.length === 0) {
      if (error) {
        logAppError("Dismissing review report failed", error, {
          operation: "dismiss_review_report",
          reportId,
        });
      }
      setMessageTone("error");
      setMessage("The report could not be dismissed. Please refresh and try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Report dismissed. The review stays public.");
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
      .channel(uniqueChannelName("admin-dashboard-live-updates"))
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

  const pendingBusinesses = businesses.filter(
    (business) => !business.approved && !business.rejected_at
  );
  const rejectedBusinesses = businesses.filter(
    (business) => !business.approved && business.rejected_at
  );
  const approvedBusinesses = businesses.filter((business) => business.approved);
  const openReviewReports = reviewReports.filter(
    (report) => report.status === "open"
  );
  // Several people can report one review; list each hidden review once.
  const hiddenReviewReports = [
    ...new Map(
      reviewReports
        .filter(
          (report) =>
            report.status === "hidden" && report.business_ratings?.hidden
        )
        .map((report) => [report.review_id, report] as const)
    ).values(),
  ];
  const businessNameById = businesses.reduce<Record<number, string>>(
    (businessMap, business) => {
      businessMap[business.id] = business.name;
      return businessMap;
    },
    {}
  );
  const profileEmailById = profiles.reduce<Record<string, string>>(
    (emailMap, profile) => {
      if (profile.email) emailMap[profile.id] = profile.email;
      return emailMap;
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
  const lockedPickupOrders = reservedOrders.filter(
    (order) =>
      Number(order.pickup_code_failed_attempts || 0) >= PICKUP_CODE_MAX_ATTEMPTS
  );
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
      className: "ui-card text-cream",
    },
    {
      title: "Approved Businesses",
      value: approvedBusinesses.length,
      helper: "Businesses allowed to publish offers",
      className: "ui-card text-mint",
    },
    {
      title: "Pending Businesses",
      value: pendingBusinesses.length,
      helper: "Registrations waiting for review",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Active Offers",
      value: activeOffers.length,
      helper: "Offers currently visible to customers",
      className: "ui-card text-mint",
    },
    {
      title: "Total Orders",
      value: orders.length,
      helper: "All reservations and pickup records",
      className: "ui-card text-cream",
    },
    {
      title: "Total Ratings",
      value: totalRatings,
      helper: "Customer reviews submitted",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Customers",
      value: customerProfiles.length,
      helper: "Customer accounts in profiles",
      className: "ui-card text-cream",
    },
    {
      title: "Business Accounts",
      value: businessProfiles.length,
      helper: "Users with business account role",
      className: "ui-card text-mint",
    },
    {
      title: "Admins",
      value: adminProfiles.length,
      helper: "Admin accounts with approval access",
      className: "ui-card text-cream",
    },
  ];
  const accountOverview = [
    {
      title: "Customers",
      value: customerProfiles.length,
      helper: "Can browse, reserve, favorite and rate completed pickups",
      className: "ui-card text-cream",
    },
    {
      title: "Businesses",
      value: businessProfiles.length,
      helper: "Can register businesses and manage approved business offers",
      className: "ui-card text-mint",
    },
    {
      title: "Admins",
      value: adminProfiles.length,
      helper: "Can approve businesses and monitor marketplace activity",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Missing role",
      value: unknownProfiles.length,
      helper: "Profiles that may need support review",
      className: "bg-danger-soft text-danger",
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
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Approved businesses",
      value: approvedBusinesses.length,
      helper: "Businesses allowed to publish offers",
      className: "ui-card text-mint",
    },
    {
      title: "Rejected businesses",
      value: rejectedBusinesses.length,
      helper: "Waiting for the owner to edit and resubmit",
      className: "bg-danger-soft text-danger",
    },
    {
      title: "Reported reviews",
      value: openReviewReports.length,
      helper: "Open reports waiting for a decision",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Inactive offers",
      value: inactiveOffers.length,
      helper: "Offers hidden by businesses or admins",
      className: "bg-well text-body",
    },
    {
      title: "Expired offers",
      value: expiredOffers.length,
      helper: "Pickup windows that have already passed",
      className: "bg-danger-soft text-danger",
    },
  ];
  const paymentSummary = calculatePaymentSummary(orders);
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
  const filteredRejectedBusinesses = rejectedBusinesses.filter((business) => {
    const searchText =
      `${business.name} ${business.business_type} ${business.address} ${business.phone} ${business.rejection_reason}`.toLowerCase();
    return normalizedAdminSearch === "" || searchText.includes(normalizedAdminSearch);
  });
  const sortDirection = approvalQueueFilter === "oldest" ? 1 : -1;
  const sortedPendingBusinesses = [...filteredPendingBusinesses].sort(
    (first, second) =>
      (getBusinessSortTime(first) - getBusinessSortTime(second)) * sortDirection
  );
  const sortedApprovedBusinesses = [...filteredApprovedBusinesses].sort(
    (first, second) =>
      (getBusinessSortTime(first) - getBusinessSortTime(second)) * sortDirection
  );
  const showRejectedOnly = approvalQueueFilter === "rejected";
  const approvalVisiblePendingBusinesses =
    approvalQueueFilter === "approved" || showRejectedOnly
      ? []
      : sortedPendingBusinesses;
  const approvalVisibleApprovedBusinesses =
    approvalQueueFilter === "needs_review" || showRejectedOnly
      ? []
      : sortedApprovedBusinesses;
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
    approvalVisiblePendingBusinesses,
    pendingPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const paginatedApprovedBusinesses = paginateItems(
    approvalVisibleApprovedBusinesses,
    approvedPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const paginatedRejectedBusinesses = paginateItems(
    filteredRejectedBusinesses,
    rejectedPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const paginatedReviewReports = paginateItems(
    openReviewReports,
    reviewReportsPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const paginatedHiddenReviews = paginateItems(
    hiddenReviewReports,
    hiddenReviewsPage,
    ADMIN_LIST_PAGE_SIZE
  );
  const todayDateKey = getTbilisiDateKey();
  const offersCreatedToday = offers.filter(
    (offer) => getTbilisiDateKeyFromValue(offer.created_at) === todayDateKey
  );
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
  const businessIdsWithActiveOffers = new Set(
    activeOffers.map((offer) => offer.business_id)
  );
  const businessesWithZeroOffers = businesses.filter(
    (business) =>
      !businessIdsWithOffers.has(business.id) && !business.rejected_at
  );
  const inactiveBusinesses = approvedBusinesses.filter(
    (business) => !businessIdsWithActiveOffers.has(business.id)
  );
  const offersExpiringToday = activeOffers.filter(
    (offer) => offer.pickup_date === todayDateKey
  );
  const offerIdsWithReservations = new Set(
    orders.map((order) => order.offer_id)
  );
  const offersWithZeroReservations = offers.filter(
    (offer) => !offerIdsWithReservations.has(offer.id)
  );
  const offerBusinessIdById = new Map(
    offers.map((offer) => [offer.id, offer.business_id])
  );
  const reservationsByBusinessId = orders.reduce<Record<number, number>>(
    (activityMap, order) => {
      const ownerBusinessId = offerBusinessIdById.get(order.offer_id);
      if (!ownerBusinessId) return activityMap;
      activityMap[ownerBusinessId] = (activityMap[ownerBusinessId] || 0) + 1;
      return activityMap;
    },
    {}
  );
  const rankedBusinessActivity = approvedBusinesses
    .map((business) => ({
      business,
      reservations: reservationsByBusinessId[business.id] || 0,
    }))
    .sort((first, second) => second.reservations - first.reservations);
  const mostActiveBusiness = rankedBusinessActivity[0];
  const leastActiveBusiness =
    rankedBusinessActivity.length > 0
      ? [...rankedBusinessActivity].sort(
          (first, second) => first.reservations - second.reservations
        )[0]
      : null;
  const businessesWithoutReservations = approvedBusinesses.filter(
    (business) => (reservationsByBusinessId[business.id] || 0) === 0
  );
  const businessesNeedingAttention = new Set([
    ...pendingBusinesses.map((business) => business.id),
    ...inactiveBusinesses.map((business) => business.id),
    ...businessesWithZeroOffers.map((business) => business.id),
  ]);
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
      title: "Expiring today",
      value: offersExpiringToday.length,
      tone: offersExpiringToday.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Zero reservations",
      value: offersWithZeroReservations.length,
      tone:
        offersWithZeroReservations.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Businesses with zero offers",
      value: businessesWithZeroOffers.length,
      tone: businessesWithZeroOffers.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Inactive businesses",
      value: inactiveBusinesses.length,
      tone: inactiveBusinesses.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Need attention",
      value: businessesNeedingAttention.size,
      tone:
        businessesNeedingAttention.size > 0 ? ("yellow" as const) : undefined,
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
      value: paymentSummary.activePaidCount,
      helper: "Current reserved/completed orders with recorded amounts",
      className: "ui-card text-mint",
    },
    {
      title: "Refunded/cancelled",
      value: paymentSummary.refundedCount,
      helper: `${formatMoney(
        paymentSummary.refundedAmount
      )} marked for refund history`,
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Platform revenue",
      value: formatMoney(paymentSummary.platformRevenue),
      helper: "Estimated 10% marketplace fee",
      className: "ui-card text-cream",
    },
    {
      title: "Business payout",
      value: formatMoney(paymentSummary.businessPayout),
      helper: "Estimated 90% business revenue",
      className: "ui-card text-cream",
    },
    {
      title: "Pending payouts",
      value: formatMoney(paymentSummary.pendingPayoutEstimate),
      helper: "Manual payout estimate from completed pickups",
      className: "ui-card text-mint",
    },
    {
      title: "Failed payments",
      // Checkouts cancelled before a pickup code was issued: bank failure,
      // abandoned bank page, or an expired hold.
      value: orders.filter(isFailedCheckoutOrder).length,
      helper: "Provider failures to review during payment operations",
      className: "bg-danger-soft text-danger",
    },
  ];
  const operationalDashboardMetrics = [
    {
      title: "Today's activity",
      value: todayReservations.length + todayPickups.length,
      tone:
        todayReservations.length + todayPickups.length > 0
          ? ("green" as const)
          : undefined,
    },
    {
      title: "Reservations",
      value: todayReservations.length,
      tone: todayReservations.length > 0 ? ("yellow" as const) : undefined,
    },
    {
      title: "Pickups",
      value: todayPickups.length,
      tone: todayPickups.length > 0 ? ("green" as const) : undefined,
    },
    {
      title: "Cancelled",
      value: cancelledOrders.length,
      tone: cancelledOrders.length > 0 ? ("red" as const) : undefined,
    },
    {
      title: "No-shows",
      value: noShowOrders.length,
      tone: noShowOrders.length > 0 ? ("red" as const) : undefined,
    },
    {
      title: "Average rating",
      value: marketplaceAnalytics.averageRating,
      tone:
        marketplaceAnalytics.averageRating === "No ratings yet"
          ? undefined
          : ("yellow" as const),
    },
    {
      title: "Active offers",
      value: activeOffers.length,
      tone: activeOffers.length > 0 ? ("green" as const) : undefined,
    },
  ];
  const supportLookupMetrics = [
    {
      title: "Reservation lookup",
      value: filteredAdminOrders.length,
      helper: "Use search to find reservation/order records by id or status",
      className: "ui-card text-cream",
    },
    {
      title: "Customer lookup",
      value: filteredAdminProfiles.filter(
        (profile) => profile.role === "customer"
      ).length,
      helper: "Customer accounts matching the current admin search",
      className: "ui-card text-mint",
    },
    {
      title: "Business lookup",
      value: filteredApprovedBusinesses.length + filteredPendingBusinesses.length,
      helper: "Approved and pending businesses matching the search",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Order lookup",
      value: filteredAdminOrders.length,
      helper: "Orders matching the selected status and search term",
      className: "ui-card text-cream",
    },
  ];
  const marketplaceIntelligenceMetrics = [
    {
      title: "Most active business",
      value: mostActiveBusiness
        ? mostActiveBusiness.business.name
        : "Not enough data",
      helper: mostActiveBusiness
        ? `${mostActiveBusiness.reservations} total reservations`
        : "Reservations will identify the strongest active partner.",
      className: "ui-card text-mint",
    },
    {
      title: "Least active business",
      value: leastActiveBusiness
        ? leastActiveBusiness.business.name
        : "Not enough data",
      helper: leastActiveBusiness
        ? `${leastActiveBusiness.reservations} total reservations`
        : "Approved businesses will appear here after onboarding.",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Offers created today",
      value: offersCreatedToday.length,
      helper: "New offers published in the current Tbilisi day",
      className: "ui-card text-cream",
    },
    {
      title: "Offers expiring",
      value: offersExpiringToday.length,
      helper: "Active offers with pickup scheduled today",
      className: "bg-warning-soft text-warning",
    },
    {
      title: "Businesses without offers",
      value: businessesWithZeroOffers.length,
      helper: "Businesses that may need onboarding help",
      className: "bg-danger-soft text-danger",
    },
    {
      title: "Without reservations",
      value: businessesWithoutReservations.length,
      helper: "Approved businesses that have not received reservations yet",
      className: "bg-warning-soft text-warning",
    },
  ];

  if (loading) {
    return (
      <main className="app-shell">
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
    <main className="app-shell">
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

        <AdminOperationalDashboard metrics={operationalDashboardMetrics} />

        <AdminMarketplaceIntelligence
          metrics={marketplaceIntelligenceMetrics}
        />

        <AdminHealthSections
          t={t}
          marketplaceHealth={marketplaceHealth}
          marketplaceOperations={marketplaceOperations}
          operationalStats={operationalStats}
          customerReliabilityStats={customerReliabilityStats}
          applicationHealth={applicationHealth}
        />

        <AdminPaymentsOverview metrics={paymentOverview} />

        <AdminAccountView metrics={accountOverview} profiles={profiles} />

        <AdminModerationVisibility metrics={moderationStats} />

        <AdminSupportTools metrics={supportLookupMetrics} />

        {lockedPickupOrders.length > 0 && (
          <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8">
            <h3 className="text-lg font-semibold text-cream">
              Locked pickup codes
            </h3>
            <p className="mt-1 text-sm text-body">
              Reserved orders locked after {PICKUP_CODE_MAX_ATTEMPTS} wrong
              pickup codes. The business cannot complete them until unlocked.
            </p>
            <div className="mt-4 grid gap-3">
              {lockedPickupOrders.map((order) => {
                const businessId = offerBusinessIdById.get(order.offer_id);
                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-2xl bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-danger">
                        Order #{order.id}
                      </p>
                      <p className="mt-1 text-sm text-body">
                        Offer #{order.offer_id} ·{" "}
                        {(businessId && businessNameById[businessId]) ||
                          "Business"}{" "}
                        · {order.pickup_code_failed_attempts} wrong codes
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void unlockPickupCode(order.id)}
                      disabled={unlockingOrderId !== null}
                      className="rounded-2xl premium-button px-4 py-3 text-sm disabled:opacity-50"
                    >
                      {unlockingOrderId === order.id
                        ? "Unlocking..."
                        : "Unlock pickup code"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              setRejectedPage(1);
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
            className="premium-input px-4 py-3 font-semibold"
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
            className="premium-input px-4 py-3 font-semibold"
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
            className="premium-input px-4 py-3 font-semibold"
          >
            <option value="all">All account roles</option>
            <option value="customer">Customers</option>
            <option value="business">Businesses</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={approvalQueueFilter}
            onChange={(event) => {
              setApprovalQueueFilter(
                event.target.value as ApprovalQueueFilter
              );
              setPendingPage(1);
              setApprovedPage(1);
              setRejectedPage(1);
            }}
            aria-label="Filter approval center"
            className="premium-input px-4 py-3 font-semibold"
          >
            <option value="newest">Approval: Newest first</option>
            <option value="oldest">Approval: Oldest first</option>
            <option value="needs_review">Approval: Needs review</option>
            <option value="approved">Approval: Approved</option>
            <option value="rejected">Approval: Rejected</option>
          </select>
        </FilterBar>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="ui-card rounded-2xl p-4">
            <p className="text-sm text-body">Businesses found</p>
            <p className="mt-2 text-3xl font-semibold text-cream">
              {filteredPendingBusinesses.length +
                filteredApprovedBusinesses.length +
                filteredRejectedBusinesses.length}
            </p>
          </div>
          <div className="ui-card rounded-2xl p-4">
            <p className="text-sm text-body">Offers found</p>
            <p className="mt-2 text-3xl font-semibold text-cream">
              {filteredAdminOffers.length}
            </p>
          </div>
          <div className="ui-card rounded-2xl p-4">
            <p className="text-sm text-body">Orders found</p>
            <p className="mt-2 text-3xl font-semibold text-cream">
              {filteredAdminOrders.length}
            </p>
          </div>
          <div className="ui-card rounded-2xl p-4">
            <p className="text-sm text-body">Accounts found</p>
            <p className="mt-2 text-3xl font-semibold text-cream">
              {filteredAdminProfiles.length}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="premium-card rounded-3xl p-5">
            <h3 className="text-lg font-semibold text-cream">Offer matches</h3>
            <div className="mt-4 grid gap-3">
              {filteredAdminOffers.slice(0, 5).map((offer) => (
                <div key={offer.id} className="rounded-2xl bg-well p-4">
                  <p className="font-semibold text-cream">{offer.title}</p>
                  <p className="mt-1 text-sm text-body">
                    {businessNameById[offer.business_id] || "Business"} ·{" "}
                    {getEffectiveOfferStatus(offer)}
                  </p>
                </div>
              ))}
              {filteredAdminOffers.length === 0 && (
                <p className="text-body">No offers found.</p>
              )}
            </div>
          </div>

          <div className="premium-card rounded-3xl p-5">
            <h3 className="text-lg font-semibold text-cream">Order matches</h3>
            <div className="mt-4 grid gap-3">
              {filteredAdminOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded-2xl bg-well p-4">
                  <p className="font-semibold text-cream">Order #{order.id}</p>
                  <p className="mt-1 text-sm text-body">
                    Offer #{order.offer_id} · {order.status}
                  </p>
                </div>
              ))}
              {filteredAdminOrders.length === 0 && (
                <p className="text-body">No orders found.</p>
              )}
            </div>
          </div>

          <div className="premium-card rounded-3xl p-5">
            <h3 className="text-lg font-semibold text-cream">Account matches</h3>
            <div className="mt-4 grid gap-3">
              {filteredAdminProfiles.slice(0, 5).map((profile) => (
                <div key={profile.id} className="rounded-2xl bg-well p-4">
                  <p className="break-words font-semibold text-cream">
                    {profile.email || "Email unavailable"}
                  </p>
                  <p className="mt-1 text-sm capitalize text-body">
                    {profile.role || "Missing role"}
                  </p>
                </div>
              ))}
              {filteredAdminProfiles.length === 0 && (
                <p className="text-body">No accounts found.</p>
              )}
            </div>
          </div>
        </div>

        {showRejectedOnly ? (
          <>
            <RejectedBusinesses
              language={language}
              businesses={paginatedRejectedBusinesses.items}
            />

            <Pagination
              className="mt-5"
              page={paginatedRejectedBusinesses.page}
              totalItems={filteredRejectedBusinesses.length}
              pageSize={ADMIN_LIST_PAGE_SIZE}
              label="Rejected businesses"
              onPageChange={setRejectedPage}
            />
          </>
        ) : (
          <>
            <PendingBusinesses
              t={t}
              language={language}
              businesses={paginatedPendingBusinesses.items}
              waitingCount={approvalVisiblePendingBusinesses.length}
              updatingBusinessId={updatingBusinessId}
              onApprove={(id) => void approveBusiness(id)}
              onRequestChanges={requestBusinessChanges}
              onReject={(id, reason) => void rejectBusinessApplication(id, reason)}
            />

            <Pagination
              className="mt-5"
              page={paginatedPendingBusinesses.page}
              totalItems={approvalVisiblePendingBusinesses.length}
              pageSize={ADMIN_LIST_PAGE_SIZE}
              label="Pending businesses"
              onPageChange={setPendingPage}
            />

            <ApprovedBusinesses
              businesses={paginatedApprovedBusinesses.items}
              updatingBusinessId={updatingBusinessId}
              onMoveToPending={(id) => void moveToPending(id)}
              onSetFeeRate={(id, percent) => void setBusinessFeeRate(id, percent)}
            />

            <Pagination
              className="mt-5"
              page={paginatedApprovedBusinesses.page}
              totalItems={approvalVisibleApprovedBusinesses.length}
              pageSize={ADMIN_LIST_PAGE_SIZE}
              label="Approved businesses"
              onPageChange={setApprovedPage}
            />
          </>
        )}

        <ReportedReviews
          language={language}
          reports={paginatedReviewReports.items}
          openCount={openReviewReports.length}
          businessNameById={businessNameById}
          reporterEmailById={profileEmailById}
          updatingReportId={updatingReportId}
          onHide={(id) => void hideReportedReview(id)}
          onDismiss={(id) => void dismissReviewReport(id)}
        />

        <Pagination
          className="mt-5"
          page={paginatedReviewReports.page}
          totalItems={openReviewReports.length}
          pageSize={ADMIN_LIST_PAGE_SIZE}
          label="Reported reviews"
          onPageChange={setReviewReportsPage}
        />

        <HiddenReviews
          reports={paginatedHiddenReviews.items}
          businessNameById={businessNameById}
          updatingReportId={updatingReportId}
          onUnhide={(report) => void unhideReview(report)}
        />

        <Pagination
          className="mt-5"
          page={paginatedHiddenReviews.page}
          totalItems={hiddenReviewReports.length}
          pageSize={ADMIN_LIST_PAGE_SIZE}
          label="Hidden reviews"
          onPageChange={setHiddenReviewsPage}
        />
      </section>
    </main>
  );
}
