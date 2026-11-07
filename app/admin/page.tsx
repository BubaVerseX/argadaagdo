"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { LoadingState } from "@/components/LoadingState";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import {
  AdminAccounts,
  AdminAnalytics,
  AdminApplicationHealth,
  AdminCollapsible,
  AdminHeader,
  AdminKeyNumbers,
  AdminOperations,
  AdminPayments,
  ApprovedBusinesses,
  HiddenReviews,
  PendingBusinesses,
  RejectedBusinesses,
  ReportedReviews,
  type AdminReviewReport,
  type AdminBusiness,
  type BusinessVerificationReview,
  type SimpleStat,
} from "@/components/admin/AdminSections";
import { getConfirmedProfile } from "@/lib/auth";
import { calculateMarketplaceAnalytics, formatAnalyticsMoney } from "@/lib/analytics";
import {
  checkApplicationHealth,
  type ApplicationHealthItem,
} from "@/lib/diagnostics";
import { triggerTransactionalEmail } from "@/lib/email/client";
import { logAppError } from "@/lib/errors";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { translateUserMessage } from "@/lib/messageTranslations";
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
  isUnpaidCheckoutOrder,
} from "@/lib/orderStatus";
import { calculatePaymentSummary } from "@/lib/paymentArchitecture";
import { paginateItems } from "@/lib/pagination";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import type { Offer, Order, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const { language } = useLanguage();
  const text = (ka: string, en: string) => (language === "ka" ? ka : en);
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
  // Admin-only RPCs wait for this: a guest's call only fails and logs an error.
  const [adminConfirmed, setAdminConfirmed] = useState(false);

  const checkAdminAndLoadData = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (
      profileResult.status !== "confirmed" ||
      profileResult.profile.role !== "admin"
    ) {
      setRealtimeReady(false);
      setAdminConfirmed(false);
      router.replace("/");
      return;
    }

    setAdminConfirmed(true);
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
        // Every column (owner, phone, commission): admins only.
        supabase
          .rpc("admin_list_businesses")
          .then(({ data, error }) => ({ data: (data || []) as AdminBusiness[], error })),
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
      setMessage("Admin data could not be loaded.");
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
    setMessage(text(`საკომისიო: ${percent}%.`, `Commission set to ${percent}%.`));
  }

  async function setBusinessLocation(id: number, location: { latitude: number; longitude: number }) {
    if (updatingBusinessId !== null) return false;

    setUpdatingBusinessId(id);
    const { error } = await supabase.rpc("set_business_location", {
      p_business_id: id,
      p_latitude: location.latitude,
      p_longitude: location.longitude,
    });
    setUpdatingBusinessId(null);

    if (error) {
      logAppError("Business location update failed", error, {
        operation: "set_business_location",
        businessId: id,
      });
      setMessageTone("error");
      setMessage(
        error.message.includes("set_business_location")
          ? "Map pins need the database update (20261106150000_business_location.sql) first."
          : "The map pin could not be saved. Please try again."
      );
      return false;
    }

    setBusinesses((currentBusinesses) =>
      currentBusinesses.map((business) =>
        business.id === id ? { ...business, ...location } : business
      )
    );
    setMessageTone("success");
    setMessage("Map pin saved.");
    return true;
  }

  const [businessVerifications, setBusinessVerifications] = useState<
    Record<number, BusinessVerificationReview>
  >({});

  const loadBusinessVerifications = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_business_verifications");

    if (error) {
      logAppError("Business verifications could not be loaded", error, {
        operation: "load_business_verifications",
      });
      return;
    }

    setBusinessVerifications(
      Object.fromEntries(
        ((data || []) as BusinessVerificationReview[]).map((row) => [row.business_id, row])
      )
    );
  }, []);

  useEffect(() => {
    if (!adminConfirmed) return;
    const initialLoad = window.setTimeout(() => void loadBusinessVerifications(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [adminConfirmed, loadBusinessVerifications]);

  async function confirmIbanHolder(id: number, confirmed: boolean) {
    const { error } = await supabase.rpc("admin_confirm_iban_holder", {
      p_business_id: id,
      p_confirmed: confirmed,
    });

    if (error) {
      setMessageTone("error");
      setMessage("The IBAN confirmation could not be saved. Please try again.");
      return;
    }

    await loadBusinessVerifications();
  }

  async function openRegistryExtract(path: string) {
    // Opened before the await, or the browser treats it as a pop-up.
    const preview = window.open("", "_blank", "noopener=no");
    const { data, error } = await supabase.storage
      .from("business-documents")
      .createSignedUrl(path, 300);

    if (error || !data?.signedUrl) {
      preview?.close();
      setMessageTone("error");
      setMessage("The registry extract could not be opened.");
      return;
    }

    if (preview) {
      preview.opener = null;
      preview.location.href = data.signedUrl;
    } else {
      window.location.assign(data.signedUrl);
    }
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
      setMessage(
        error.message.includes("IBAN holder") ||
          error.message.includes("verification is incomplete")
          ? error.message
          : "Business could not be approved. Please try again."
      );
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
    const name = business?.name || text("ბიზნესი", "this business");
    const confirmed = window.confirm(
      text(
        `${name} მოლოდინში დაბრუნდეს? შეთავაზებები დაიმალება.`,
        `Move ${name} back to pending? Its offers get hidden.`
      ) +
        (activeOrderCount > 0
          ? text(
              `\n${activeOrderCount} აქტიური შეკვეთა ვეღარ გაიცემა.`,
              `\n${activeOrderCount} active order(s) can't be picked up.`
            )
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
      text(
        `შეკვეთა #${orderId} განიბლოკოს? ჯერ გადაამოწმე ბიზნესთან და მომხმარებელთან.`,
        `Unlock order #${orderId}? Check with business and customer first.`
      )
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
    setMessage(text(`შეკვეთა #${orderId} განიბლოკა.`, `Order #${orderId} unlocked.`));
    setUnlockingOrderId(null);
    await checkAdminAndLoadData();
  }

  async function rejectBusinessApplication(id: number, reason: string) {
    if (updatingBusinessId !== null) return;

    if (!reason) {
      setMessageTone("error");
      setMessage(text("ჯერ დაწერე მიზეზი.", "Write a reason first."));
      return;
    }

    const business = businesses.find((item) => item.id === id);
    const name = business?.name || text("ბიზნესი", "this business");
    const confirmed = window.confirm(
      text(
        `${name} უარყოფა? მფლობელი მიზეზს ელფოსტით მიიღებს.`,
        `Reject ${name}? The owner gets the reason by email.`
      )
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
      setMessage("Rejected. Owner emailed.");
    } else {
      setMessageTone("warning");
      setMessage("Rejected. Email failed; the owner sees the reason in the dashboard.");
    }

    setUpdatingBusinessId(null);
    await checkAdminAndLoadData();
  }

  async function hideReportedReview(reportId: number) {
    if (updatingReportId !== null) return;

    const confirmed = window.confirm(
      text("შეფასება დაიმალოს?", "Hide this review?")
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
      text("შეფასება ისევ გამოჩნდეს?", "Show this review again?")
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
    setMessage("Report dismissed.");
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
  const warningProfiles = profiles.filter(
    (profile) => profile.reliability_status === "warning"
  );
  const restrictedProfiles = profiles.filter(
    (profile) => profile.reliability_status === "restricted"
  );
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
  const paymentSummary = calculatePaymentSummary(orders);
  const normalizedAdminSearch = adminSearch.trim().toLowerCase();
  const matchesBusinessSearch = (business: AdminBusiness) =>
    normalizedAdminSearch === "" ||
    `${business.name} ${business.business_type} ${business.address} ${business.phone} ${business.rejection_reason ?? ""}`
      .toLowerCase()
      .includes(normalizedAdminSearch);
  // Newest first.
  const byNewest = (first: AdminBusiness, second: AdminBusiness) =>
    getBusinessSortTime(second) - getBusinessSortTime(first);
  const filteredPendingBusinesses = pendingBusinesses
    .filter(matchesBusinessSearch)
    .sort(byNewest);
  const filteredApprovedBusinesses = approvedBusinesses
    .filter(matchesBusinessSearch)
    .sort(byNewest);
  const filteredRejectedBusinesses = rejectedBusinesses
    .filter(matchesBusinessSearch)
    .sort(byNewest);
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
  // Orders placed today (Tbilisi), by the order's own date: offers like the
  // App Review demo box are re-dated every day and carry all their old
  // orders. Checkouts that were never paid don't count.
  const todayReservations = orders.filter(
    (order) =>
      getTbilisiDateKeyFromValue(order.created_at) === todayDateKey &&
      !isUnpaidCheckoutOrder(order)
  );
  const todayPickups = orders.filter(
    (order) =>
      isCollectedOrderStatus(order.status) &&
      getTbilisiDateKeyFromValue(order.completed_at || order.created_at) ===
        todayDateKey
  );
  // Commission on today's orders that are paid and not refunded.
  const todayCommission =
    calculatePaymentSummary(todayReservations).platformRevenue;
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
  const customersWithActiveReservations = new Set(
    activeReservationOrders
      .map((order) => order.user_id)
      .filter((userId): userId is string => Boolean(userId))
  );

  const keyNumbers: SimpleStat[] = [
    {
      title: text("მოლოდინში", "Pending"),
      value: pendingBusinesses.length,
      tone: pendingBusinesses.length > 0 ? "yellow" : undefined,
    },
    {
      title: text("აქტიური შეთავაზება", "Active offers"),
      value: activeOffers.length,
      tone: "green",
    },
    {
      title: text("დღევანდელი შეკვეთა", "Orders today"),
      value: todayReservations.length,
    },
    {
      title: text("დღევანდელი საკომისიო", "Commission today"),
      value: formatAnalyticsMoney(todayCommission),
      tone: "green",
    },
  ];
  const overviewStats: SimpleStat[] = [
    { title: text("ბიზნესები", "Businesses"), value: businesses.length },
    { title: text("დამტკიცებული", "Approved"), value: approvedBusinesses.length, tone: "green" },
    { title: text("მომხმარებლები", "Customers"), value: customerProfiles.length },
    { title: text("შეფასებები", "Ratings"), value: totalRatings },
  ];
  const todayStats: SimpleStat[] = [
    { title: text("შეკვეთები", "Reservations"), value: todayReservations.length },
    { title: text("გაცემული", "Picked up"), value: todayPickups.length, tone: "green" },
    { title: text("ახალი შეთავაზება", "New offers"), value: offersCreatedToday.length },
    {
      title: text("დღეს სრულდება", "Ending today"),
      value: offersExpiringToday.length,
      tone: offersExpiringToday.length > 0 ? "yellow" : undefined,
    },
  ];
  const statusStats: SimpleStat[] = [
    { title: text("გაყიდული", "Sold out"), value: soldOutOffers.length, tone: "yellow" },
    { title: text("ვადაგასული", "Expired"), value: expiredOffers.length, tone: "red" },
    { title: text("არააქტიური", "Inactive"), value: inactiveOffers.length },
    { title: text("ჯავშანი", "Reserved"), value: reservedOrders.length, tone: "yellow" },
    { title: text("გაცემული", "Collected"), value: completedOrders.length, tone: "green" },
    { title: text("გაუქმებული", "Cancelled"), value: cancelledOrders.length, tone: "red" },
    { title: text("არ მოვიდა", "No-show"), value: noShowOrders.length, tone: "red" },
    {
      title: text("აქტიური მყიდველი", "Active buyers"),
      value: customersWithActiveReservations.size,
    },
  ];
  const signalStats: SimpleStat[] = [
    {
      title: text("ყველაზე აქტიური", "Most active"),
      value: mostActiveBusiness ? mostActiveBusiness.business.name : "—",
    },
    {
      title: text("შეთავაზების გარეშე", "No offers"),
      value: businessesWithZeroOffers.length,
      tone: businessesWithZeroOffers.length > 0 ? "yellow" : undefined,
    },
    {
      title: text("უმოქმედო ბიზნესი", "Inactive businesses"),
      value: inactiveBusinesses.length,
      tone: inactiveBusinesses.length > 0 ? "yellow" : undefined,
    },
    {
      title: text("ჯავშნის გარეშე", "No reservations"),
      value: offersWithZeroReservations.length,
    },
    {
      title: text("გაფრთხილება", "Warning accounts"),
      value: warningProfiles.length,
      tone: warningProfiles.length > 0 ? "yellow" : undefined,
    },
    {
      title: text("შეზღუდული", "Restricted"),
      value: restrictedProfiles.length,
      tone: restrictedProfiles.length > 0 ? "red" : undefined,
    },
  ];
  const paymentStats: SimpleStat[] = [
    { title: text("გადახდილი", "Paid"), value: paymentSummary.activePaidCount, tone: "green" },
    {
      title: text("დაბრუნებული", "Refunded"),
      value: `${paymentSummary.refundedCount} · ${formatMoney(paymentSummary.refundedAmount)}`,
      tone: "yellow",
    },
    {
      title: text("საკომისიო", "Commission"),
      value: formatMoney(paymentSummary.platformRevenue),
    },
    {
      // Recorded per order at each business's own rate.
      title: text("ბიზნესებს", "To businesses"),
      value: formatMoney(paymentSummary.businessPayout),
    },
    {
      title: text("გასაცემი", "Payouts due"),
      value: formatMoney(paymentSummary.pendingPayoutEstimate),
      tone: "green",
    },
    {
      // Checkouts cancelled before a pickup code was issued: bank failure,
      // abandoned bank page, or an expired hold.
      title: text("წარუმატებელი", "Failed"),
      value: orders.filter(isFailedCheckoutOrder).length,
      tone: "red",
    },
  ];
  const accountStats: SimpleStat[] = [
    { title: text("მომხმარებელი", "Customers"), value: customerProfiles.length },
    { title: text("ბიზნესი", "Businesses"), value: businessProfiles.length, tone: "green" },
    { title: text("ადმინი", "Admins"), value: adminProfiles.length },
    {
      title: text("როლის გარეშე", "No role"),
      value: unknownProfiles.length,
      tone: unknownProfiles.length > 0 ? "red" : undefined,
    },
  ];

  if (loading) {
    return (
      <main className="app-shell">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <LoadingState title={{ en: "Loading...", ka: "იტვირთება..." }} />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:px-12">
        <AdminHeader language={language} />

        {message && (
          <div className="mt-5">
            <Notice tone={messageTone}>
              {translateUserMessage(message, language)}
            </Notice>
          </div>
        )}

        <PendingBusinesses
          language={language}
          businesses={paginatedPendingBusinesses.items}
          waitingCount={filteredPendingBusinesses.length}
          updatingBusinessId={updatingBusinessId}
          verifications={businessVerifications}
          onConfirmIbanHolder={(id, confirmed) => void confirmIbanHolder(id, confirmed)}
          onOpenExtract={(path) => void openRegistryExtract(path)}
          onApprove={(id) => void approveBusiness(id)}
          onReject={(id, reason) => void rejectBusinessApplication(id, reason)}
        />

        <Pagination
          className="mt-5"
          page={paginatedPendingBusinesses.page}
          totalItems={filteredPendingBusinesses.length}
          pageSize={ADMIN_LIST_PAGE_SIZE}
          label={text("მოლოდინში", "Pending businesses")}
          onPageChange={setPendingPage}
        />

        <AdminKeyNumbers stats={keyNumbers} />

        {lockedPickupOrders.length > 0 && (
          <div className="premium-card mt-6 rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-cream">
              {text("დაბლოკილი კოდები", "Locked pickup codes")}
            </h2>
            <div className="mt-3 grid gap-3">
              {lockedPickupOrders.map((order) => {
                const businessId = offerBusinessIdById.get(order.offer_id);
                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-2xl bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="font-semibold text-danger">
                      #{order.id} ·{" "}
                      {(businessId && businessNameById[businessId]) || "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void unlockPickupCode(order.id)}
                      disabled={unlockingOrderId !== null}
                      className="rounded-2xl premium-button px-4 py-3 text-sm disabled:opacity-50"
                    >
                      {unlockingOrderId === order.id
                        ? text("იხსნება...", "Unlocking...")
                        : text("განბლოკვა", "Unlock")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {openReviewReports.length > 0 && (
          <>
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
              label={text("რეპორტები", "Reported reviews")}
              onPageChange={setReviewReportsPage}
            />
          </>
        )}

        <div className="mt-6">
          <AdminCollapsible
            title={text("დამტკიცებული ბიზნესები", "Approved businesses")}
            count={filteredApprovedBusinesses.length}
          >
            <ApprovedBusinesses
              businesses={paginatedApprovedBusinesses.items}
              updatingBusinessId={updatingBusinessId}
              onMoveToPending={(id) => void moveToPending(id)}
              onSetFeeRate={(id, percent) => void setBusinessFeeRate(id, percent)}
              onSetLocation={setBusinessLocation}
              language={language}
            />
            <Pagination
              className="mt-4"
              page={paginatedApprovedBusinesses.page}
              totalItems={filteredApprovedBusinesses.length}
              pageSize={ADMIN_LIST_PAGE_SIZE}
              label={text("დამტკიცებული", "Approved businesses")}
              onPageChange={setApprovedPage}
            />
          </AdminCollapsible>

          <AdminCollapsible
            title={text("უარყოფილი", "Rejected")}
            count={filteredRejectedBusinesses.length}
          >
            <RejectedBusinesses
              language={language}
              businesses={paginatedRejectedBusinesses.items}
            />
            <Pagination
              className="mt-4"
              page={paginatedRejectedBusinesses.page}
              totalItems={filteredRejectedBusinesses.length}
              pageSize={ADMIN_LIST_PAGE_SIZE}
              label={text("უარყოფილი", "Rejected businesses")}
              onPageChange={setRejectedPage}
            />
          </AdminCollapsible>

          <AdminCollapsible title={text("ანალიტიკა", "Analytics")}>
            <AdminAnalytics
              language={language}
              overview={overviewStats}
              analytics={marketplaceAnalytics}
            />
          </AdminCollapsible>

          <AdminCollapsible title={text("ოპერაციები", "Operations")}>
            <AdminOperations
              language={language}
              today={todayStats}
              status={statusStats}
              signals={signalStats}
            />
          </AdminCollapsible>

          <AdminCollapsible title={text("გადახდები", "Payments")}>
            <AdminPayments language={language} stats={paymentStats} />
          </AdminCollapsible>

          <AdminCollapsible title={text("ანგარიშები", "Accounts")} count={profiles.length}>
            <AdminAccounts language={language} stats={accountStats} profiles={profiles} />
          </AdminCollapsible>

          {hiddenReviewReports.length > 0 && (
            <AdminCollapsible
              title={text("დამალული შეფასებები", "Hidden reviews")}
              count={hiddenReviewReports.length}
            >
              <HiddenReviews
                language={language}
                reports={paginatedHiddenReviews.items}
                businessNameById={businessNameById}
                updatingReportId={updatingReportId}
                onUnhide={(report) => void unhideReview(report)}
              />
              <Pagination
                className="mt-4"
                page={paginatedHiddenReviews.page}
                totalItems={hiddenReviewReports.length}
                pageSize={ADMIN_LIST_PAGE_SIZE}
                label={text("დამალული", "Hidden reviews")}
                onPageChange={setHiddenReviewsPage}
              />
            </AdminCollapsible>
          )}

          <AdminCollapsible title={text("ძიება", "Search")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchBar
                value={adminSearch}
                onChange={(value) => {
                  setAdminSearch(value);
                  setPendingPage(1);
                  setApprovedPage(1);
                  setRejectedPage(1);
                }}
                placeholder={text("ძიება...", "Search...")}
                label={text("ძიება", "Search")}
              />

              <select
                value={adminOfferFilter}
                onChange={(event) =>
                  setAdminOfferFilter(event.target.value as AdminOfferFilter)
                }
                aria-label={text("შეთავაზებები", "Offers")}
                className="premium-input px-4 py-3 font-semibold"
              >
                <option value="all">{text("ყველა შეთავაზება", "All offers")}</option>
                <option value="active">{text("აქტიური", "Active")}</option>
                <option value="inactive">{text("არააქტიური", "Inactive")}</option>
                <option value="expired">{text("ვადაგასული", "Expired")}</option>
                <option value="sold_out">{text("გაყიდული", "Sold out")}</option>
              </select>

              <select
                value={adminOrderFilter}
                onChange={(event) =>
                  setAdminOrderFilter(event.target.value as AdminOrderFilter)
                }
                aria-label={text("შეკვეთები", "Orders")}
                className="premium-input px-4 py-3 font-semibold"
              >
                <option value="all">{text("ყველა შეკვეთა", "All orders")}</option>
                <option value="reserved">{text("ჯავშანი", "Reserved")}</option>
                <option value="completed">{text("გაცემული", "Completed")}</option>
                <option value="cancelled">{text("გაუქმებული", "Cancelled")}</option>
                <option value="no_show">{text("არ მოვიდა", "No-show")}</option>
              </select>

              <select
                value={adminProfileFilter}
                onChange={(event) =>
                  setAdminProfileFilter(event.target.value as AdminProfileFilter)
                }
                aria-label={text("ანგარიშები", "Accounts")}
                className="premium-input px-4 py-3 font-semibold"
              >
                <option value="all">{text("ყველა როლი", "All roles")}</option>
                <option value="customer">{text("მომხმარებელი", "Customers")}</option>
                <option value="business">{text("ბიზნესი", "Businesses")}</option>
                <option value="admin">{text("ადმინი", "Admins")}</option>
              </select>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <h3 className="font-semibold text-cream">
                  {text("შეთავაზებები", "Offers")} · {filteredAdminOffers.length}
                </h3>
                <div className="mt-2 grid gap-2">
                  {filteredAdminOffers.slice(0, 5).map((offer) => (
                    <p key={offer.id} className="rounded-2xl bg-well p-3 text-sm text-body">
                      <span className="font-semibold text-cream">{offer.title}</span> ·{" "}
                      {businessNameById[offer.business_id] || "—"} ·{" "}
                      {getEffectiveOfferStatus(offer)}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-cream">
                  {text("შეკვეთები", "Orders")} · {filteredAdminOrders.length}
                </h3>
                <div className="mt-2 grid gap-2">
                  {filteredAdminOrders.slice(0, 5).map((order) => (
                    <p key={order.id} className="rounded-2xl bg-well p-3 text-sm text-body">
                      <span className="font-semibold text-cream">#{order.id}</span> ·{" "}
                      {order.status}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-cream">
                  {text("ანგარიშები", "Accounts")} · {filteredAdminProfiles.length}
                </h3>
                <div className="mt-2 grid gap-2">
                  {filteredAdminProfiles.slice(0, 5).map((profile) => (
                    <p
                      key={profile.id}
                      className="break-words rounded-2xl bg-well p-3 text-sm text-body"
                    >
                      <span className="font-semibold text-cream">{profile.email || "—"}</span> ·{" "}
                      {profile.role || "—"}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </AdminCollapsible>

          <AdminCollapsible title={text("სისტემა", "App health")}>
            <AdminApplicationHealth items={applicationHealth} />
          </AdminCollapsible>
        </div>
      </section>
    </main>
  );
}
