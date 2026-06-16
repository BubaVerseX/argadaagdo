"use client";

import AnalyticsBarCard from "@/components/AnalyticsBarCard";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import StatCard from "@/components/StatCard";
import { getConfirmedProfile } from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { notifyPickupCompleted } from "@/lib/notifications";
import {
  getOrderStatusClassName,
  getOrderStatusLabel,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import {
  formatPickupWindow,
  getEffectiveOfferStatus,
  getOfferStatusClassName,
  getOfferStatusLabel,
  getRatingLabel,
  getTbilisiDateKey,
  isOrderPastPickupEnd,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, Order, Rating } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

function createImageFileName(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${crypto.randomUUID()}-${safeName}`;
}

const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImageSizeBytes = 5 * 1024 * 1024;
type ReservationFilter = "all" | "reserved" | "collected" | "cancelled";

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getImageValidationError(file: File) {
  if (file.size > maxImageSizeBytes) return "File too large";
  if (!allowedImageTypes.includes(file.type)) return "Invalid file type";
  return "";
}

function formatCreatedDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);

  const [approvedBusinesses, setApprovedBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<number[]>([]);
  const [ownedOfferIds, setOwnedOfferIds] = useState<number[]>([]);

  const [businessId, setBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pickupDate, setPickupDate] = useState(getTbilisiDateKey());
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [publishing, setPublishing] = useState(false);
  const [updatingOfferId, setUpdatingOfferId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [reservationFilter, setReservationFilter] =
    useState<ReservationFilter>("all");
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOldPrice, setEditOldPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPickupStart, setEditPickupStart] = useState("");
  const [editPickupEnd, setEditPickupEnd] = useState("");
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDashboard = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (
      profileResult.status !== "confirmed" ||
      profileResult.profile.role !== "business"
    ) {
      router.replace("/");
      return;
    }

    const userId = profileResult.user.id;
    await processExpiredMarketplace();

    const { data: myBusinesses, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .order("id", { ascending: false });

    if (businessError) {
      setMessageTone("error");
      setMessage("Your business information could not be loaded.");
      setLoading(false);
      return;
    }

    const allBusinesses = (myBusinesses || []) as Business[];
    const approved = allBusinesses.filter((business) => business.approved);

    setApprovedBusinesses(approved);

    setBusinessId((currentBusinessId) => {
      if (
        currentBusinessId &&
        approved.some((business) => String(business.id) === currentBusinessId)
      ) {
        return currentBusinessId;
      }

      return approved[0] ? String(approved[0].id) : "";
    });

    const businessIds = allBusinesses.map((business) => business.id);
    setOwnedBusinessIds(businessIds);

    if (businessIds.length === 0) {
      setOffers([]);
      setOrders([]);
      setReviews([]);
      setOwnedOfferIds([]);
      setLoading(false);
      return;
    }

    const [
      { data: myOffers, error: offerError },
      summaries,
      { data: myReviews, error: reviewError },
    ] = await Promise.all([
      supabase
        .from("offers")
        .select("*, businesses(name)")
        .in("business_id", businessIds)
        .order("id", { ascending: false }),
      loadBusinessRatingSummaries(),
      supabase
        .from("ratings")
        .select("id, user_id, business_id, order_id, rating, review, created_at")
        .in("business_id", businessIds)
        .order("created_at", { ascending: false }),
    ]);

    setRatingSummaries(summaries);
    setReviews(reviewError ? [] : ((myReviews || []) as Rating[]));

    if (offerError) {
      setMessageTone("error");
      setMessage("Your offers could not be loaded.");
      setLoading(false);
      return;
    }

    const currentOffers = (myOffers || []) as Offer[];
    setOffers(currentOffers);

    const offerIds = currentOffers.map((offer) => offer.id);
    setOwnedOfferIds(offerIds);

    if (offerIds.length > 0) {
      const { data: myOrders, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          offers(title, price, pickup_date, pickup_start, pickup_end),
          profiles(email, reliability_score, reliability_status)
        `)
        .in("offer_id", offerIds)
        .order("id", { ascending: false });

      if (orderError) {
        setMessageTone("error");
        setMessage("Reservations could not be loaded.");
        setLoading(false);
        return;
      }

      setOrders((myOrders || []) as Order[]);
    } else {
      setOrders([]);
    }

    setLoading(false);
  }, [router]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void loadDashboard(), 150);
  }, [loadDashboard]);

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null;
    setMessage("");

    if (!selectedFile) {
      setImageFile(null);
      return;
    }

    const validationError = getImageValidationError(selectedFile);

    if (validationError) {
      setImageFile(null);
      event.target.value = "";
      setMessageTone("error");
      setMessage(validationError);
      return;
    }

    setImageFile(selectedFile);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return "";

    const validationError = getImageValidationError(imageFile);

    if (validationError) {
      setMessageTone("error");
      setMessage(validationError);
      return null;
    }

    const fileName = createImageFileName(imageFile);

    const { error } = await supabase.storage
      .from("offer-images")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setMessageTone("error");
      setMessage("Upload failed");
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("offer-images").getPublicUrl(fileName);

    return publicUrl;
  }

  async function createOffer() {
    setMessage("");
    setMessageTone("error");

    if (!businessId) {
      setMessage("No approved business found.");
      return;
    }

    if (!title.trim()) {
      setMessage("Offer title required.");
      return;
    }

    const selectedBusinessId = Number(businessId);
    const priceValue = Number(price);
    const oldPriceValue = oldPrice ? Number(oldPrice) : null;
    const quantityValue = Number(quantity);

    if (
      !approvedBusinesses.some((business) => business.id === selectedBusinessId)
    ) {
      setMessage("Choose an approved business before publishing.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setMessage("Price must be greater than 0.");
      return;
    }

    if (
      oldPriceValue !== null &&
      (!Number.isFinite(oldPriceValue) || oldPriceValue <= 0)
    ) {
      setMessage("Old price must be greater than 0.");
      return;
    }

    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setMessage("Quantity must be greater than 0.");
      return;
    }

    if (!pickupDate || !pickupStart || !pickupEnd) {
      setMessage("Pickup date and time required.");
      return;
    }

    setPublishing(true);
    setMessageTone("success");
    setMessage("Publishing offer...");

    const imageUrl = await uploadImage();

    if (imageUrl === null) {
      setPublishing(false);
      return;
    }

    const { error } = await supabase.from("offers").insert({
      business_id: selectedBusinessId,
      title: title.trim(),
      price: priceValue,
      old_price: oldPriceValue,
      quantity: quantityValue,
      pickup_date: pickupDate,
      pickup_start: pickupStart,
      pickup_end: pickupEnd,
      category: "Food",
      active: true,
      status: "active",
      image_url: imageUrl,
    });

    if (error) {
      setPublishing(false);
      setMessageTone("error");
      setMessage(
        error.message.includes("row-level security")
          ? "Offer creation was blocked by security rules. Please make sure this business is approved."
          : error.message
      );
      return;
    }

    setTitle("");
    setPrice("");
    setOldPrice("");
    setQuantity("1");
    setPickupDate(getTbilisiDateKey());
    setPickupStart("");
    setPickupEnd("");
    setImageFile(null);

    setPublishing(false);
    setMessageTone("success");
    setMessage("Offer published.");
    await loadDashboard();
  }

  function startEditingOffer(offer: Offer) {
    setMessage("");
    setEditingOfferId(offer.id);
    setEditTitle(offer.title);
    setEditPrice(String(offer.price ?? ""));
    setEditOldPrice(offer.old_price ? String(offer.old_price) : "");
    setEditQuantity(String(offer.quantity ?? 0));
    setEditPickupStart(offer.pickup_start || "");
    setEditPickupEnd(offer.pickup_end || "");
  }

  function cancelEditingOffer() {
    setEditingOfferId(null);
    setEditTitle("");
    setEditPrice("");
    setEditOldPrice("");
    setEditQuantity("");
    setEditPickupStart("");
    setEditPickupEnd("");
  }

  async function saveOfferEdits(offer: Offer) {
    setMessage("");
    setMessageTone("error");

    if (!ownedBusinessIds.includes(offer.business_id)) {
      setMessage("You can only edit offers from your own business.");
      return;
    }

    if (!editTitle.trim()) {
      setMessage("Offer title required.");
      return;
    }

    const priceValue = Number(editPrice);
    const oldPriceValue = editOldPrice ? Number(editOldPrice) : null;
    const quantityValue = Number(editQuantity);

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setMessage("Price must be greater than 0.");
      return;
    }

    if (
      oldPriceValue !== null &&
      (!Number.isFinite(oldPriceValue) || oldPriceValue <= 0)
    ) {
      setMessage("Old price must be greater than 0.");
      return;
    }

    if (!Number.isInteger(quantityValue) || quantityValue < 0) {
      setMessage("Quantity must be 0 or greater.");
      return;
    }

    if (!editPickupStart || !editPickupEnd) {
      setMessage("Pickup start and end time are required.");
      return;
    }

    const nextActive = quantityValue > 0 ? offer.active : false;
    const nextStatus =
      quantityValue <= 0 ? "sold_out" : nextActive ? "active" : "inactive";

    setUpdatingOfferId(offer.id);

    const { data, error } = await supabase
      .from("offers")
      .update({
        title: editTitle.trim(),
        price: priceValue,
        old_price: oldPriceValue,
        quantity: quantityValue,
        pickup_start: editPickupStart,
        pickup_end: editPickupEnd,
        active: nextActive,
        status: nextStatus,
      })
      .eq("id", offer.id)
      .in("business_id", ownedBusinessIds)
      .select("*")
      .maybeSingle();

    if (error) {
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    if (!data) {
      setUpdatingOfferId(null);
      setMessageTone("warning");
      setMessage("Offer could not be updated.");
      return;
    }

    setOffers((currentOffers) =>
      currentOffers.map((currentOffer) =>
        currentOffer.id === offer.id ? (data as Offer) : currentOffer
      )
    );
    cancelEditingOffer();
    setUpdatingOfferId(null);
    setMessageTone("success");
    setMessage("Offer updated.");
    await loadDashboard();
  }

  async function toggleOfferActive(offer: Offer) {
    setMessage("");
    setMessageTone("error");

    if (!ownedBusinessIds.includes(offer.business_id)) {
      setMessage("You can only update offers from your own business.");
      return;
    }

    const nextActive = !offer.active;

    if (nextActive && Number(offer.quantity || 0) <= 0) {
      setMessage("Quantity must be greater than 0 before activating an offer.");
      return;
    }

    setUpdatingOfferId(offer.id);

    const { data, error } = await supabase
      .from("offers")
      .update({
        active: nextActive,
        status: nextActive ? "active" : "inactive",
      })
      .eq("id", offer.id)
      .in("business_id", ownedBusinessIds)
      .select("*")
      .maybeSingle();

    if (error) {
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    if (!data) {
      setUpdatingOfferId(null);
      setMessageTone("warning");
      setMessage("Offer could not be updated.");
      await loadDashboard();
      return;
    }

    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer.id === data.id ? (data as Offer) : offer
      )
    );
    setUpdatingOfferId(null);
    setMessageTone("success");
    setMessage(nextActive ? "Offer activated." : "Offer set inactive.");
    await loadDashboard();
  }

  async function deleteOffer(offer: Offer) {
    setMessage("");
    setMessageTone("error");

    if (!ownedBusinessIds.includes(offer.business_id)) {
      setMessage("You can only delete offers from your own business.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this offer? This cannot be undone."
    );

    if (!confirmed) return;

    setUpdatingOfferId(offer.id);

    const { data, error } = await supabase
      .from("offers")
      .delete()
      .eq("id", offer.id)
      .in("business_id", ownedBusinessIds)
      .select("id")
      .maybeSingle();

    if (error) {
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage(
        error.message.toLowerCase().includes("foreign key")
          ? "This offer has reservations, so it cannot be deleted. Set it inactive instead."
          : error.message
      );
      return;
    }

    if (!data) {
      setUpdatingOfferId(null);
      setMessageTone("warning");
      setMessage("Offer could not be deleted.");
      await loadDashboard();
      return;
    }

    setOffers((currentOffers) =>
      currentOffers.filter((currentOffer) => currentOffer.id !== offer.id)
    );
    setUpdatingOfferId(null);
    setMessageTone("success");
    setMessage("Offer deleted.");
    await loadDashboard();
  }

  async function completeOrder(orderId: number, pickupCodeValue: string) {
    const completedOrder = orders.find((order) => order.id === orderId);

    if (completedOrder && isOrderPastPickupEnd(completedOrder.offers)) {
      await markNoShow(completedOrder);
      return false;
    }

    if (!pickupCodeValue.trim()) {
      setMessageTone("error");
      setMessage("Pickup code required to complete an order.");
      return false;
    }

    setUpdatingOrderId(orderId);
    const { error } = await supabase.rpc("complete_pickup", {
      p_order_id: orderId,
      p_pickup_code: pickupCodeValue.trim(),
    });

    if (error) {
      setUpdatingOrderId(null);
      setMessageTone("error");
      setMessage(error.message);
      return false;
    }

    setUpdatingOrderId(null);
    setMessageTone("success");
    setMessage("Reservation marked collected.");
    notifyPickupCompleted({
      orderId,
      offerTitle: completedOrder?.offers?.title,
      businessName: completedOrder?.offers?.businesses?.name,
    });
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: "collected" } : order
      )
    );
    await loadDashboard();
    return true;
  }

  async function markNoShow(order: Order) {
    setUpdatingOrderId(order.id);
    setMessage("");

    const { error } = await supabase.rpc("mark_order_no_show", {
      p_order_id: order.id,
    });

    if (error) {
      setMessageTone("error");
      setMessage(error.message || "Order could not be marked no-show.");
      setUpdatingOrderId(null);
      return false;
    }

    setMessageTone("success");
    setMessage("Order marked as no-show.");
    setUpdatingOrderId(null);
    await loadDashboard();
    return true;
  }

  async function verifyPickupCode() {
    setMessage("");

    if (!pickupCode.trim()) {
      setMessageTone("error");
      setMessage("Enter pickup code.");
      return;
    }

    const order = orders.find(
      (item) =>
        item.pickup_code === pickupCode.trim() &&
        isConfirmedOrderStatus(item.status)
    );

    if (!order) {
      setMessageTone("error");
      setMessage("Invalid pickup code or order already completed.");
      return;
    }

    const completed = await completeOrder(order.id, pickupCode.trim());
    if (completed) setPickupCode("");
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadDashboard]);

  const businessFilter = ownedBusinessIds.join(",");
  const offerFilter = ownedOfferIds.join(",");

  useEffect(() => {
    if (!businessFilter) return;

    let channel = supabase
      .channel(`business-dashboard-offers-${businessFilter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "offers",
          filter: `business_id=in.(${businessFilter})`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ratings",
          filter: `business_id=in.(${businessFilter})`,
        },
        scheduleRefresh
      );

    if (offerFilter) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `offer_id=in.(${offerFilter})`,
        },
        scheduleRefresh
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [businessFilter, offerFilter, scheduleRefresh]);

  const activeOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "active"
  );
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + Number(review.rating), 0) /
            totalReviews) *
            10
        ) / 10
      : 0;
  const averageRatingLabel =
    totalReviews > 0 ? `${averageRating.toFixed(1)} ⭐` : "No ratings";
  const businessNameById = approvedBusinesses.reduce<Record<number, string>>(
    (businessMap, business) => {
      businessMap[business.id] = business.name;
      return businessMap;
    },
    {}
  );
  const collectedOrders = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const reservedOrders = orders.filter((order) =>
    isConfirmedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter((order) =>
    isCancelledOrderStatus(order.status)
  );
  const filteredOrders = orders.filter((order) => {
    if (reservationFilter === "reserved") {
      return isConfirmedOrderStatus(order.status);
    }

    if (reservationFilter === "collected") {
      return isCollectedOrderStatus(order.status);
    }

    if (reservationFilter === "cancelled") {
      return isCancelledOrderStatus(order.status);
    }

    return true;
  });
  const businessAnalytics = [
    {
      title: "Total offers",
      value: offers.length,
      caption: `${offers.length} offer(s) created`,
      percentage: getPercentage(offers.length, Math.max(offers.length, 1)),
    },
    {
      title: "Active offers",
      value: activeOffers.length,
      caption: `${activeOffers.length} public of ${offers.length} total offers`,
      percentage: getPercentage(activeOffers.length, offers.length),
      tone: "green" as const,
    },
    {
      title: "Reserved orders",
      value: reservedOrders.length,
      caption: `${reservedOrders.length} active reservation(s)`,
      percentage: getPercentage(reservedOrders.length, orders.length),
      tone: "yellow" as const,
    },
    {
      title: "Collected orders",
      value: collectedOrders.length,
      caption: `${collectedOrders.length} collected of ${orders.length} reservation(s)`,
      percentage: getPercentage(collectedOrders.length, orders.length),
      tone: "green" as const,
    },
    {
      title: "Cancelled orders",
      value: cancelledOrders.length,
      caption: `${cancelledOrders.length} cancelled reservation(s)`,
      percentage: getPercentage(cancelledOrders.length, orders.length),
      tone: "red" as const,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F6EF]">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <div className="h-60 animate-pulse rounded-3xl bg-white" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-12">
          <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
            Business control center
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            {t("businessDashboard.title")}
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:mt-4 sm:text-lg">
            {t("businessDashboard.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-5">
            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">{t("businessDashboard.myOffers")}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{offers.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">{t("businessProfile.activeOffers")}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{activeOffers.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">{t("orders.reserved")}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{reservedOrders.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">{t("orders.collected")}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{collectedOrders.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">{t("orders.cancelled")}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{cancelledOrders.length}</h2>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Section 1
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {t("businessDashboard.stats")}
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
              A quick view of reservations, collected pickups, cancellations,
              and active offers for your approved businesses.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatCard
              title={t("businessDashboard.averageRating")}
              value={averageRatingLabel}
              tone={totalReviews > 0 ? "yellow" : "neutral"}
            />
            <StatCard title={t("businessDashboard.totalReviews")} value={totalReviews} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {businessAnalytics.map((metric) => (
              <AnalyticsBarCard key={metric.title} {...metric} />
            ))}
          </div>
        </div>

        {approvedBusinesses.length === 0 && (
          <div className="mt-6 rounded-3xl bg-yellow-100 p-5 sm:mt-8 sm:p-8">
            <h2 className="text-xl font-black text-yellow-800 sm:text-2xl">
              Waiting for approval
            </h2>
            <p className="mt-3 font-medium text-yellow-700">
              Your business must be approved before publishing offers.
            </p>
          </div>
        )}

        {approvedBusinesses.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              Section 2
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              {t("businessDashboard.createOffer")}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <select
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="rounded-2xl border p-4 font-semibold"
              >
                {approvedBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Offer title"
              />

              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Price"
              />

              <input
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Old price"
              />

              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Quantity"
              />

              <input
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                type="date"
                min={getTbilisiDateKey()}
                className="rounded-2xl border p-4 font-semibold"
                aria-label="Pickup date"
              />

              <input
                value={pickupStart}
                onChange={(e) => setPickupStart(e.target.value)}
                type="time"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Pickup start"
              />

              <input
                value={pickupEnd}
                onChange={(e) => setPickupEnd(e.target.value)}
                type="time"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Pickup end"
              />

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={handleImageFileChange}
                className="rounded-2xl border bg-white p-4 font-semibold"
              />
            </div>

            {imageFile && (
              <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                Selected image: {imageFile.name}
              </p>
            )}

            <button
              onClick={createOffer}
              disabled={publishing}
              className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-4"
            >
              {publishing ? "Publishing..." : "Publish offer"}
            </button>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Section 3
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t("businessDashboard.myOffers")}</h2>

          <div className="mt-6 grid gap-4">
            {offers.length === 0 && (
              <p className="font-medium text-gray-600">{t("businessDashboard.noOffers")}</p>
            )}

            {offers.map((offer) => {
              const statusLabel = getOfferStatusLabel(offer, language);
              const statusClass = getOfferStatusClassName(offer);
              const rating = ratingSummaries[offer.business_id];
              const isEditing = editingOfferId === offer.id;

              return (
                <div
                  key={offer.id}
                  className="grid gap-5 rounded-2xl border p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24 sm:rounded-2xl">
                        <OfferImage
                          src={offer.image_url}
                          alt={offer.title}
                          sizes="96px"
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">{offer.title}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <p className="font-medium text-gray-700">
                          ₾{offer.price} · Quantity: {offer.quantity}
                        </p>
                        <p className="text-gray-600">
                          {t("common.pickup")}: {formatPickupWindow(offer, language)}
                        </p>
                        <p className="text-sm font-bold text-yellow-700">
                          ⭐ {getRatingLabel(rating, language)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-500">
                          Created: {formatCreatedDate(offer.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                      <button
                        onClick={() =>
                          isEditing
                            ? cancelEditingOffer()
                            : startEditingOffer(offer)
                        }
                        disabled={
                          updatingOfferId !== null &&
                          updatingOfferId !== offer.id
                        }
                        className="min-h-12 rounded-full border border-green-200 bg-green-50 px-5 py-3 font-black text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>

                      <button
                        onClick={() => void toggleOfferActive(offer)}
                        disabled={updatingOfferId !== null}
                        aria-label={`Toggle ${offer.title} active status`}
                        className={`min-h-12 rounded-full px-5 py-3 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          offer.active
                            ? "bg-green-700 hover:bg-green-800"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {updatingOfferId === offer.id
                          ? "Updating..."
                          : offer.active
                          ? "Active"
                          : "Inactive"}
                      </button>

                      <button
                        onClick={() => void deleteOffer(offer)}
                        disabled={updatingOfferId !== null}
                        className="min-h-12 rounded-full bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingOfferId === offer.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-2xl bg-[#F7F6EF] p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          placeholder="Offer title"
                        />

                        <input
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          placeholder="Price"
                        />

                        <input
                          value={editOldPrice}
                          onChange={(event) =>
                            setEditOldPrice(event.target.value)
                          }
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          placeholder="Old price"
                        />

                        <input
                          value={editQuantity}
                          onChange={(event) =>
                            setEditQuantity(event.target.value)
                          }
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          placeholder="Quantity"
                        />

                        <input
                          value={editPickupStart}
                          onChange={(event) =>
                            setEditPickupStart(event.target.value)
                          }
                          type="time"
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          aria-label="Pickup start"
                        />

                        <input
                          value={editPickupEnd}
                          onChange={(event) =>
                            setEditPickupEnd(event.target.value)
                          }
                          type="time"
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          aria-label="Pickup end"
                        />
                      </div>

                      <button
                        onClick={() => void saveOfferEdits(offer)}
                        disabled={updatingOfferId !== null}
                        className="mt-4 min-h-12 w-full rounded-full bg-green-700 px-5 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {updatingOfferId === offer.id
                          ? "Saving..."
                          : "Save changes"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Section 4
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t("businessDashboard.reservations")}
          </h2>

          <div className="mt-6 rounded-2xl bg-[#F7F6EF] p-4 sm:p-5">
            <h3 className="text-xl font-black">Verify pickup code</h3>

            <p className="mt-2 font-semibold text-gray-600">
              Ask customer for the 6-digit pickup code from their Orders page.
            </p>

            <div className="mt-5 flex flex-col gap-4 md:flex-row">
              <input
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value)}
                placeholder="Enter pickup code"
                inputMode="numeric"
                maxLength={6}
                className="min-h-12 w-full rounded-2xl border bg-white p-3 font-mono text-xl font-black tracking-widest outline-none sm:p-4 md:max-w-sm"
              />

              <button
                onClick={verifyPickupCode}
                disabled={updatingOrderId !== null}
                className="min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
              >
                {updatingOrderId !== null ? "Completing..." : "Verify pickup"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { value: "all", label: "All" },
              { value: "reserved", label: "Reserved" },
              { value: "collected", label: "Collected" },
              { value: "cancelled", label: "Cancelled" },
            ].map((filter) => {
              const isActive = reservationFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setReservationFilter(filter.value as ReservationFilter)
                  }
                  className={`min-h-11 rounded-full px-5 py-2.5 font-black transition ${
                    isActive
                      ? "bg-green-700 text-white"
                      : "bg-green-50 text-green-800 hover:bg-green-100"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4">
            {filteredOrders.length === 0 && (
              <p className="font-medium text-gray-600">{t("businessDashboard.noReservations")}</p>
            )}

            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-5 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <h3 className="text-xl font-black sm:text-2xl">
                    {order.offers?.title || "Offer unavailable"}
                  </h3>

                  <p className="mt-2 font-semibold text-gray-700">
                    Customer: {order.profiles?.email || "Email unavailable"}
                  </p>

                  <p className="mt-1 font-semibold text-gray-600">
                    Created: {formatCreatedDate(order.created_at)}
                  </p>

                  <p className="mt-1 font-black text-green-700">
                    ₾{order.offers?.price}
                  </p>

                  <p className="mt-1 font-semibold text-gray-600">
                    {t("common.pickup")}:{" "}
                    {order.offers
                      ? formatPickupWindow(order.offers, language)
                      : "Time unavailable"}
                  </p>

                  <p className="mt-1 text-sm font-bold text-gray-500">
                    Reliability: {order.profiles?.reliability_score ?? "--"} ·{" "}
                    {order.profiles?.reliability_status || "unknown"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-black ${getOrderStatusClassName(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status, language)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-4 py-2 font-mono text-sm font-black text-gray-700">
                      Code: {order.pickup_code || "------"}
                    </span>
                  </div>
                </div>

                {isConfirmedOrderStatus(order.status) && (
                  <div className="flex flex-col gap-3 lg:flex-row">
                    {isOrderPastPickupEnd(order.offers) && (
                      <button
                        onClick={() => void markNoShow(order)}
                        disabled={updatingOrderId !== null}
                        className="min-h-12 w-full rounded-full bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                      >
                        {updatingOrderId === order.id
                          ? "Updating..."
                          : "Mark no-show"}
                      </button>
                    )}

                    {!isOrderPastPickupEnd(order.offers) && (
                      <button
                        onClick={() =>
                          void completeOrder(order.id, order.pickup_code || "")
                        }
                        disabled={updatingOrderId !== null}
                        className="min-h-12 w-full rounded-full bg-green-700 px-5 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                      >
                        {updatingOrderId === order.id
                          ? "Completing..."
                          : "Mark Collected"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Section 5
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t("businessDashboard.businessReviews")}
          </h2>

          <p className="mt-2 font-semibold text-gray-600">
            Customer reviews from collected orders for your approved
            businesses.
          </p>

          <div className="mt-6 grid gap-4">
            {reviews.length === 0 && (
              <p className="font-medium text-gray-600">
                {t("businessDashboard.noReviews")}
              </p>
            )}

            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border bg-[#F7F6EF] p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl font-black text-yellow-700">
                      {review.rating} ⭐
                    </p>
                    <p className="mt-1 font-bold text-gray-700">
                      {businessNameById[Number(review.business_id)] ||
                        "Business"}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-gray-500">
                    {formatCreatedDate(review.created_at)}
                  </p>
                </div>

                <p className="mt-4 font-semibold text-gray-700">
                  {review.review?.trim() || t("common.noWrittenReview")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
