"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import {
  getConfirmedProfile,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
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
  DEFAULT_OFFER_CATEGORY,
  OFFER_CATEGORIES,
  normalizeOfferCategory,
} from "@/lib/offerCategories";
import {
  formatDisplayDateTime,
  formatMoney,
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
import { isWithinCooldown, validateTextField } from "@/lib/validation";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

function createImageFileName(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${crypto.randomUUID()}-${safeName}`;
}

const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImageSizeBytes = 5 * 1024 * 1024;
const actionCooldownMs = 2500;
type ReservationFilter =
  | "all"
  | "reserved"
  | "collected"
  | "cancelled"
  | "no_show";
type MetricTone = "neutral" | "green" | "yellow";

const metricToneStyles: Record<
  MetricTone,
  { card: string; label: string; value: string }
> = {
  neutral: {
    card: "bg-gray-50 text-gray-950",
    label: "text-gray-600",
    value: "text-gray-950",
  },
  green: {
    card: "bg-green-50 text-green-950",
    label: "text-green-700",
    value: "text-green-800",
  },
  yellow: {
    card: "bg-yellow-50 text-yellow-950",
    label: "text-yellow-800",
    value: "text-yellow-800",
  },
};

function isApprovedBusiness(business: Business) {
  return business.approved === true || String(business.approved) === "true";
}

function getImageValidationError(file: File) {
  if (file.size > maxImageSizeBytes) {
    return "Image is too large. Please upload a file under 5MB.";
  }
  if (!allowedImageTypes.includes(file.type)) {
    return "Invalid image type. Please use JPG, PNG, or WebP.";
  }
  return "";
}

function RequiredMark() {
  return <span className="text-red-600">*</span>;
}

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
        .order("id", { ascending: false }),
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

  async function saveBusinessProfile() {
    setMessage("");
    setMessageTone("error");

    if (isWithinCooldown(lastProfileSaveAt.current, actionCooldownMs)) {
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
    lastProfileSaveAt.current = Date.now();

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
      setMessage("Image upload failed. Please try a smaller JPG, PNG, or WebP file.");
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

    if (isWithinCooldown(lastOfferPublishAt.current, actionCooldownMs)) {
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
    lastOfferPublishAt.current = Date.now();
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
  const boxesSold = orders.filter((order) =>
    isConfirmedOrderStatus(order.status) || isCollectedOrderStatus(order.status)
  ).length;
  const boxesAvailable = activeOffers.reduce(
    (total, offer) => total + Number(offer.quantity || 0),
    0
  );
  const todayDateKey = getTbilisiDateKey();
  const todaysReservations = orders.filter(
    (order) => order.offers?.pickup_date === todayDateKey
  ).length;
  const hasAnalyticsActivity =
    offers.length > 0 || orders.length > 0 || totalReviews > 0;
  const isNewBusinessOnboarding = offers.length === 0 && orders.length === 0;
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
      value: boxesSold,
      tone: "green" as const,
    },
    {
      title: "Boxes available",
      value: boxesAvailable,
      tone: "neutral" as const,
    },
    {
      title: "Today's reservations",
      value: todaysReservations,
      tone: todaysReservations > 0 ? ("yellow" as const) : ("neutral" as const),
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
  const normalizedReservationSearch = reservationSearch.trim().toLowerCase();
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

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
            {t("businessDashboard.welcome")}, {dashboardBusinessName}
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:mt-4 sm:text-lg">
            {t("businessDashboard.welcomeText")}
          </p>

          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-4">
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
          </div>
        </div>

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        {selectedBusiness && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                  Business Profile
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Manage public details
                </h2>
                <p className="mt-2 max-w-2xl font-semibold leading-7 text-gray-600">
                  Keep your public business information clear so customers know
                  where to collect their surprise bag.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="rounded-3xl bg-green-50 p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-green-800 shadow-sm">
                    {profileName.trim().slice(0, 2).toUpperCase() || "AG"}
                  </div>
                  <p className="mt-3 text-sm font-black text-green-800">
                    Logo placeholder
                  </p>
                </div>
                <div className="rounded-3xl bg-[#F7F6EF] p-5 text-center">
                  <div className="mx-auto h-16 rounded-2xl bg-gradient-to-br from-green-100 to-yellow-100 shadow-inner" />
                  <p className="mt-3 text-sm font-black text-gray-700">
                    Cover image placeholder
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-gray-700">
                <span>
                  Business name <RequiredMark />
                </span>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={80}
                  className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  placeholder="GMBH1 Bakery"
                />
                <span className="text-xs font-bold text-gray-500">
                  {profileName.length}/80
                </span>
              </label>

              <label className="grid gap-2 text-sm font-black text-gray-700">
                <span>
                  Business type <RequiredMark />
                </span>
                <input
                  value={profileType}
                  onChange={(event) => setProfileType(event.target.value)}
                  maxLength={60}
                  className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  placeholder="Bakery"
                />
                <span className="text-xs font-bold text-gray-500">
                  {profileType.length}/60
                </span>
              </label>

              <label className="grid gap-2 text-sm font-black text-gray-700">
                <span>
                  Address <RequiredMark />
                </span>
                <input
                  value={profileAddress}
                  onChange={(event) => setProfileAddress(event.target.value)}
                  maxLength={160}
                  className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  placeholder="Rustaveli Avenue, Tbilisi"
                />
                <span className="text-xs font-bold text-gray-500">
                  {profileAddress.length}/160
                </span>
              </label>

              <label className="grid gap-2 text-sm font-black text-gray-700">
                Phone
                <input
                  value={profilePhone}
                  onChange={(event) => setProfilePhone(event.target.value)}
                  maxLength={40}
                  className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  placeholder="+995 555 123 456"
                />
                <span className="text-xs font-bold text-gray-500">
                  {profilePhone.length}/40
                </span>
              </label>
            </div>

            <div className="mt-5 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold leading-6 text-yellow-900">
              Business description, logo upload, and cover image storage need
              database fields before they can be saved. For now, public profiles
              use your business type, address, and active offer photos.
            </div>

            <button
              type="button"
              onClick={() => void saveBusinessProfile()}
              disabled={savingProfile}
              className="mt-5 min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {savingProfile ? "Saving profile..." : "Save profile"}
            </button>
          </div>
        )}

        {isNewBusinessOnboarding && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              {t("businessOnboarding.badge")}
            </p>
            <h2 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl">
              {t("businessOnboarding.welcomeTitle")}
            </h2>
            <p className="mt-3 max-w-3xl font-semibold leading-7 text-gray-700">
              {t("businessOnboarding.welcomeText")}
            </p>
            <a
              href="#create-offer"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800 sm:w-auto"
            >
              {t("businessOnboarding.createFirstBag")}
            </a>
          </div>
        )}

        {isNewBusinessOnboarding && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              {t("businessOnboarding.checklistBadge")}
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              {t("businessOnboarding.checklistTitle")}
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {onboardingChecklist.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-2xl p-4 font-bold ${
                    item.completed
                      ? "bg-green-50 text-green-800"
                      : "bg-[#F7F6EF] text-gray-700"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                      item.completed
                        ? "bg-green-700 text-white"
                        : "bg-white text-gray-500"
                    }`}
                  >
                    {item.completed ? "✓" : item.step}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                t("businessOnboarding.tipPublishEarly"),
                t("businessOnboarding.tipClearNames"),
                t("businessOnboarding.tipAccurateTimes"),
              ].map((tip) => (
                <span
                  key={tip}
                  className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-800"
                >
                  ✓ {tip}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              Dashboard Overview
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              {t("businessDashboard.stats")}
            </h2>
          </div>

          {!hasAnalyticsActivity && (
            <div className="mt-6 rounded-3xl border border-dashed border-green-200 bg-green-50/70 p-5 text-center font-bold text-green-800 sm:p-6">
              {t("businessDashboard.emptyAnalytics")}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((metric) => {
              const styles = metricToneStyles[metric.tone];

              return (
                <div
                  key={metric.title}
                  className={`rounded-2xl p-4 shadow-sm sm:rounded-3xl sm:p-5 ${styles.card}`}
                >
                  <p className={`text-sm font-black ${styles.label}`}>
                    {metric.title}
                  </p>
                  <p className={`mt-2 text-3xl font-black sm:text-4xl ${styles.value}`}>
                    {metric.value}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

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

        <div
          id="create-offer"
          className="mt-6 scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8"
        >
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Offer Management
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t("businessDashboard.createOffer")}
          </h2>

          {canCreateOffers ? (
            <>
              <div className="mt-5 rounded-2xl bg-green-50 p-4 sm:p-5">
                <p className="text-sm font-black uppercase tracking-widest text-green-700">
                  {t("businessOnboarding.firstOfferGuidanceTitle")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {firstOfferGuidance.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-green-900"
                    >
                      ✓ {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Business <RequiredMark />
                  </span>
                  <select
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  >
                    {approvedBusinesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Title <RequiredMark />
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                    placeholder="Bakery Surprise Bag"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700 md:col-span-2">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                    className="min-h-28 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                    placeholder="Fresh bakery items saved from today's closing stock."
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Category <RequiredMark />
                  </span>
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(normalizeOfferCategory(event.target.value))
                    }
                    required
                    className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  >
                    {OFFER_CATEGORIES.map((offerCategory) => (
                      <option key={offerCategory} value={offerCategory}>
                        {offerCategory}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Price <RequiredMark />
                  </span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                    placeholder="5.00"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  Original price
                  <input
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                    placeholder="10.00"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Quantity <RequiredMark />
                  </span>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                    placeholder="3"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Pickup date <RequiredMark />
                  </span>
                  <input
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    type="date"
                    min={getTbilisiDateKey()}
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Pickup start <RequiredMark />
                  </span>
                  <input
                    value={pickupStart}
                    onChange={(e) => setPickupStart(e.target.value)}
                    type="time"
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700">
                  <span>
                    Pickup end <RequiredMark />
                  </span>
                  <input
                    value={pickupEnd}
                    onChange={(e) => setPickupEnd(e.target.value)}
                    type="time"
                    className="min-h-12 rounded-2xl border p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-gray-700 md:col-span-2">
                  Offer image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleImageFileChange}
                    className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 file:mr-4 file:rounded-full file:border-0 file:bg-green-50 file:px-4 file:py-2 file:font-black file:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {[
                  t("businessOnboarding.titleHelper"),
                  t("businessOnboarding.quantityHelper"),
                  t("businessOnboarding.pickupWindowHelper"),
                ].map((helper) => (
                  <p
                    key={helper}
                    className="rounded-2xl bg-[#F7F6EF] px-4 py-3 text-sm font-semibold leading-6 text-gray-700"
                  >
                    ✓ {helper}
                  </p>
                ))}
              </div>

              <p className="mt-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold leading-6 text-yellow-900">
                {t("businessOnboarding.offerValidationHint")}
              </p>

              {imageFile && (
                <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                  {t("businessDashboard.selectedImage")}: {imageFile.name}
                </p>
              )}

              <button
                onClick={createOffer}
                disabled={publishing}
                className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-4"
              >
                {publishing
                  ? t("businessDashboard.publishing")
                  : t("businessDashboard.createOfferButton")}
              </button>
            </>
          ) : (
            <div className="mt-6 rounded-2xl bg-yellow-50 p-5 font-bold text-yellow-800">
              {businessStatusMessage}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Offer History
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t("businessDashboard.myOffers")}</h2>

          <div className="mt-6 grid gap-4">
            {offers.length === 0 && (
              <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/60 p-6 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
                  +
                </div>
                <h3 className="mt-4 text-2xl font-black text-gray-950">
                  {t("businessDashboard.noOffers")}
                </h3>
                <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
                  {t("businessDashboard.noOffersHint")}
                </p>
                <a
                  href="#create-offer"
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800"
                >
                  {t("businessDashboard.createFirstOffer")}
                </a>
              </div>
            )}

            {offers.map((offer) => {
              const statusLabel = getOfferStatusLabel(offer, language);
              const statusClass = getOfferStatusClassName(offer);
              const rating = ratingSummaries[offer.business_id];
              const isEditing = editingOfferId === offer.id;
              const effectiveStatus = getEffectiveOfferStatus(offer);

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
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            {normalizeOfferCategory(offer.category)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <p className="font-medium text-gray-700">
                          {formatMoney(offer.price)} · Quantity: {offer.quantity}
                        </p>
                        <p className="text-gray-600">
                          {t("common.pickup")}: {formatPickupWindow(offer, language)}
                        </p>
                        <p className="text-sm font-bold text-yellow-700">
                          ⭐ {getRatingLabel(rating, language)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-500">
                          {t("businessDashboard.created")}:{" "}
                          {formatDisplayDateTime(offer.created_at, language)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
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
                          ? "Deactivate"
                          : "Reactivate"}
                      </button>

                      <button
                        onClick={() => void duplicateOffer(offer)}
                        disabled={updatingOfferId !== null}
                        className="min-h-12 rounded-full border border-green-200 bg-white px-5 py-3 font-black text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingOfferId === offer.id
                          ? "Working..."
                          : "Duplicate"}
                      </button>

                      {effectiveStatus === "expired" && (
                        <button
                          onClick={() => void archiveExpiredOffer(offer)}
                          disabled={updatingOfferId !== null}
                          className="min-h-12 rounded-full bg-yellow-500 px-5 py-3 font-black text-yellow-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingOfferId === offer.id
                            ? "Archiving..."
                            : "Archive"}
                        </button>
                      )}

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
                          maxLength={120}
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          aria-label="Offer title"
                          placeholder="Bakery Surprise Bag"
                        />

                        <select
                          value={editCategory}
                          onChange={(event) =>
                            setEditCategory(
                              normalizeOfferCategory(event.target.value)
                            )
                          }
                          required
                          aria-label="Offer category"
                          className="min-h-12 rounded-2xl border bg-white p-4 font-semibold"
                        >
                          {OFFER_CATEGORIES.map((offerCategory) => (
                            <option key={offerCategory} value={offerCategory}>
                              {offerCategory}
                            </option>
                          ))}
                        </select>

                        <input
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          className="rounded-2xl border bg-white p-4 font-semibold"
                          aria-label="Offer price"
                          placeholder="5.00"
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
                          aria-label="Original price"
                          placeholder="10.00"
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
                          aria-label="Quantity"
                          placeholder="3"
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

        <div
          id="reservations"
          className="mt-6 scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8"
        >
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Pickup Operations
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t("businessDashboard.reservations")}
          </h2>

          <div className="mt-5 rounded-2xl bg-green-50 p-4 sm:p-5">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("businessOnboarding.reservationGuidanceTitle")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                t("businessOnboarding.reservationGuidanceText"),
                t("businessOnboarding.pickupStepAskCode"),
                t("businessOnboarding.pickupStepEnterCode"),
                t("businessOnboarding.pickupStepComplete"),
              ].map((step) => (
                <span
                  key={step}
                  className="rounded-full bg-white px-4 py-2 text-sm font-black leading-6 text-green-900"
                >
                  ✓ {step}
                </span>
              ))}
            </div>
          </div>

          {orders.length > 0 && (
            <div className="mt-6 rounded-3xl border border-green-100 bg-green-50/60 p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-700">
                    {t("businessDashboard.reservationSummary")}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-gray-950">
                    {t("businessDashboard.totalReservationsMetric")}:{" "}
                    {orders.length}
                  </h3>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {reservationSummary.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl p-4 shadow-sm ${item.className}`}
                  >
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="mt-2 text-3xl font-black">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <input
              value={reservationSearch}
              onChange={(event) => setReservationSearch(event.target.value)}
              className="min-h-12 rounded-2xl border bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              placeholder="Search customer email..."
              aria-label="Search reservations by customer email"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { value: "all", label: "All" },
              { value: "reserved", label: "Active" },
              { value: "collected", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "no_show", label: "No-show" },
            ].map((filter) => {
              const isActive = reservationFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
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
              <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/60 p-6 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
                  ✓
                </div>
                <h3 className="mt-4 text-2xl font-black text-gray-950">
                  {orders.length === 0
                    ? t("businessDashboard.noReservations")
                    : normalizedReservationSearch
                    ? "No reservations found"
                    : reservationFilter === "reserved"
                    ? "No active reservations"
                    : t("businessDashboard.noFilteredReservations")}
                </h3>
                <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
                  {orders.length === 0
                    ? t("businessDashboard.noReservationsHint")
                    : normalizedReservationSearch
                    ? "Try searching a different customer email."
                    : reservationFilter === "reserved"
                    ? "Completed, cancelled and no-show reservations are kept in history. Use the filters above to review them."
                    : t("businessDashboard.noFilteredReservationsHint")}
                </p>
              </div>
            )}

            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-5 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <h3 className="text-xl font-black sm:text-2xl">
                    {order.offers?.title || t("common.offerUnavailable")}
                  </h3>

                  <p className="mt-2 font-semibold text-gray-700">
                    {t("businessDashboard.customer")}:{" "}
                    {order.profiles?.email || t("common.unavailable")}
                  </p>

                  <p className="mt-1 font-semibold text-gray-600">
                    {t("businessDashboard.created")}:{" "}
                    {formatDisplayDateTime(order.created_at, language)}
                  </p>

                  <p className="mt-1 font-black text-green-700">
                    {order.offers
                      ? formatMoney(order.offers.price)
                      : t("common.unavailable")}
                  </p>

                  <p className="mt-1 font-semibold text-gray-600">
                    {t("common.pickup")}:{" "}
                    {order.offers
                      ? formatPickupWindow(order.offers, language)
                      : t("orders.pickupUnavailable")}
                  </p>

                  <p className="mt-1 text-sm font-bold text-gray-500">
                    {t("businessDashboard.reliability")}:{" "}
                    {order.profiles?.reliability_score ?? t("common.unavailable")} ·{" "}
                    {order.profiles?.reliability_status || t("common.unavailable")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-black ${getOrderStatusClassName(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status, language)}
                    </span>

                    {isConfirmedOrderStatus(order.status) && (
                      <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-black text-gray-700">
                        Pickup code:{" "}
                        {order.pickup_code
                          ? `••••${String(order.pickup_code).slice(-2)}`
                          : "pending"}
                      </span>
                    )}
                  </div>

                  {isConfirmedOrderStatus(order.status) && (
                    <p className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-900">
                      Ask the customer for the full code, then use Verify &
                      Complete Pickup.
                    </p>
                  )}
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
                          : "Mark No-Show"}
                      </button>
                    )}

                    {!isOrderPastPickupEnd(order.offers) && (
                      <button
                        onClick={() => openPickupVerification(order)}
                        disabled={updatingOrderId !== null}
                        className="min-h-12 w-full rounded-full bg-green-700 px-5 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                      >
                        {updatingOrderId === order.id
                          ? "Completing..."
                          : "Verify & Complete Pickup"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {pickupVerificationOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 px-4 py-6 sm:py-10">
            <div className="mx-auto flex min-h-full max-w-lg items-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pickup-verification-title"
                className="w-full rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-green-700">
                      Pickup Operations
                    </p>
                    <h3
                      id="pickup-verification-title"
                      className="mt-2 text-2xl font-black text-gray-950"
                    >
                      Verify Customer Pickup Code
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closePickupVerification}
                    disabled={updatingOrderId !== null}
                    aria-label="Close pickup verification"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-black text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 rounded-3xl bg-[#F7F6EF] p-4">
                  <p className="text-lg font-black text-gray-950">
                    {pickupVerificationOrder.offers?.title ||
                      t("common.offerUnavailable")}
                  </p>
                  <p className="mt-2 font-semibold text-gray-700">
                    {t("businessDashboard.customer")}:{" "}
                    {pickupVerificationOrder.profiles?.email ||
                      t("common.unavailable")}
                  </p>
                  <p className="mt-1 font-semibold text-gray-600">
                    {t("common.pickup")}:{" "}
                    {pickupVerificationOrder.offers
                      ? formatPickupWindow(
                          pickupVerificationOrder.offers,
                          language
                        )
                      : t("orders.pickupUnavailable")}
                  </p>
                </div>

                <p className="mt-5 font-semibold leading-7 text-gray-700">
                  Ask the customer to show the pickup code from their Orders
                  page. Enter it here before handing over the order.
                </p>

                <label
                  htmlFor="pickup-verification-code"
                  className="mt-5 block text-sm font-black uppercase tracking-wide text-gray-600"
                >
                  Pickup Code
                </label>
                <input
                  id="pickup-verification-code"
                  value={pickupVerificationCode}
                  onChange={(event) => {
                    setPickupVerificationCode(event.target.value);
                    setPickupVerificationError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitPickupVerification();
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="mt-2 min-h-12 w-full rounded-2xl border bg-white p-4 font-mono text-2xl font-black tracking-widest text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  placeholder="123456"
                />

                {pickupVerificationError && (
                  <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">
                    {pickupVerificationError}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closePickupVerification}
                    disabled={updatingOrderId !== null}
                    className="min-h-12 rounded-full border border-green-200 bg-white px-6 py-3 font-black text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void submitPickupVerification()}
                    disabled={updatingOrderId !== null}
                    className="min-h-12 rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingOrderId === pickupVerificationOrder.id
                      ? "Completing..."
                      : "Verify & Complete Pickup"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Customer Feedback
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t("businessDashboard.businessReviews")}
          </h2>

          <p className="mt-2 font-semibold text-gray-600">
            ✓ {t("businessOnboarding.ratingsGuidanceText")}
          </p>

          <div className="mt-6 grid gap-4">
            {reviews.length === 0 && (
              <div className="rounded-3xl border border-dashed border-yellow-200 bg-yellow-50/70 p-6 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
                  ⭐
                </div>
                <h3 className="mt-4 text-2xl font-black text-gray-950">
                  {t("businessDashboard.noReviews")}
                </h3>
                <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
                  {t("businessDashboard.noReviewsHint")}
                </p>
                <a
                  href="#reservations"
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-yellow-500 px-6 py-3 font-black text-yellow-950 transition hover:bg-yellow-400"
                >
                  {t("businessDashboard.viewReservations")}
                </a>
              </div>
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
                    {formatDisplayDateTime(review.created_at, language)}
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
