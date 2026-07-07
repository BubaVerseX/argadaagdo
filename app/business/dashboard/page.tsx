"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { FilterBar } from "@/components/FilterBar";
import { LoadingState } from "@/components/LoadingState";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { BusinessAlertsSection } from "@/components/business/BusinessAlertsSection";
import { BusinessDashboardHero } from "@/components/business/BusinessDashboardHero";
import { BusinessHealthScore } from "@/components/business/BusinessHealthScore";
import { BusinessIntelligencePanel } from "@/components/business/BusinessIntelligencePanel";
import { BusinessOnboardingSections } from "@/components/business/BusinessOnboardingSections";
import { BusinessProfileSection } from "@/components/business/BusinessProfileSection";
import { BusinessRevenueInsights } from "@/components/business/BusinessRevenueInsights";
import { BusinessReviews } from "@/components/business/BusinessReviews";
import { BusinessStatsSection } from "@/components/business/BusinessStatsSection";
import { OfferForm } from "@/components/business/OfferForm";
import { OfferList } from "@/components/business/OfferList";
import { PickupVerificationModal } from "@/components/business/PickupVerificationModal";
import { ReservationList } from "@/components/business/ReservationList";
import {
  buildCsv,
  calculateBusinessAnalytics,
  downloadCsv,
  formatAnalyticsMoney,
  type OfferAnalytics,
} from "@/lib/analytics";
import {
  getConfirmedProfile,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { triggerTransactionalEmail } from "@/lib/email/client";
import {
  actionCooldownMs,
  createImageFileName,
  getImageValidationError,
  isApprovedBusiness,
  type ReservationFilter,
} from "@/lib/business/dashboard";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  buildBusinessDailySummary,
  buildBusinessRecommendations,
  buildBusinessWeeklySummary,
  buildOfferIntelligence,
} from "@/lib/marketplaceIntelligence";
import {
  notifyOfferPublished,
  notifyPickupCompleted,
  notifyProfileUpdated,
} from "@/lib/notifications";
import {
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import {
  DEFAULT_OFFER_CATEGORY,
  normalizeOfferCategory,
} from "@/lib/offerCategories";
import {
  getEffectiveOfferStatus,
  getTbilisiDateKey,
  hasPickupWindowStarted,
  isOrderPastPickupEnd,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { logAppError } from "@/lib/errors";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { paginateItems } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, Order, Rating } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { isWithinCooldown, validateTextField } from "@/lib/validation";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type DashboardOfferFilter =
  | "all"
  | "active"
  | "inactive"
  | "archive"
  | "sold_out";

const DASHBOARD_OFFER_PAGE_SIZE = 8;
const DASHBOARD_RESERVATION_PAGE_SIZE = 8;

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [approvedBusinesses, setApprovedBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<number[]>([]);
  const [ownedOfferIds, setOwnedOfferIds] = useState<number[]>([]);

  const [businessId, setBusinessId] = useState("");
  const [profileBusinessId, setProfileBusinessId] = useState<number | null>(
    null
  );
  const [profileName, setProfileName] = useState("");
  const [profileType, setProfileType] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_OFFER_CATEGORY);
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pickupDate, setPickupDate] = useState(getTbilisiDateKey());
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [publishing, setPublishing] = useState(false);
  const [updatingOfferId, setUpdatingOfferId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [pickupVerificationOrder, setPickupVerificationOrder] =
    useState<Order | null>(null);
  const [pickupVerificationCode, setPickupVerificationCode] = useState("");
  const [pickupVerificationError, setPickupVerificationError] = useState("");
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [reservationFilter, setReservationFilter] =
    useState<ReservationFilter>("reserved");
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationPage, setReservationPage] = useState(1);
  const [offerManagementSearch, setOfferManagementSearch] = useState("");
  const [offerManagementFilter, setOfferManagementFilter] =
    useState<DashboardOfferFilter>("active");
  const [offerManagementPage, setOfferManagementPage] = useState(1);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState(DEFAULT_OFFER_CATEGORY);
  const [editPrice, setEditPrice] = useState("");
  const [editOldPrice, setEditOldPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPickupStart, setEditPickupStart] = useState("");
  const [editPickupEnd, setEditPickupEnd] = useState("");
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProfileSaveAt = useRef(0);
  const lastOfferPublishAt = useRef(0);

  const loadDashboard = useCallback(async () => {
    const profileResult = await getConfirmedProfile(4);

    if (profileResult.status === "signed_out") {
      router.replace("/login?redirect=/business/dashboard");
      return;
    }

    if (profileResult.status === "unverified") {
      setMessageTone("warning");
      setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
      setBusinesses([]);
      setApprovedBusinesses([]);
      setOffers([]);
      setOrders([]);
      setReviews([]);
      setLoading(false);
      return;
    }

    if (profileResult.status !== "confirmed") {
      setMessageTone("warning");
      setMessage("Your account profile is still being prepared. Please refresh in a moment.");
      setLoading(false);
      return;
    }

    const userId = profileResult.user.id;

    if (profileResult.profile.role !== "business") {
      router.replace("/");
      return;
    }

    await processExpiredMarketplace();

    const { data: myBusinesses, error: businessError } = await supabase
      .from("businesses")
      .select("id, owner_id, name, business_type, address, phone, approved")
      .eq("owner_id", userId)
      .order("id", { ascending: false });

    if (businessError) {
      logAppError("Business dashboard failed to load businesses", businessError, {
        operation: "load_businesses",
        userId,
      });
      setMessageTone("error");
      setMessage("Your business information could not be loaded.");
      setLoading(false);
      return;
    }

    const allBusinesses = (myBusinesses || []) as Business[];
    const approved = allBusinesses.filter(isApprovedBusiness);
    const businessOptions = approved.length > 0 ? approved : allBusinesses;
    const selectedProfileBusiness =
      businessOptions.find((business) => String(business.id) === businessId) ||
      businessOptions[0];

    setBusinesses(allBusinesses);
    setApprovedBusinesses(approved);

    if (
      selectedProfileBusiness &&
      !savingProfile &&
      profileBusinessId !== selectedProfileBusiness.id
    ) {
      setProfileBusinessId(selectedProfileBusiness.id);
      setProfileName(selectedProfileBusiness.name || "");
      setProfileType(selectedProfileBusiness.business_type || "");
      setProfileAddress(selectedProfileBusiness.address || "");
      setProfilePhone(selectedProfileBusiness.phone || "");
    }

    setBusinessId((currentBusinessId) => {
      if (
        currentBusinessId &&
        businessOptions.some(
          (business) => String(business.id) === currentBusinessId
        )
      ) {
        return currentBusinessId;
      }

      return businessOptions[0] ? String(businessOptions[0].id) : "";
    });

    const businessIds = allBusinesses.map((business) => business.id);
    setOwnedBusinessIds(businessIds);

    if (businessIds.length === 0) {
      setBusinesses([]);
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
        .order("id", { ascending: false })
        .limit(500),
      loadBusinessRatingSummaries(),
      supabase
        .from("business_ratings")
        .select(
          "id, user_id, business_id, order_id, rating, review:comment, created_at"
        )
        .in("business_id", businessIds)
        .order("created_at", { ascending: false }),
    ]);

    setRatingSummaries(summaries);
    if (reviewError) {
      logAppError("Business dashboard failed to load reviews", reviewError, {
        operation: "load_business_reviews",
        businessIds,
      });
    }
    setReviews(reviewError ? [] : ((myReviews || []) as Rating[]));

    if (offerError) {
      logAppError("Business dashboard failed to load offers", offerError, {
        operation: "load_business_offers",
        businessIds,
      });
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
        .order("id", { ascending: false })
        .limit(500);

      if (orderError) {
        logAppError("Business dashboard failed to load reservations", orderError, {
          operation: "load_business_reservations",
          offerIds,
        });
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
  }, [businessId, profileBusinessId, router, savingProfile]);

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

  async function saveBusinessProfile(actionTime: number) {
    setMessage("");
    setMessageTone("error");

    if (
      isWithinCooldown(
        lastProfileSaveAt.current,
        actionCooldownMs,
        actionTime
      )
    ) {
      setMessage("Please wait a moment before saving again.");
      return;
    }

    const selectedBusinessId = Number(businessId);
    const currentBusiness = businesses.find(
      (business) => business.id === selectedBusinessId
    );

    if (!currentBusiness || !ownedBusinessIds.includes(currentBusiness.id)) {
      setMessage("Choose one of your businesses before saving profile changes.");
      return;
    }

    const nameResult = validateTextField({
      label: "Business name",
      value: profileName,
      minLength: 2,
      maxLength: 80,
    });
    const typeResult = validateTextField({
      label: "Business type",
      value: profileType,
      minLength: 2,
      maxLength: 60,
    });
    const addressResult = validateTextField({
      label: "Address",
      value: profileAddress,
      minLength: 5,
      maxLength: 160,
    });
    const phoneResult = validateTextField({
      label: "Phone number",
      value: profilePhone,
      minLength: 5,
      maxLength: 40,
      required: false,
    });

    const validationError =
      nameResult.error ||
      typeResult.error ||
      addressResult.error ||
      phoneResult.error;

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSavingProfile(true);
    lastProfileSaveAt.current = actionTime;

    const { data, error } = await supabase
      .from("businesses")
      .update({
        name: nameResult.value,
        business_type: typeResult.value,
        address: addressResult.value,
        phone: phoneResult.value || null,
      })
      .eq("id", currentBusiness.id)
      .eq("owner_id", currentBusiness.owner_id)
      .select("id, owner_id, name, business_type, address, phone, approved")
      .maybeSingle();

    if (error || !data) {
      logAppError("Business profile update failed", error || "No business row returned", {
        operation: "update_business_profile",
        businessId: currentBusiness.id,
      });
      setSavingProfile(false);
      setMessageTone("error");
      setMessage(
        error?.message.includes("row-level security")
          ? "Profile update was blocked. Please make sure you are signed in as this business owner."
          : "Business profile could not be updated. Please try again."
      );
      return;
    }

    const updatedBusiness = data as Business;
    setBusinesses((currentBusinesses) =>
      currentBusinesses.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business
      )
    );
    setApprovedBusinesses((currentBusinesses) =>
      currentBusinesses.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business
      )
    );
    setProfileBusinessId(updatedBusiness.id);
    setProfileName(updatedBusiness.name || "");
    setProfileType(updatedBusiness.business_type || "");
    setProfileAddress(updatedBusiness.address || "");
    setProfilePhone(updatedBusiness.phone || "");
    setSavingProfile(false);
    setMessageTone("success");
    setMessage("Business profile updated.");
    notifyProfileUpdated({ businessName: updatedBusiness.name || "Business" });
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
      logAppError("Offer image upload failed", error, {
        operation: "upload_offer_image",
        fileName,
        size: imageFile.size,
        type: imageFile.type,
      });
      setMessageTone("error");
      setMessage("Image upload failed. Please try a smaller JPG, PNG, or WebP file.");
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("offer-images").getPublicUrl(fileName);

    return publicUrl;
  }

  async function createOffer(actionTime: number) {
    setMessage("");
    setMessageTone("error");

    if (
      isWithinCooldown(
        lastOfferPublishAt.current,
        actionCooldownMs,
        actionTime
      )
    ) {
      setMessage("Please wait a moment before publishing another offer.");
      return;
    }

    if (!businessId) {
      setMessage("Choose an approved business before publishing an offer.");
      return;
    }

    const titleResult = validateTextField({
      label: "Offer title",
      value: title,
      minLength: 3,
      maxLength: 120,
    });
    const descriptionResult = validateTextField({
      label: "Description",
      value: description,
      maxLength: 500,
      required: false,
      multiline: true,
    });

    if (titleResult.error) {
      setMessage(titleResult.error || "Add an offer title. Example: Bakery Surprise Bag.");
      return;
    }

    if (descriptionResult.error) {
      setMessage(descriptionResult.error);
      return;
    }

    setTitle(titleResult.value);
    setDescription(descriptionResult.value);

    const selectedBusinessId = Number(businessId);
    const selectedCategory = normalizeOfferCategory(category);
    const priceValue = Number(price);
    const oldPriceValue = oldPrice ? Number(oldPrice) : null;
    const quantityValue = Number(quantity);

    if (
      !approvedBusinesses.some((business) => business.id === selectedBusinessId)
    ) {
      setMessage("Your business is not approved yet.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setMessage("Add a valid discounted price greater than 0.");
      return;
    }

    if (
      oldPriceValue !== null &&
      (!Number.isFinite(oldPriceValue) || oldPriceValue <= 0)
    ) {
      setMessage("Original price must be greater than 0, or leave it empty.");
      return;
    }

    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setMessage("Quantity must be a whole number greater than 0.");
      return;
    }

    if (!selectedCategory) {
      setMessage("Choose a category for this offer.");
      return;
    }

    if (!pickupDate || !pickupStart || !pickupEnd) {
      setMessage("Add a pickup date, start time and end time.");
      return;
    }

    if (pickupStart >= pickupEnd) {
      setMessage("Pickup end time must be after pickup start time.");
      return;
    }

    setPublishing(true);
    lastOfferPublishAt.current = actionTime;
    setMessageTone("success");
    setMessage("Publishing offer...");

    const imageUrl = await uploadImage();

    if (imageUrl === null) {
      setPublishing(false);
      return;
    }

    const { error } = await supabase.from("offers").insert({
      business_id: selectedBusinessId,
      title: titleResult.value,
      price: priceValue,
      old_price: oldPriceValue,
      quantity: quantityValue,
      pickup_date: pickupDate,
      pickup_start: pickupStart,
      pickup_end: pickupEnd,
      category: selectedCategory,
      description: descriptionResult.value || null,
      active: true,
      status: "active",
      image_url: imageUrl,
    });

    if (error) {
      logAppError("Offer creation failed", error, {
        operation: "create_offer",
        businessId: selectedBusinessId,
      });
      setPublishing(false);
      setMessageTone("error");
      setMessage(
        error.message.includes("row-level security")
          ? "Offer creation was blocked. Please make sure this business is approved and you are signed in as its owner."
          : "Offer could not be published. Please check the details and try again."
      );
      return;
    }

    setTitle("");
    setDescription("");
    setCategory(DEFAULT_OFFER_CATEGORY);
    setPrice("");
    setOldPrice("");
    setQuantity("1");
    setPickupDate(getTbilisiDateKey());
    setPickupStart("");
    setPickupEnd("");
    setImageFile(null);

    setPublishing(false);
    setMessageTone("success");
    setMessage("Offer published. It is now visible to customers.");
    notifyOfferPublished({
      offerTitle: titleResult.value,
      businessName: selectedBusiness?.name,
    });
    await loadDashboard();
  }

  function startEditingOffer(offer: Offer) {
    setMessage("");
    setEditingOfferId(offer.id);
    setEditTitle(offer.title);
    setEditCategory(normalizeOfferCategory(offer.category));
    setEditPrice(String(offer.price ?? ""));
    setEditOldPrice(offer.old_price ? String(offer.old_price) : "");
    setEditQuantity(String(offer.quantity ?? 0));
    setEditPickupStart(offer.pickup_start || "");
    setEditPickupEnd(offer.pickup_end || "");
  }

  function cancelEditingOffer() {
    setEditingOfferId(null);
    setEditTitle("");
    setEditCategory(DEFAULT_OFFER_CATEGORY);
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

    const titleResult = validateTextField({
      label: "Offer title",
      value: editTitle,
      minLength: 3,
      maxLength: 120,
    });

    if (titleResult.error) {
      setMessage(titleResult.error);
      return;
    }

    const priceValue = Number(editPrice);
    const selectedCategory = normalizeOfferCategory(editCategory);
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

    if (!selectedCategory) {
      setMessage("Category required.");
      return;
    }

    if (!editPickupStart || !editPickupEnd) {
      setMessage("Pickup start and end time are required.");
      return;
    }

    if (editPickupStart >= editPickupEnd) {
      setMessage("Pickup end time must be after pickup start time.");
      return;
    }

    const nextActive = quantityValue > 0 ? offer.active : false;
    const nextStatus =
      quantityValue <= 0 ? "sold_out" : nextActive ? "active" : "inactive";

    setUpdatingOfferId(offer.id);

    const { data, error } = await supabase
      .from("offers")
      .update({
        title: titleResult.value,
        category: selectedCategory,
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
      logAppError("Offer edit failed", error, {
        operation: "update_offer",
        offerId: offer.id,
      });
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage("Offer changes could not be saved. Please try again.");
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
    const effectiveStatus = getEffectiveOfferStatus(offer);

    if (effectiveStatus === "expired" && nextActive) {
      setMessage("Expired offers cannot be reactivated. Duplicate the offer and choose a new pickup date.");
      return;
    }

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
      logAppError("Offer status update failed", error, {
        operation: "toggle_offer_active",
        offerId: offer.id,
      });
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage("Offer status could not be updated. Please try again.");
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

  async function duplicateOffer(offer: Offer) {
    setMessage("");
    setMessageTone("error");

    if (!ownedBusinessIds.includes(offer.business_id)) {
      setMessage("You can only duplicate offers from your own business.");
      return;
    }

    setUpdatingOfferId(offer.id);

    const { error } = await supabase.from("offers").insert({
      business_id: offer.business_id,
      title: `${offer.title} copy`.slice(0, 120),
      category: normalizeOfferCategory(offer.category),
      price: Number(offer.price || 0),
      old_price: offer.old_price ? Number(offer.old_price) : null,
      quantity: Math.max(Number(offer.quantity || 1), 1),
      pickup_date: getTbilisiDateKey(),
      pickup_start: offer.pickup_start,
      pickup_end: offer.pickup_end,
      description: offer.description || null,
      active: false,
      status: "inactive",
      image_url: offer.image_url || "",
    });

    setUpdatingOfferId(null);

    if (error) {
      logAppError("Offer duplication failed", error, {
        operation: "duplicate_offer",
        offerId: offer.id,
      });
      setMessageTone("error");
      setMessage("Offer could not be duplicated. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Offer duplicated as inactive. Edit the pickup date and activate it when ready.");
    await loadDashboard();
  }

  async function archiveExpiredOffer(offer: Offer) {
    setMessage("");
    setMessageTone("error");

    if (!ownedBusinessIds.includes(offer.business_id)) {
      setMessage("You can only archive offers from your own business.");
      return;
    }

    if (getEffectiveOfferStatus(offer) !== "expired") {
      setMessage("Only expired offers can be archived.");
      return;
    }

    setUpdatingOfferId(offer.id);

    const { error } = await supabase
      .from("offers")
      .update({
        active: false,
        status: "expired",
      })
      .eq("id", offer.id)
      .in("business_id", ownedBusinessIds);

    setUpdatingOfferId(null);

    if (error) {
      logAppError("Expired offer archive failed", error, {
        operation: "archive_expired_offer",
        offerId: offer.id,
      });
      setMessageTone("error");
      setMessage("Expired offer could not be archived. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Expired offer archived in history.");
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
      "Delete this offer permanently? Offers with reservations cannot be deleted. Use Inactive for offers you want to keep in history."
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
      logAppError("Offer deletion failed", error, {
        operation: "delete_offer",
        offerId: offer.id,
      });
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage(
        error.message.toLowerCase().includes("foreign key")
          ? "This offer has reservations, so it cannot be deleted. Set it inactive instead."
          : "Offer could not be deleted. Please try again."
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
      logAppError("Pickup completion failed", error, {
        operation: "complete_pickup",
        orderId,
      });
      setUpdatingOrderId(null);
      setMessageTone("error");
      setMessage("Pickup could not be completed. Please check the pickup code and try again.");
      return false;
    }

    setUpdatingOrderId(null);
    setMessageTone("success");
    setMessage("Pickup completed successfully.");
    notifyPickupCompleted({
      orderId,
      offerTitle: completedOrder?.offers?.title,
      businessName: completedOrder?.offers?.businesses?.name,
    });
    void triggerTransactionalEmail({
      event: "pickup_completed",
      orderId,
    });
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: "collected" } : order
      )
    );
    await loadDashboard();
    return true;
  }

  function openPickupVerification(order: Order) {
    setMessage("");
    setPickupVerificationOrder(order);
    setPickupVerificationCode("");
    setPickupVerificationError("");
  }

  function closePickupVerification() {
    if (updatingOrderId !== null) return;

    setPickupVerificationOrder(null);
    setPickupVerificationCode("");
    setPickupVerificationError("");
  }

  async function submitPickupVerification() {
    if (!pickupVerificationOrder) return;

    const enteredCode = pickupVerificationCode.trim();
    const expectedCode = String(pickupVerificationOrder.pickup_code || "").trim();

    if (!enteredCode) {
      setPickupVerificationError("Pickup code is required.");
      return;
    }

    if (!expectedCode || enteredCode !== expectedCode) {
      setPickupVerificationError("Pickup code does not match.");
      return;
    }

    setPickupVerificationError("");
    const completed = await completeOrder(pickupVerificationOrder.id, enteredCode);

    if (completed) {
      setPickupVerificationOrder(null);
      setPickupVerificationCode("");
      setPickupVerificationError("");
    }
  }

  async function markNoShow(order: Order) {
    setUpdatingOrderId(order.id);
    setMessage("");

    const { error } = await supabase.rpc("mark_order_no_show", {
      p_order_id: order.id,
    });

    if (error) {
      logAppError("No-show marking failed", error, {
        operation: "mark_order_no_show",
        orderId: order.id,
      });
      setMessageTone("error");
      setMessage("Order could not be marked no-show. Please try again.");
      setUpdatingOrderId(null);
      return false;
    }

    setMessageTone("success");
    setMessage("Order marked as no-show.");
    setUpdatingOrderId(null);
    await loadDashboard();
    return true;
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
          table: "business_ratings",
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
  const expiredOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "expired"
  );
  const nearlySoldOutOffers = activeOffers.filter(
    (offer) =>
      Number(offer.quantity || 0) > 0 && Number(offer.quantity || 0) <= 2
  );
  const inactiveOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "inactive"
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
    totalReviews > 0 ? `${averageRating.toFixed(1)} ⭐` : t("common.noRatings");
  const selectedBusiness =
    approvedBusinesses.find((business) => String(business.id) === businessId) ||
    approvedBusinesses[0] ||
    businesses[0];
  const dashboardBusinessName =
    selectedBusiness?.name || t("businessDashboard.businessOwner");
  const businessNameById = approvedBusinesses.reduce<Record<number, string>>(
    (businessMap, business) => {
      businessMap[business.id] = business.name;
      return businessMap;
    },
    {}
  );
  const canCreateOffers = approvedBusinesses.length > 0;
  const businessStatusMessage =
    businesses.length === 0
      ? "Register your business first."
      : "Your business is not approved yet.";
  const collectedOrders = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const reservedOrders = orders.filter((order) =>
    isConfirmedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter((order) =>
    isCancelledOrderStatus(order.status)
  );
  const noShowOrders = orders.filter((order) => order.status === "no_show");
  const todayDateKey = getTbilisiDateKey();
  const todaysActiveReservations = orders.filter(
    (order) =>
      order.offers?.pickup_date === todayDateKey &&
      isConfirmedOrderStatus(order.status)
  );
  const offersExpiringToday = activeOffers.filter(
    (offer) => offer.pickup_date === todayDateKey
  );
  const reservationsWithStartedPickupWindow = todaysActiveReservations.filter(
    (order) => hasPickupWindowStarted(order.offers)
  );
  const hasAnalyticsActivity =
    offers.length > 0 || orders.length > 0 || totalReviews > 0;
  const isNewBusinessOnboarding = offers.length === 0 && orders.length === 0;
  const businessAnalytics = calculateBusinessAnalytics({
    offers,
    orders,
    reviews,
  });
  const offerIntelligenceById = buildOfferIntelligence(offers, orders);
  const businessRecommendations = buildBusinessRecommendations(
    offers,
    offerIntelligenceById
  );
  const dailySummary = buildBusinessDailySummary({ offers, orders });
  const weeklySummary = buildBusinessWeeklySummary({ orders, reviews });
  const onboardingChecklist = [
    {
      step: 1,
      label: t("businessOnboarding.checkCreateOffer"),
      completed: offers.length > 0,
    },
    {
      step: 2,
      label: t("businessOnboarding.checkFirstReservation"),
      completed: orders.length > 0,
    },
    {
      step: 3,
      label: t("businessOnboarding.checkFirstPickup"),
      completed: collectedOrders.length > 0,
    },
    {
      step: 4,
      label: t("businessOnboarding.checkFirstRating"),
      completed: reviews.length > 0,
    },
  ];
  const firstOfferGuidance = [
    {
      label: t("businessOnboarding.recommendedQuantity"),
      value: t("businessOnboarding.recommendedQuantityValue"),
    },
    {
      label: t("businessOnboarding.recommendedPickupWindow"),
      value: t("businessOnboarding.recommendedPickupWindowValue"),
    },
    {
      label: t("businessOnboarding.recommendedTitle"),
      value: t("businessOnboarding.recommendedTitleValue"),
    },
  ];
  const hasCompleteProfile = Boolean(
    profileName.trim() &&
      profileType.trim() &&
      profileAddress.trim() &&
      profilePhone.trim()
  );
  const hasBusinessImage = offers.some((offer) => Boolean(offer.image_url));
  const hasBusinessDescription = Boolean(
    selectedBusiness?.description?.trim() ||
      offers.some((offer) => Boolean(offer.description?.trim()))
  );
  const businessHealthChecks = [
    {
      label: "Profile complete",
      helper: "Name, type, address and phone are filled in.",
      complete: hasCompleteProfile,
    },
    {
      label: "Logo or offer image uploaded",
      helper: "Use clear images so customers trust your surprise bags.",
      complete: hasBusinessImage,
    },
    {
      label: "Description added",
      helper: "Add a short description on your profile or offers.",
      complete: hasBusinessDescription,
    },
    {
      label: "Address added",
      helper: "Customers need a clear pickup location.",
      complete: Boolean(profileAddress.trim() || selectedBusiness?.address),
    },
    {
      label: "Phone verified",
      helper: "For now this means a contact phone is saved for admin review.",
      complete: Boolean(profilePhone.trim() || selectedBusiness?.phone),
    },
    {
      label: "Active offers",
      helper: "At least one offer is visible to customers.",
      complete: activeOffers.length > 0,
    },
    {
      label: "Completed pickups",
      helper: "At least one customer pickup has been completed.",
      complete: collectedOrders.length > 0,
    },
  ];
  const businessOperationsChecklist = [
    {
      label: "Create first offer",
      helper: "Publish a realistic surprise bag with price and pickup time.",
      complete: offers.length > 0,
      anchor: "#create-offer",
    },
    {
      label: "Upload logo or image",
      helper: "Add a clear image to build customer trust.",
      complete: hasBusinessImage,
      anchor: "#create-offer",
    },
    {
      label: "Complete profile",
      helper: "Keep name, type, address and phone up to date.",
      complete: hasCompleteProfile,
    },
    {
      label: "Receive first reservation",
      helper: "New reservations will appear in the reservations section.",
      complete: orders.length > 0,
    },
    {
      label: "Complete first pickup",
      helper: "Ask for the pickup code before handing over food.",
      complete: collectedOrders.length > 0,
    },
    {
      label: "Receive first rating",
      helper: "Ratings help future customers trust your business.",
      complete: reviews.length > 0,
    },
  ];
  const overviewStats = [
    {
      title: t("businessDashboard.activeOffersMetric"),
      value: activeOffers.length,
      tone: "green" as const,
    },
    {
      title: t("businessDashboard.totalReservationsMetric"),
      value: orders.length,
      tone: "neutral" as const,
    },
    {
      title: t("businessDashboard.completedPickupsMetric"),
      value: collectedOrders.length,
      tone: "green" as const,
    },
    {
      title: t("businessDashboard.averageRating"),
      value: averageRatingLabel,
      tone: totalReviews > 0 ? ("yellow" as const) : ("neutral" as const),
    },
    {
      title: "Boxes sold",
      value: businessAnalytics.boxesSold,
      tone: "green" as const,
    },
    {
      title: "Boxes available",
      value: businessAnalytics.boxesRemaining,
      tone: "neutral" as const,
    },
    {
      title: "Today's reservations",
      value: businessAnalytics.todayReservations,
      tone:
        businessAnalytics.todayReservations > 0
          ? ("yellow" as const)
          : ("neutral" as const),
    },
  ];
  const reservationSummary = [
    {
      label: t("orders.reserved"),
      value: reservedOrders.length,
      className: "bg-green-50 text-green-800",
    },
    {
      label: t("orders.collected"),
      value: collectedOrders.length,
      className: "bg-yellow-50 text-yellow-800",
    },
    {
      label: t("orders.cancelled"),
      value: cancelledOrders.length,
      className: "bg-red-50 text-red-700",
    },
    {
      label: t("businessDashboard.noShow"),
      value: noShowOrders.length,
      className: "bg-gray-100 text-gray-700",
    },
  ];
  const businessAlerts = [
    ...(reservedOrders.length > 0
      ? [
          {
            title: "New reservation",
            text: `${reservedOrders.length} active ${
              reservedOrders.length === 1 ? "reservation needs" : "reservations need"
            } pickup attention.`,
            className: "border-green-100 bg-green-50 text-green-900",
          },
        ]
      : [
          {
            title: "No active reservations",
            text: "New reservations will appear here when customers reserve your offers.",
            className: "border-gray-100 bg-gray-50 text-gray-800",
          },
        ]),
    ...(offersExpiringToday.length > 0
      ? [
          {
            title: "Offer expires today",
            text: `${offersExpiringToday.length} active offer ${
              offersExpiringToday.length === 1 ? "ends" : "end"
            } today. Unsold quantity should stay as same-day inventory.`,
            className: "border-yellow-100 bg-yellow-50 text-yellow-950",
          },
        ]
      : []),
    ...(reservationsWithStartedPickupWindow.length > 0
      ? [
          {
            title: "Pickup window started",
            text: `${reservationsWithStartedPickupWindow.length} reservation ${
              reservationsWithStartedPickupWindow.length === 1 ? "is" : "are"
            } inside the pickup window now.`,
            className: "border-green-100 bg-green-50 text-green-900",
          },
        ]
      : []),
    ...(todaysActiveReservations.length > 0
      ? [
          {
            title: "Pickup due today",
            text: `${todaysActiveReservations.length} reservation ${
              todaysActiveReservations.length === 1 ? "is" : "are"
            } scheduled for pickup today.`,
            className: "border-yellow-100 bg-yellow-50 text-yellow-950",
          },
        ]
      : [
          {
            title: "No reservations today",
            text: "Nothing needs pickup action today. New reservations will appear here automatically.",
            className: "border-gray-100 bg-gray-50 text-gray-800",
          },
        ]),
    ...(nearlySoldOutOffers.length > 0
      ? [
          {
            title: "Low quantity",
            text: `${nearlySoldOutOffers.length} active offer ${
              nearlySoldOutOffers.length === 1 ? "has" : "have"
            } 2 or fewer boxes left.`,
            className: "border-yellow-100 bg-yellow-50 text-yellow-950",
          },
        ]
      : []),
    ...(inactiveOffers.length > 0
      ? [
          {
            title: "Inactive offers",
            text: `${inactiveOffers.length} offer ${
              inactiveOffers.length === 1 ? "is" : "are"
            } hidden from public browsing.`,
            className: "border-gray-100 bg-gray-50 text-gray-800",
          },
        ]
      : []),
    ...(expiredOffers.length > 0
      ? [
          {
            title: "Expired offer",
            text: `${expiredOffers.length} offer ${
              expiredOffers.length === 1 ? "has" : "have"
            } passed the pickup window and should stay in history.`,
            className: "border-red-100 bg-red-50 text-red-800",
          },
        ]
      : []),
  ];
  const normalizedReservationSearch = reservationSearch.trim().toLowerCase();
  const normalizedOfferSearch = offerManagementSearch.trim().toLowerCase();
  const filteredManagedOffers = offers.filter((offer) => {
    const effectiveStatus = getEffectiveOfferStatus(offer);
    const matchesStatus =
      offerManagementFilter === "all" ||
      (offerManagementFilter === "archive" && effectiveStatus === "expired") ||
      effectiveStatus === offerManagementFilter;
    const searchText =
      `${offer.title} ${offer.category} ${offer.businesses?.name}`.toLowerCase();
    const matchesSearch =
      normalizedOfferSearch === "" || searchText.includes(normalizedOfferSearch);

    return matchesStatus && matchesSearch;
  });
  const paginatedManagedOffers = paginateItems(
    filteredManagedOffers,
    offerManagementPage,
    DASHBOARD_OFFER_PAGE_SIZE
  );
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      reservationFilter === "all" ||
      (reservationFilter === "reserved" &&
        isConfirmedOrderStatus(order.status)) ||
      (reservationFilter === "collected" &&
        isCollectedOrderStatus(order.status)) ||
      (reservationFilter === "cancelled" &&
        isCancelledOrderStatus(order.status)) ||
      (reservationFilter === "no_show" && order.status === "no_show");
    const customerEmail = order.profiles?.email?.toLowerCase() || "";
    const matchesSearch =
      normalizedReservationSearch === "" ||
      customerEmail.includes(normalizedReservationSearch);

    return matchesStatus && matchesSearch;
  });
  const paginatedReservations = paginateItems(
    filteredOrders,
    reservationPage,
    DASHBOARD_RESERVATION_PAGE_SIZE
  );

  function exportReservationsCsv() {
    const csv = buildCsv(
      orders.map((order) => ({
        order_id: order.id,
        offer_id: order.offer_id,
        offer_title: order.offers?.title || "Offer unavailable",
        customer_email: order.profiles?.email || "Email unavailable",
        status: order.status,
        pickup_date: order.offers?.pickup_date || "",
        pickup_start: order.offers?.pickup_start || "",
        pickup_end: order.offers?.pickup_end || "",
        amount: order.amount || "",
        business_amount: order.business_amount || "",
        created_at: order.created_at || "",
      }))
    );

    downloadCsv("argadaagdo-reservations.csv", csv);
  }

  function exportCompletedPickupsCsv() {
    const csv = buildCsv(
      orders
        .filter((order) => isCollectedOrderStatus(order.status))
        .map((order) => ({
          order_id: order.id,
          offer_title: order.offers?.title || "Offer unavailable",
          customer_email: order.profiles?.email || "Email unavailable",
          completed_at: order.completed_at || "",
          pickup_date: order.offers?.pickup_date || "",
          estimated_business_revenue: order.business_amount || "",
        }))
    );

    downloadCsv("argadaagdo-completed-pickups.csv", csv);
  }

  function offerAnalyticsRows(
    offerAnalyticsById: Record<number, OfferAnalytics>
  ) {
    return offers.map((offer) => {
      const analytics = offerAnalyticsById[offer.id];

      return {
        offer_id: offer.id,
        title: offer.title,
        category: offer.category || "",
        status: getEffectiveOfferStatus(offer),
        remaining_quantity: offer.quantity,
        reservations: analytics?.reservations || 0,
        completion_rate: analytics ? `${analytics.completionRate}%` : "0%",
        cancellation_rate: analytics ? `${analytics.cancellationRate}%` : "0%",
        estimated_revenue: analytics
          ? formatAnalyticsMoney(analytics.estimatedRevenue)
          : "₾ 0.00",
      };
    });
  }

  function exportOfferStatisticsCsv() {
    const csv = buildCsv(
      offerAnalyticsRows(businessAnalytics.offerAnalyticsById)
    );

    downloadCsv("argadaagdo-offer-statistics.csv", csv);
  }

  if (loading) {
    return (
      <main className="app-shell">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <LoadingState
            title="Loading business dashboard..."
            description="Preparing offers, reservations, pickup tasks and ratings."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <BusinessDashboardHero
          t={t}
          businessName={dashboardBusinessName}
          totalOffers={offers.length}
          activeOffers={activeOffers.length}
          reservedOrders={reservedOrders.length}
        />

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        <BusinessAlertsSection alerts={businessAlerts} />

        {selectedBusiness && (
          <>
            <BusinessProfileSection
              profileName={profileName}
              profileType={profileType}
              profileAddress={profileAddress}
              profilePhone={profilePhone}
              savingProfile={savingProfile}
              onProfileNameChange={setProfileName}
              onProfileTypeChange={setProfileType}
              onProfileAddressChange={setProfileAddress}
              onProfilePhoneChange={setProfilePhone}
              onSave={(actionTime) => void saveBusinessProfile(actionTime)}
            />

            <BusinessHealthScore
              checks={businessHealthChecks}
              checklist={businessOperationsChecklist}
            />
          </>
        )}

        {isNewBusinessOnboarding && (
          <BusinessOnboardingSections t={t} checklist={onboardingChecklist} />
        )}

        <BusinessStatsSection
          t={t}
          hasAnalyticsActivity={hasAnalyticsActivity}
          metrics={overviewStats}
        />

        <BusinessRevenueInsights
          analytics={businessAnalytics}
          onExportReservations={exportReservationsCsv}
          onExportCompletedPickups={exportCompletedPickupsCsv}
          onExportOfferStatistics={exportOfferStatisticsCsv}
        />

        <BusinessIntelligencePanel
          dailySummary={dailySummary}
          weeklySummary={weeklySummary}
          recommendations={businessRecommendations}
        />

        {!canCreateOffers && (
          <div className="mt-6 rounded-3xl bg-yellow-100 p-5 sm:mt-8 sm:p-8">
            <h2 className="text-xl font-black text-yellow-800 sm:text-2xl">
              {businessStatusMessage}
            </h2>
            <p className="mt-3 font-medium text-yellow-700">
              {businesses.length === 0
                ? "Create a business profile before publishing food rescue offers."
                : "Your business exists, but it must be approved before publishing offers."}
            </p>
          </div>
        )}

        <OfferForm
          t={t}
          canCreateOffers={canCreateOffers}
          businessStatusMessage={businessStatusMessage}
          approvedBusinesses={approvedBusinesses}
          businessId={businessId}
          title={title}
          description={description}
          category={category}
          price={price}
          oldPrice={oldPrice}
          quantity={quantity}
          pickupDate={pickupDate}
          pickupStart={pickupStart}
          pickupEnd={pickupEnd}
          imageFile={imageFile}
          publishing={publishing}
          guidance={firstOfferGuidance}
          onBusinessIdChange={setBusinessId}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onCategoryChange={setCategory}
          onPriceChange={setPrice}
          onOldPriceChange={setOldPrice}
          onQuantityChange={setQuantity}
          onPickupDateChange={setPickupDate}
          onPickupStartChange={setPickupStart}
          onPickupEndChange={setPickupEnd}
          onImageFileChange={handleImageFileChange}
          onCreateOffer={(actionTime) => void createOffer(actionTime)}
        />

        <FilterBar
          className="mt-6 sm:mt-8"
          title="Offer management search"
          description="Find offers by title, category or business. Filter history before editing or archiving."
        >
          <SearchBar
            value={offerManagementSearch}
            onChange={(value) => {
              setOfferManagementSearch(value);
              setOfferManagementPage(1);
            }}
            placeholder="Search offers..."
            label="Search offers"
          />

          <select
            value={offerManagementFilter}
            onChange={(event) => {
              setOfferManagementFilter(
                event.target.value as DashboardOfferFilter
              );
              setOfferManagementPage(1);
            }}
            aria-label="Filter offers by status"
            className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All offers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archive">Archive</option>
            <option value="sold_out">Sold out</option>
          </select>
        </FilterBar>

        <OfferList
          t={t}
          language={language}
          offers={paginatedManagedOffers.items}
          emptyTitle={
            offers.length === 0 ? undefined : "No offers match your filters"
          }
          emptyText={
            offers.length === 0
              ? undefined
              : "Try a different search or status filter."
          }
          ratingSummaries={ratingSummaries}
          offerAnalyticsById={businessAnalytics.offerAnalyticsById}
          offerIntelligenceById={offerIntelligenceById}
          editingOfferId={editingOfferId}
          updatingOfferId={updatingOfferId}
          editTitle={editTitle}
          editCategory={editCategory}
          editPrice={editPrice}
          editOldPrice={editOldPrice}
          editQuantity={editQuantity}
          editPickupStart={editPickupStart}
          editPickupEnd={editPickupEnd}
          onStartEditing={startEditingOffer}
          onCancelEditing={cancelEditingOffer}
          onToggleActive={(offer) => void toggleOfferActive(offer)}
          onDuplicate={(offer) => void duplicateOffer(offer)}
          onArchiveExpired={(offer) => void archiveExpiredOffer(offer)}
          onDelete={(offer) => void deleteOffer(offer)}
          onSaveEdits={(offer) => void saveOfferEdits(offer)}
          onEditTitleChange={setEditTitle}
          onEditCategoryChange={setEditCategory}
          onEditPriceChange={setEditPrice}
          onEditOldPriceChange={setEditOldPrice}
          onEditQuantityChange={setEditQuantity}
          onEditPickupStartChange={setEditPickupStart}
          onEditPickupEndChange={setEditPickupEnd}
        />

        <Pagination
          className="mt-5"
          page={paginatedManagedOffers.page}
          totalItems={filteredManagedOffers.length}
          pageSize={DASHBOARD_OFFER_PAGE_SIZE}
          label="Offers"
          onPageChange={setOfferManagementPage}
        />

        <ReservationList
          t={t}
          language={language}
          orders={orders}
          filteredOrders={paginatedReservations.items}
          filteredOrderCount={filteredOrders.length}
          reservationSummary={reservationSummary}
          reservationFilter={reservationFilter}
          reservationSearch={reservationSearch}
          normalizedReservationSearch={normalizedReservationSearch}
          updatingOrderId={updatingOrderId}
          reservationPage={paginatedReservations.page}
          reservationPageSize={DASHBOARD_RESERVATION_PAGE_SIZE}
          onReservationSearchChange={(value) => {
            setReservationSearch(value);
            setReservationPage(1);
          }}
          onReservationFilterChange={(value) => {
            setReservationFilter(value);
            setReservationPage(1);
          }}
          onReservationPageChange={setReservationPage}
          onOpenPickupVerification={openPickupVerification}
          onMarkNoShow={(order) => void markNoShow(order)}
        />

        {pickupVerificationOrder && (
          <PickupVerificationModal
            t={t}
            language={language}
            order={pickupVerificationOrder}
            code={pickupVerificationCode}
            error={pickupVerificationError}
            updatingOrderId={updatingOrderId}
            onCodeChange={(value) => {
              setPickupVerificationCode(value);
              setPickupVerificationError("");
            }}
            onClose={closePickupVerification}
            onSubmit={() => void submitPickupVerification()}
          />
        )}

        <BusinessReviews
          t={t}
          language={language}
          reviews={reviews}
          businessNameById={businessNameById}
        />
      </section>
    </main>
  );
}
