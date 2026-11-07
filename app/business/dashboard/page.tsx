"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeBusinessScreen } from "@/components/native/screens";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { LoadingState } from "@/components/LoadingState";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { isSalesPausedToday } from "@/lib/greenBag";
import { BusinessQuickActions, type QuickPanel } from "@/components/business/BusinessQuickActions";
import { BusinessDashboardHero } from "@/components/business/BusinessDashboardHero";
import { BusinessHealthScore } from "@/components/business/BusinessHealthScore";
import { BusinessProfileSection } from "@/components/business/BusinessProfileSection";
import type { OpeningHours } from "@/types/business";
import { BusinessRevenueInsights } from "@/components/business/BusinessRevenueInsights";
import {
  RejectedBusinessCard,
  type BusinessDetailsDraft,
} from "@/components/business/RejectedBusinessCard";
import { BusinessReviews } from "@/components/business/BusinessReviews";
import {
  BagTemplatesPanel,
  type BagTemplateInput,
} from "@/components/business/BagTemplatesPanel";
import { DashboardSection } from "@/components/business/DashboardSection";
import { DepartmentsPanel } from "@/components/business/DepartmentsPanel";
import { ImpactReportSection } from "@/components/business/ImpactReportSection";
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
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  notifyOfferPublished,
  notifyPickupCompleted,
  notifyProfileUpdated,
} from "@/lib/notifications";
import {
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
  isFailedCheckoutOrder,
  isStrictlyCancelledOrderStatus,
} from "@/lib/orderStatus";
import {
  DEFAULT_BAG_SIZE,
  DEFAULT_OFFER_CATEGORY,
  normalizeBagSize,
  normalizeOfferCategory,
  type BagSize,
} from "@/lib/offerCategories";
import {
  getEffectiveOfferStatus,
  getTbilisiDateKey,
  getTomorrowDateKey,
  isOrderPastPickupEnd,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { logAppError } from "@/lib/errors";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { paginateItems } from "@/lib/pagination";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import type {
  BagTemplate,
  Business,
  Department,
  Offer,
  Order,
  Rating,
} from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { isWithinCooldown, validateTextField } from "@/lib/validation";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
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

const PICKUP_LOCKED_MESSAGE =
  "This order is locked after 5 wrong pickup codes. Contact ArGadaagdo support to unlock it.";

function BusinessDashboardPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";
  const [loading, setLoading] = useState(true);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [approvedBusinesses, setApprovedBusinesses] = useState<Business[]>([]);
  const [allOffers, setOffers] = useState<Offer[]>([]);
  const [allOrders, setOrders] = useState<Order[]>([]);
  const [allReviews, setReviews] = useState<Rating[]>([]);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<number[]>([]);
  const [ownedOfferIds, setOwnedOfferIds] = useState<number[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [bagTemplates, setBagTemplates] = useState<BagTemplate[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [departmentActionBusy, setDepartmentActionBusy] = useState(false);
  const [quickPanel, setQuickPanel] = useState<QuickPanel>(null);

  // The navbar links to sections by hash; open whatever holds them.
  useEffect(() => {
    function openHashTarget() {
      const { hash } = window.location;

      if (hash === "#business-reservations") setQuickPanel("collect");
      if (hash) {
        window.setTimeout(() => {
          const target = document.querySelector(hash);
          // Sections are closed <details>; open the one the link points at.
          if (target instanceof HTMLDetailsElement) target.open = true;
          target?.scrollIntoView();
        }, 0);
      }
    }

    // The sections exist only once the dashboard has loaded.
    if (loading) return;

    openHashTarget();
    window.addEventListener("hashchange", openHashTarget);

    return () => window.removeEventListener("hashchange", openHashTarget);
  }, [loading]);
  const [busyTemplateId, setBusyTemplateId] = useState<number | null>(null);
  const ensuredDefaultFor = useRef<Set<number>>(new Set());

  const [businessId, setBusinessId] = useState("");
  const [profileBusinessId, setProfileBusinessId] = useState<number | null>(
    null
  );
  const [profileName, setProfileName] = useState("");
  const [profileType, setProfileType] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileLogoUrl, setProfileLogoUrl] = useState("");
  const [profileCoverUrl, setProfileCoverUrl] = useState("");
  const [profileHours, setProfileHours] = useState<OpeningHours>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_OFFER_CATEGORY);
  const [size, setSize] = useState<BagSize>(DEFAULT_BAG_SIZE);
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pickupDate, setPickupDate] = useState(getTbilisiDateKey());
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const messageRef = useRef<HTMLDivElement>(null);
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
  const [editSize, setEditSize] = useState<BagSize>(DEFAULT_BAG_SIZE);
  const [editPrice, setEditPrice] = useState("");
  const [editOldPrice, setEditOldPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const editingOriginalQuantity = useRef<number | null>(null);
  const [editPickupDate, setEditPickupDate] = useState("");
  const [editPickupStart, setEditPickupStart] = useState("");
  const [editPickupEnd, setEditPickupEnd] = useState("");
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProfileSaveAt = useRef(0);
  const lastOfferPublishAt = useRef(0);

  // The message box sits near the top of a long page; bring errors and
  // warnings into view so a failed action doesn't look like nothing happened.
  useEffect(() => {
    if (!message || messageTone === "success") return;
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [message, messageTone]);

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

    // Every column of the owner's own businesses (other people can read only
    // the public profile columns, 20261107130100).
    const { data: myBusinesses, error: businessError } = await supabase.rpc("get_my_businesses");

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
      setProfileDescription(selectedProfileBusiness.description || "");
      setProfileLogoUrl(selectedProfileBusiness.logo_url || "");
      setProfileCoverUrl(selectedProfileBusiness.cover_url || "");
      setProfileHours(selectedProfileBusiness.opening_hours || {});
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
      setDepartments([]);
      setBagTemplates([]);
      setLoading(false);
      return;
    }

    // Every approved business gets a default department the first time its
    // dashboard opens; a small shop never has to think about departments.
    for (const business of approved) {
      if (ensuredDefaultFor.current.has(business.id)) continue;
      ensuredDefaultFor.current.add(business.id);
      const { error: ensureError } = await supabase.rpc("ensure_default_department", {
        p_business_id: business.id,
      });
      if (ensureError) {
        ensuredDefaultFor.current.delete(business.id);
        logAppError("Default department could not be ensured", ensureError, {
          operation: "ensure_default_department",
          businessId: business.id,
        });
      }
    }

    const [{ data: myDepartments, error: departmentError }, { data: myTemplates, error: templateError }] =
      await Promise.all([
        supabase
          .from("departments")
          .select("id, business_id, name, is_default, has_staff_pin, sales_paused_on, created_at")
          .in("business_id", businessIds)
          .order("is_default", { ascending: false })
          .order("id", { ascending: true }),
        supabase
          .from("bag_templates")
          .select("*")
          .in("business_id", businessIds)
          .order("id", { ascending: true }),
      ]);

    if (departmentError) {
      logAppError("Business dashboard failed to load departments", departmentError, {
        operation: "load_departments",
        businessIds,
      });
    }
    if (templateError) {
      logAppError("Business dashboard failed to load box templates", templateError, {
        operation: "load_bag_templates",
        businessIds,
      });
    }

    setDepartments(departmentError ? [] : ((myDepartments || []) as Department[]));
    setBagTemplates(templateError ? [] : ((myTemplates || []) as BagTemplate[]));

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
      const orderSelect = `
          ${ORDER_COLUMNS},
          offers(title, price, pickup_date, pickup_start, pickup_end, category, size),
          profiles(email, reliability_score, reliability_status)
        `;
      // Active reservations are always loaded in full — they're what staff
      // must verify at pickup — so a busy business's history can never push
      // another business's open reservations out of the capped history list.
      const [historyResult, activeResult] = await Promise.all([
        supabase
          .from("orders")
          .select(orderSelect)
          .in("offer_id", offerIds)
          .order("id", { ascending: false })
          .limit(1000),
        supabase
          .from("orders")
          .select(orderSelect)
          .in("offer_id", offerIds)
          .in("status", ["pending_payment", "reserved", "confirmed"])
          .order("id", { ascending: false }),
      ]);
      const orderError = historyResult.error || activeResult.error;
      const ordersById = new Map<number, Order>();

      for (const order of [
        ...((activeResult.data || []) as unknown as Order[]),
        ...((historyResult.data || []) as unknown as Order[]),
      ]) {
        ordersById.set(order.id, order);
      }

      const myOrders = [...ordersById.values()].sort((a, b) => b.id - a.id);

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

  function validateBusinessDetails(details: BusinessDetailsDraft) {
    const nameResult = validateTextField({
      label: isGeorgian ? "ბიზნესის სახელი" : "Business name",
      value: details.name,
      minLength: 2,
      maxLength: 80,
      language,
    });
    const typeResult = validateTextField({
      label: isGeorgian ? "ბიზნესის ტიპი" : "Business type",
      value: details.businessType,
      minLength: 2,
      maxLength: 60,
      language,
    });
    const addressResult = validateTextField({
      label: isGeorgian ? "მისამართი" : "Address",
      value: details.address,
      minLength: 5,
      maxLength: 160,
      language,
    });
    const phoneResult = validateTextField({
      label: isGeorgian ? "ტელეფონის ნომერი" : "Phone number",
      value: details.phone,
      minLength: 5,
      maxLength: 40,
      required: false,
      language,
    });

    return {
      nameResult,
      typeResult,
      addressResult,
      phoneResult,
      validationError:
        nameResult.error ||
        typeResult.error ||
        addressResult.error ||
        phoneResult.error,
    };
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

    // Right after switching business the form still holds the previous
    // business's details until the reload finishes — saving then would copy
    // them onto the newly selected business.
    if (profileBusinessId !== currentBusiness.id) {
      setMessageTone("warning");
      setMessage(
        "The selected business is still loading. Please wait a moment and try again."
      );
      return;
    }

    const {
      nameResult,
      typeResult,
      addressResult,
      phoneResult,
      validationError,
    } = validateBusinessDetails({
      name: profileName,
      businessType: profileType,
      address: profileAddress,
      phone: profilePhone,
    });

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSavingProfile(true);
    lastProfileSaveAt.current = actionTime;

    const { data: rows, error } = await supabase.rpc("update_my_business_profile", {
      p_business_id: currentBusiness.id,
      p_name: nameResult.value,
      p_business_type: typeResult.value,
      p_address: addressResult.value,
      p_phone: phoneResult.value || null,
      p_description: profileDescription.trim() || null,
      p_logo_url: profileLogoUrl || null,
      p_cover_url: profileCoverUrl || null,
      p_opening_hours: profileHours,
    });
    const data = Array.isArray(rows) ? rows[0] : rows;

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
    setProfileDescription(updatedBusiness.description || "");
    setProfileLogoUrl(updatedBusiness.logo_url || "");
    setProfileCoverUrl(updatedBusiness.cover_url || "");
    setProfileHours(updatedBusiness.opening_hours || {});
    setSavingProfile(false);
    setMessageTone("success");
    setMessage("Business profile updated.");
    notifyProfileUpdated({ businessName: updatedBusiness.name || "Business" });
  }

  async function uploadImage(businessId: number): Promise<string | null> {
    if (!imageFile) return "";

    const validationError = getImageValidationError(imageFile);

    if (validationError) {
      setMessageTone("error");
      setMessage(validationError);
      return null;
    }

    // One folder per business keeps each business's images together (easier
    // cleanup and per-business storage rules later).
    const fileName = `business-${businessId}/${createImageFileName(imageFile)}`;

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
      setMessage("Photo upload failed. Check your connection and try again.");
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("offer-images").getPublicUrl(fileName);

    return publicUrl;
  }

  // ---- Departments, "Today: no boxes", staff PINs -----------------------------

  async function uploadTemplateImage(file: File): Promise<string | null> {
    const selectedBusinessId = Number(businessId);
    const validationError = getImageValidationError(file);

    if (validationError || !selectedBusinessId) {
      setMessageTone("error");
      setMessage(validationError || "Choose a business first.");
      return null;
    }

    const fileName = `business-${selectedBusinessId}/${createImageFileName(file)}`;
    const { error } = await supabase.storage
      .from("offer-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
      logAppError("Template image upload failed", error, {
        operation: "upload_template_image",
        fileName,
      });
      setMessageTone("error");
      setMessage("Photo upload failed. Check your connection and try again.");
      return null;
    }

    return supabase.storage.from("offer-images").getPublicUrl(fileName).data.publicUrl;
  }

  async function setSalesPaused(departmentTarget: Department | null, paused: boolean) {
    const selectedBusinessId = Number(businessId);
    if (!selectedBusinessId || departmentActionBusy) return;

    setDepartmentActionBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("set_sales_paused", {
      p_business_id: selectedBusinessId,
      p_department_id: departmentTarget ? departmentTarget.id : null,
      p_paused: paused,
    });
    setDepartmentActionBusy(false);

    if (error) {
      logAppError("Sales pause update failed", error, {
        operation: "set_sales_paused",
        businessId: selectedBusinessId,
        departmentId: departmentTarget?.id ?? null,
      });
      setMessageTone("error");
      setMessage("Sales could not be updated. Please try again.");
      return;
    }

    void data;
    setMessageTone(paused ? "warning" : "success");
    setMessage(
      paused
        ? "No more boxes today. Unsold offers are off sale; reserved boxes stay and must be handed over or cancelled."
        : "Sales are back on. Paused offers are available again."
    );
    await loadDashboard();
  }

  async function addDepartment(name: string) {
    const selectedBusinessId = Number(businessId);
    if (!selectedBusinessId) return false;

    const nameResult = validateTextField({
      label: isGeorgian ? "დეპარტამენტის სახელი" : "Department name",
      value: name,
      minLength: 1,
      maxLength: 60,
      language,
    });

    if (nameResult.error) {
      setMessageTone("error");
      setMessage(nameResult.error);
      return false;
    }

    const { error } = await supabase.from("departments").insert({
      business_id: selectedBusinessId,
      name: nameResult.value,
      is_default: false,
    });

    if (error) {
      logAppError("Department creation failed", error, {
        operation: "create_department",
        businessId: selectedBusinessId,
      });
      setMessageTone("error");
      setMessage("Department could not be added. Please try again.");
      return false;
    }

    setMessageTone("success");
    setMessage("Department added.");
    await loadDashboard();
    return true;
  }

  async function deleteDepartment(department: Department) {
    if (department.is_default) return;

    const templateCount = bagTemplates.filter(
      (template) => template.department_id === department.id
    ).length;

    if (
      !window.confirm(
        isGeorgian
          ? `წაიშალოს დეპარტამენტი „${department.name}“? მისი ${templateCount} შაბლონიც წაიშლება; უკვე გამოქვეყნებული შეთავაზებები რჩება.`
          : `Delete department "${department.name}"? Its ${templateCount} template(s) are deleted too; already published offers stay.`
      )
    ) {
      return;
    }

    setDepartmentActionBusy(true);
    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", department.id)
      .in("business_id", ownedBusinessIds);
    setDepartmentActionBusy(false);

    if (error) {
      logAppError("Department deletion failed", error, {
        operation: "delete_department",
        departmentId: department.id,
      });
      setMessageTone("error");
      setMessage("Department could not be deleted. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Department deleted.");
    await loadDashboard();
  }

  async function setStaffPin(department: Department, pin: string | null) {
    setDepartmentActionBusy(true);
    const { error } = await supabase.rpc("set_department_staff_pin", {
      p_department_id: department.id,
      p_pin: pin,
    });
    setDepartmentActionBusy(false);

    if (error) {
      logAppError("Staff PIN update failed", error, {
        operation: "set_department_staff_pin",
        departmentId: department.id,
      });
      setMessageTone("error");
      setMessage(
        error.message.includes("4 to 8 digits")
          ? "The staff PIN must be 4 to 8 digits."
          : "The staff PIN could not be saved. Please try again."
      );
      return false;
    }

    setMessageTone("success");
    setMessage(pin ? "Staff PIN saved. Share the staff link with the department." : "Staff PIN removed.");
    await loadDashboard();
    return true;
  }

  async function resetStaffLockouts(department: Department) {
    setDepartmentActionBusy(true);
    const { data, error } = await supabase.rpc("reset_department_staff_lockouts", {
      p_department_id: department.id,
    });
    setDepartmentActionBusy(false);

    if (error) {
      logAppError("Staff lockout reset failed", error, {
        operation: "reset_department_staff_lockouts",
        departmentId: department.id,
      });
      setMessageTone("error");
      setMessage("Locked staff devices could not be reset. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage(Number(data || 0) > 0 ? "Locked staff devices were unlocked." : "No staff device was locked.");
  }

  // ---- Box templates ----------------------------------------------------------

  async function saveBagTemplate(input: BagTemplateInput, templateId: number | null) {
    if (!ownedBusinessIds.includes(input.business_id)) {
      setMessageTone("error");
      setMessage("You can only manage templates for your own business.");
      return false;
    }

    const query = templateId
      ? supabase.from("bag_templates").update(input).eq("id", templateId).in("business_id", ownedBusinessIds).select("id").maybeSingle()
      : supabase.from("bag_templates").insert(input).select("id").maybeSingle();
    const { data, error } = await query;

    if (error || !data) {
      logAppError("Box template save failed", error, {
        operation: templateId ? "update_bag_template" : "create_bag_template",
        businessId: input.business_id,
      });
      setMessageTone("error");
      setMessage("The template could not be saved. Please check the details and try again.");
      return false;
    }

    setMessageTone("success");
    setMessage(
      templateId
        ? "Template updated. The next box that goes live will use the new details."
        : "Template saved. It goes live automatically at its publish time; use \"Today\" to start now."
    );
    await loadDashboard();
    return true;
  }

  async function toggleTemplateActive(template: BagTemplate) {
    setBusyTemplateId(template.id);
    const { error } = await supabase
      .from("bag_templates")
      .update({ active: !template.active })
      .eq("id", template.id)
      .in("business_id", ownedBusinessIds);
    setBusyTemplateId(null);

    if (error) {
      logAppError("Box template toggle failed", error, {
        operation: "toggle_bag_template",
        templateId: template.id,
      });
      setMessageTone("error");
      setMessage("The template could not be updated. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage(template.active ? "Template paused. No new boxes will be created from it." : "Template resumed.");
    await loadDashboard();
  }

  async function deleteBagTemplate(template: BagTemplate) {
    if (
      !window.confirm(
        isGeorgian
          ? `წაიშალოს შაბლონი „${template.title}“? უკვე გამოქვეყნებული შეთავაზებები რჩება.`
          : `Delete template "${template.title}"? Already published offers stay.`
      )
    ) {
      return;
    }

    setBusyTemplateId(template.id);
    const { error } = await supabase
      .from("bag_templates")
      .delete()
      .eq("id", template.id)
      .in("business_id", ownedBusinessIds);
    setBusyTemplateId(null);

    if (error) {
      logAppError("Box template deletion failed", error, {
        operation: "delete_bag_template",
        templateId: template.id,
      });
      setMessageTone("error");
      setMessage("The template could not be deleted. Please try again.");
      return;
    }

    setMessageTone("success");
    setMessage("Template deleted.");
    await loadDashboard();
  }

  async function publishTemplateNow(template: BagTemplate, day: "today" | "tomorrow") {
    setBusyTemplateId(template.id);
    const targetDate = day === "today" ? getTbilisiDateKey() : getTomorrowDateKey();
    const { data, error } = await supabase.rpc("publish_bag_template_now", {
      p_template_id: template.id,
      p_date: targetDate,
    });
    setBusyTemplateId(null);

    if (error) {
      logAppError("Template publish failed", error, {
        operation: "publish_bag_template_now",
        templateId: template.id,
      });
      setMessageTone("error");
      setMessage("The box could not be published. Please try again.");
      return;
    }

    if (!data) {
      setMessageTone("warning");
      setMessage(
        day === "today"
          ? "Nothing published: today's box already exists, its pickup window has ended, this weekday is off, or sales are paused today."
          : "Nothing published: tomorrow's box already exists, or this weekday is off."
      );
      return;
    }

    setMessageTone("success");
    setMessage(day === "today" ? "Today's box is on sale." : "Tomorrow's box is published.");
    notifyOfferPublished({
      offerTitle: template.title,
      businessName: selectedBusiness?.name,
    });
    await loadDashboard();
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
      label: isGeorgian ? "შეთავაზების სათაური" : "Offer title",
      value: title,
      minLength: 3,
      maxLength: 120,
      language,
    });
    const descriptionResult = validateTextField({
      label: isGeorgian ? "აღწერა" : "Description",
      value: description,
      maxLength: 500,
      required: false,
      multiline: true,
      language,
    });

    if (titleResult.error) {
      setMessage(titleResult.error || "Add an offer title. Example: Bakery Lunch Box.");
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

    if (oldPriceValue !== null && oldPriceValue <= priceValue) {
      setMessage(
        "Original price must be higher than the discounted price, or leave it empty."
      );
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

    // The default date is computed when the page loads, so a tab left open
    // overnight would otherwise publish an already-expired offer.
    if (pickupDate < getTbilisiDateKey()) {
      setMessage("Pickup date cannot be in the past.");
      return;
    }

    if (
      isOrderPastPickupEnd({
        pickup_date: pickupDate,
        pickup_start: pickupStart,
        pickup_end: pickupEnd,
      })
    ) {
      setMessage("This pickup window has already ended. Choose a later time.");
      return;
    }

    setPublishing(true);
    lastOfferPublishAt.current = actionTime;
    setMessageTone("success");
    setMessage("Publishing offer...");

    const imageUrl = await uploadImage(selectedBusinessId);

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
      size,
      department_id: (() => {
        const businessDepartments = departments.filter(
          (department) => department.business_id === selectedBusinessId
        );
        const chosen =
          businessDepartments.find((department) => String(department.id) === departmentId) ||
          businessDepartments.find((department) => department.is_default) ||
          businessDepartments[0];
        return chosen ? chosen.id : null;
      })(),
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
    setSize(DEFAULT_BAG_SIZE);
    setPrice("");
    setOldPrice("");
    setQuantity("1");
    setPickupDate(getTbilisiDateKey());
    setPickupStart("");
    setPickupEnd("");
    setImageFile(null);
    // The browser kept showing the previous file name while imageFile was
    // already empty, so the next offer silently had no image.
    setImageInputKey((currentKey) => currentKey + 1);

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
    setEditSize(normalizeBagSize(offer.size) ?? DEFAULT_BAG_SIZE);
    setEditPrice(String(offer.price ?? ""));
    setEditOldPrice(offer.old_price ? String(offer.old_price) : "");
    setEditQuantity(String(offer.quantity ?? 0));
    editingOriginalQuantity.current = Number(offer.quantity ?? 0);
    setEditPickupDate(offer.pickup_date || getTbilisiDateKey());
    setEditPickupStart(offer.pickup_start || "");
    setEditPickupEnd(offer.pickup_end || "");
  }

  function cancelEditingOffer() {
    setEditingOfferId(null);
    setEditTitle("");
    setEditCategory(DEFAULT_OFFER_CATEGORY);
    setEditSize(DEFAULT_BAG_SIZE);
    setEditPrice("");
    setEditOldPrice("");
    setEditQuantity("");
    setEditPickupDate("");
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
      label: isGeorgian ? "შეთავაზების სათაური" : "Offer title",
      value: editTitle,
      minLength: 3,
      maxLength: 120,
      language,
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

    if (oldPriceValue !== null && oldPriceValue <= priceValue) {
      setMessage(
        "Original price must be higher than the discounted price, or leave it empty."
      );
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

    if (!editPickupDate) {
      setMessage("Pickup date is required.");
      return;
    }

    const pickupDateChanged = editPickupDate !== (offer.pickup_date || "");

    // Only validate "not in the past" when the window itself changes, so a
    // title fix on today's running offer is still possible.
    if (
      (pickupDateChanged ||
        editPickupStart !== (offer.pickup_start || "") ||
        editPickupEnd !== (offer.pickup_end || "")) &&
      isOrderPastPickupEnd({
        pickup_date: editPickupDate,
        pickup_start: editPickupStart,
        pickup_end: editPickupEnd,
      })
    ) {
      setMessage("This pickup window has already ended. Choose a later date or time.");
      return;
    }

    const pickupTimesChanged =
      pickupDateChanged ||
      editPickupStart !== (offer.pickup_start || "") ||
      editPickupEnd !== (offer.pickup_end || "");
    const hasActiveReservations = allOrders.some(
      (order) =>
        order.offer_id === offer.id &&
        ["pending_payment", "reserved", "confirmed"].includes(
          String(order.status)
        )
    );

    if (
      pickupTimesChanged &&
      hasActiveReservations &&
      !window.confirm(
        isGeorgian
          ? "ამ შეთავაზებას უკვე აქვს ჯავშნები. მომხმარებლებს თავდაპირველი წაღების დრო ეცნობათ და ცვლილების შესახებ ავტომატურად არ ეცნობებათ. მაინც შეცვლი წაღების დროს?"
          : "This offer already has reservations. Customers were told the original pickup time and are not notified automatically. Change the pickup time anyway?"
      )
    ) {
      return;
    }

    // Customers can reserve while this form is open, so only write the stock
    // when the business actually changed it — and only if it still matches
    // the value they started editing from. Otherwise a title fix would reset
    // the stock and oversell.
    const quantityChanged = quantityValue !== editingOriginalQuantity.current;
    const stockFields = quantityChanged
      ? (() => {
          const nextActive = quantityValue > 0 ? offer.active : false;
          return {
            quantity: quantityValue,
            active: nextActive,
            status:
              quantityValue <= 0
                ? "sold_out"
                : nextActive
                  ? "active"
                  : "inactive",
          };
        })()
      : {};

    setUpdatingOfferId(offer.id);

    let updateQuery = supabase
      .from("offers")
      .update({
        title: titleResult.value,
        category: selectedCategory,
        size: editSize,
        price: priceValue,
        old_price: oldPriceValue,
        pickup_date: editPickupDate,
        pickup_start: editPickupStart,
        pickup_end: editPickupEnd,
        ...stockFields,
      })
      .eq("id", offer.id)
      .in("business_id", ownedBusinessIds);

    if (quantityChanged && editingOriginalQuantity.current !== null) {
      updateQuery = updateQuery.eq("quantity", editingOriginalQuantity.current);
    }

    const { data, error } = await updateQuery.select("*").maybeSingle();

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
      setMessage(
        quantityChanged
          ? "New reservations came in while you were editing, so the quantity was not changed. Check the current quantity and try again."
          : "Offer could not be updated."
      );
      await loadDashboard();
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
      size: normalizeBagSize(offer.size),
      department_id: offer.department_id ?? null,
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
      isGeorgian
        ? "წაიშალოს ეს შეთავაზება სამუდამოდ? ჯავშნების მქონე შეთავაზებების წაშლა შეუძლებელია. ისტორიაში შესანახად გამოიყენე „არააქტიური“ სტატუსი."
        : "Delete this offer permanently? Offers with reservations cannot be deleted. Use Inactive for offers you want to keep in history."
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
      setMessage(
        "This offer could not be deleted. Offers that already have reservations can't be deleted — set it inactive instead."
      );
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

  async function completeOrder(
    orderId: number,
    pickupCodeValue: string
  ): Promise<boolean | "invalid_code" | "locked"> {
    const completedOrder = allOrders.find((order) => order.id === orderId);

    // Note: a customer who arrives a little late with the correct code must
    // still be completable — never turn a "Verify" click into a no-show.
    // Whether a late completion is allowed is decided by complete_pickup.

    if (!pickupCodeValue.trim()) {
      setMessageTone("error");
      setMessage("Pickup code required to complete an order.");
      return false;
    }

    setUpdatingOrderId(orderId);
    const { data: pickupResult, error } = await supabase.rpc("complete_pickup", {
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
      return error.message?.includes("Invalid pickup code") ? "invalid_code" : false;
    }

    // complete_pickup returns a result for wrong codes (so the failed-attempt
    // count is kept) and locks the order after 5 of them.
    if (pickupResult === "invalid_code" || pickupResult === "locked") {
      setUpdatingOrderId(null);
      setMessageTone("error");
      setMessage(
        pickupResult === "locked"
          ? PICKUP_LOCKED_MESSAGE
          : "Pickup could not be completed. Please check the pickup code and try again."
      );
      return pickupResult;
    }

    // Some versions of complete_pickup record a late pickup as a no-show
    // instead of raising, so confirm the outcome before reporting success or
    // emailing the customer.
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    const resultingStatus = (updatedOrder as { status?: string } | null)?.status;

    if (resultingStatus && !["completed", "collected"].includes(resultingStatus)) {
      setUpdatingOrderId(null);
      setMessageTone("warning");
      setMessage(
        "The pickup window had already ended, so this order could not be completed."
      );
      await loadDashboard();
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
    // Holding Enter in the code field would otherwise submit repeatedly.
    if (updatingOrderId !== null) return;

    // The code is checked by complete_pickup on the server; the dashboard
    // never sees the real code, so staff can only complete a pickup with the
    // code the customer shows them.
    const enteredCode = pickupVerificationCode.trim();

    if (!enteredCode) {
      setPickupVerificationError("Pickup code is required.");
      return;
    }

    setPickupVerificationError("");
    const completed = await completeOrder(pickupVerificationOrder.id, enteredCode);

    if (completed === "invalid_code") {
      setPickupVerificationError("Pickup code does not match.");
      return;
    }

    if (completed === "locked") {
      setPickupVerificationError(PICKUP_LOCKED_MESSAGE);
      return;
    }

    if (!completed) {
      // The page-level message sits behind this dialog, so repeat it here.
      setPickupVerificationError(
        "Pickup could not be completed. Check the code, or close this window to see the details."
      );
      return;
    }

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
      .channel(uniqueChannelName(`business-dashboard-offers-${businessFilter}`))
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
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "departments",
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

  const selectedBusiness =
    approvedBusinesses.find((business) => String(business.id) === businessId) ||
    approvedBusinesses[0] ||
    businesses[0];
  const selectedBusinessIdNumber = Number(businessId);
  const selectedDepartments = departments.filter(
    (department) => department.business_id === selectedBusinessIdNumber
  );
  const selectedTemplates = bagTemplates.filter(
    (template) => template.business_id === selectedBusinessIdNumber
  );
  // The one-off offer form points at a department of the selected business:
  // the owner's pick if it still belongs to this business, else the default.
  const effectiveDepartmentId = selectedDepartments.some(
    (department) => String(department.id) === departmentId
  )
    ? departmentId
    : String(
        (
          selectedDepartments.find((department) => department.is_default) ||
          selectedDepartments[0]
        )?.id ?? ""
      );
  const templateCountByDepartment = selectedTemplates.reduce<Record<number, number>>(
    (counts, template) => {
      if (template.department_id) {
        counts[template.department_id] = (counts[template.department_id] || 0) + 1;
      }
      return counts;
    },
    {}
  );
  // The header, stats, offers, reservations and reviews must all describe the
  // same business, so everything below is scoped to selectedBusiness.
  const selectedBusinessId = selectedBusiness?.id;
  const offers = allOffers.filter(
    (offer) => offer.business_id === selectedBusinessId
  );
  // Failed/abandoned checkouts (cancelled before payment, never given a
  // pickup code) aren't reservations — don't list or count them.
  const orders = allOrders.filter(
    (order) =>
      offers.some((offer) => offer.id === order.offer_id) &&
      !isFailedCheckoutOrder(order)
  );
  const reviews = allReviews.filter(
    (review) => review.business_id === selectedBusinessId
  );
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
  const dashboardBusinessName =
    selectedBusiness?.name || t("businessDashboard.businessOwner");
  const canCreateOffers = approvedBusinesses.length > 0;
  const rejectedBusinesses = businesses.filter(
    (business) => business.rejected_at
  );
  const businessStatusMessage =
    businesses.length === 0
      ? isGeorgian
        ? "ჯერ დაარეგისტრირე ბიზნესი."
        : "Register your business first."
      : isGeorgian
      ? "განაცხადი განხილვაშია."
      : "Your application is in review.";
  const collectedOrders = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const reservedOrders = orders.filter((order) =>
    isConfirmedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter((order) =>
    isStrictlyCancelledOrderStatus(order.status)
  );
  const noShowOrders = orders.filter((order) => order.status === "no_show");
  const businessAnalytics = calculateBusinessAnalytics({
    offers,
    orders,
    reviews,
  });
  const hasCompleteProfile = Boolean(
    profileName.trim() &&
      profileType.trim() &&
      profileAddress.trim() &&
      profileDescription.trim() &&
      profileLogoUrl &&
      Object.keys(profileHours).length > 0
  );
  const hasBusinessImage = offers.some((offer) => Boolean(offer.image_url));
  // Setup checklist: one short line each.
  const businessHealthChecks = [
    {
      label: isGeorgian ? "პროფილი შევსებულია" : "Profile complete",
      complete: hasCompleteProfile,
    },
    {
      label: isGeorgian ? "რუკაზე მონიშნულია" : "Pin on the map",
      complete: selectedBusiness?.latitude != null && selectedBusiness?.longitude != null,
    },
    {
      label: isGeorgian ? "სურათი ატვირთულია" : "Photo uploaded",
      complete: hasBusinessImage || bagTemplates.some((template) => Boolean(template.image_url)),
    },
    {
      label: isGeorgian ? "საკონტაქტო ტელეფონი" : "Contact phone",
      complete: Boolean(profilePhone.trim() || selectedBusiness?.phone),
    },
    {
      label: isGeorgian ? "პირველი ლანჩ ბოქსი" : "First bag published",
      complete: offers.length > 0,
    },
    {
      label: isGeorgian ? "პირველი გაცემა" : "First pickup",
      complete: collectedOrders.length > 0,
    },
  ];
  const completedHealthChecks = businessHealthChecks.filter((check) => check.complete).length;
  const reservationSummary = [
    {
      label: t("orders.reserved"),
      value: reservedOrders.length,
      className: "ui-card text-mint",
    },
    {
      label: t("orders.collected"),
      value: collectedOrders.length,
      className: "border border-warning-line bg-warning-soft text-cream",
    },
    {
      label: t("orders.cancelled"),
      value: cancelledOrders.length,
      className: "border border-danger-line bg-danger-soft text-cream",
    },
    {
      label: t("businessDashboard.noShow"),
      value: noShowOrders.length,
      className: "bg-well text-cream",
    },
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
        isStrictlyCancelledOrderStatus(order.status)) ||
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
            title={{ en: "Loading...", ka: "იტვირთება..." }}
            description={{ en: "", ka: "" }}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8 md:px-12">
        <BusinessDashboardHero
          t={t}
          businessName={dashboardBusinessName}
        />

        {message && (
          <div ref={messageRef} className="mt-4 scroll-mt-24">
            <Notice tone={messageTone}>
              {translateUserMessage(message, language)}
            </Notice>
          </div>
        )}

        {rejectedBusinesses.map((business) => (
          <RejectedBusinessCard
            key={business.id}
            business={business}
          />
        ))}

        {!canCreateOffers && rejectedBusinesses.length === 0 && (
          <p className="mt-4 rounded-2xl bg-warning-soft p-4 font-semibold text-warning">
            {businessStatusMessage}
          </p>
        )}

        {selectedBusiness && canCreateOffers && (
          <BusinessQuickActions
            activePanel={quickPanel}
            reservedCount={reservedOrders.length}
            salesPaused={isSalesPausedToday(selectedBusiness.sales_paused_on)}
            busy={departmentActionBusy}
            onSelectPanel={setQuickPanel}
            onToggleSales={() =>
              void setSalesPaused(
                null,
                !isSalesPausedToday(selectedBusiness.sales_paused_on)
              )
            }
          />
        )}

        {/* Kept mounted but hidden, so half-filled forms survive switching. */}
        <div hidden={quickPanel !== "publish"}>
          {selectedBusiness && canCreateOffers && (
            <BagTemplatesPanel
              language={language}
              business={selectedBusiness}
              departments={selectedDepartments}
              templates={selectedTemplates}
              busyTemplateId={busyTemplateId}
              onSave={saveBagTemplate}
              onToggleActive={(template) => void toggleTemplateActive(template)}
              onDelete={(template) => void deleteBagTemplate(template)}
              onPublishNow={(template, day) => void publishTemplateNow(template, day)}
              onUploadImage={uploadTemplateImage}
            />
          )}

          <details className="group mt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-1 font-semibold text-mint [&::-webkit-details-marker]:hidden">
              {isGeorgian ? "+ ერთჯერადი ლანჩ ბოქსი" : "+ One-off bag"}
            </summary>
            <OfferForm
              t={t}
              canCreateOffers={canCreateOffers}
              businessStatusMessage={businessStatusMessage}
              approvedBusinesses={approvedBusinesses}
              businessId={businessId}
              departments={selectedDepartments}
              departmentId={effectiveDepartmentId}
              onDepartmentIdChange={setDepartmentId}
              title={title}
              description={description}
              category={category}
              size={size}
              price={price}
              oldPrice={oldPrice}
              quantity={quantity}
              pickupDate={pickupDate}
              pickupStart={pickupStart}
              pickupEnd={pickupEnd}
              imageFile={imageFile}
              publishing={publishing}
              onBusinessIdChange={setBusinessId}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onCategoryChange={setCategory}
              onSizeChange={setSize}
              onPriceChange={setPrice}
              onOldPriceChange={setOldPrice}
              onQuantityChange={setQuantity}
              onPickupDateChange={setPickupDate}
              onPickupStartChange={setPickupStart}
              onPickupEndChange={setPickupEnd}
              onImageFileChange={handleImageFileChange}
              imageInputKey={imageInputKey}
              onCreateOffer={(actionTime) => void createOffer(actionTime)}
            />
          </details>
        </div>

        <div hidden={quickPanel !== "collect"}>
          <div id="business-reservations" className="scroll-mt-24">
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
          </div>
        </div>

        {pickupVerificationOrder && (
          <PickupVerificationModal
            t={t}
            language={language}
            order={pickupVerificationOrder}
            code={pickupVerificationCode}
            error={translateUserMessage(pickupVerificationError, language)}
            updatingOrderId={updatingOrderId}
            onCodeChange={(value) => {
              setPickupVerificationCode(value);
              setPickupVerificationError("");
            }}
            onClose={closePickupVerification}
            onSubmit={() => void submitPickupVerification()}
          />
        )}

        {/* Everything else: closed rows, one tap to open. */}
        <div className="mt-6">
          <DashboardSection
            id="business-offers"
            title={isGeorgian ? "შეთავაზებები" : "Offers"}
            meta={activeOffers.length > 0 ? activeOffers.length : undefined}
          >
            {offers.length > DASHBOARD_OFFER_PAGE_SIZE && (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <SearchBar
                  value={offerManagementSearch}
                  onChange={(value) => {
                    setOfferManagementSearch(value);
                    setOfferManagementPage(1);
                  }}
                  placeholder={isGeorgian ? "ძიება..." : "Search..."}
                  label={isGeorgian ? "შეთავაზებების ძიება" : "Search offers"}
                />
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { value: "active", label: isGeorgian ? "აქტიური" : "Active" },
                  { value: "sold_out", label: isGeorgian ? "გაყიდული" : "Sold out" },
                  { value: "inactive", label: isGeorgian ? "დამალული" : "Hidden" },
                  { value: "archive", label: isGeorgian ? "არქივი" : "Archive" },
                  { value: "all", label: isGeorgian ? "ყველა" : "All" },
                ] as Array<{ value: DashboardOfferFilter; label: string }>
              ).map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={offerManagementFilter === filter.value}
                  onClick={() => {
                    setOfferManagementFilter(filter.value);
                    setOfferManagementPage(1);
                  }}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    offerManagementFilter === filter.value
                      ? "ui-well text-mint"
                      : "ui-card text-body hover:text-mint"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <OfferList
              t={t}
              language={language}
              offers={paginatedManagedOffers.items}
              emptyTitle={
                offers.length === 0
                  ? undefined
                  : isGeorgian
                  ? "აქ არაფერია"
                  : "Nothing here"
              }
              ratingSummaries={ratingSummaries}
              offerAnalyticsById={businessAnalytics.offerAnalyticsById}
              editingOfferId={editingOfferId}
              updatingOfferId={updatingOfferId}
              editTitle={editTitle}
              editCategory={editCategory}
              editSize={editSize}
              editPrice={editPrice}
              editOldPrice={editOldPrice}
              editQuantity={editQuantity}
              editPickupDate={editPickupDate}
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
              onEditSizeChange={setEditSize}
              onEditPriceChange={setEditPrice}
              onEditOldPriceChange={setEditOldPrice}
              onEditQuantityChange={setEditQuantity}
              onEditPickupDateChange={setEditPickupDate}
              onEditPickupStartChange={setEditPickupStart}
              onEditPickupEndChange={setEditPickupEnd}
            />

            <Pagination
              className="mt-4"
              page={paginatedManagedOffers.page}
              totalItems={filteredManagedOffers.length}
              pageSize={DASHBOARD_OFFER_PAGE_SIZE}
              label={t("nav.offers")}
              onPageChange={setOfferManagementPage}
            />
          </DashboardSection>

          <DashboardSection
            id="business-stats"
            title={isGeorgian ? "სტატისტიკა" : "Stats"}
          >
            <div className="mt-3">
              <BusinessRevenueInsights
                analytics={businessAnalytics}
                onExportReservations={exportReservationsCsv}
                onExportCompletedPickups={exportCompletedPickupsCsv}
                onExportOfferStatistics={exportOfferStatisticsCsv}
              />
            </div>
          </DashboardSection>

          <DashboardSection
            id="business-reviews"
            title={isGeorgian ? "შეფასებები" : "Reviews"}
            meta={totalReviews > 0 ? `★ ${averageRating.toFixed(1)} · ${totalReviews}` : undefined}
          >
            <div className="mt-3">
              <BusinessReviews t={t} language={language} reviews={reviews} />
            </div>
          </DashboardSection>

          {selectedBusiness && (
            <DashboardSection
              id="business-impact-section"
              title={isGeorgian ? "გადარჩენილი საკვები" : "Food saved"}
            >
              <div className="mt-3">
                <ImpactReportSection
                  language={language}
                  businessId={selectedBusiness.id}
                  businessName={selectedBusiness.name}
                  orders={orders}
                />
              </div>
            </DashboardSection>
          )}

          {selectedBusiness && !selectedBusiness.rejected_at && (
            <DashboardSection
              id="business-profile"
              title={isGeorgian ? "პროფილი" : "Profile"}
              meta={`${completedHealthChecks}/${businessHealthChecks.length}`}
            >
              <div className="mt-3">
                <BusinessHealthScore checks={businessHealthChecks} />
              </div>
              <BusinessProfileSection
                businessId={selectedBusiness.id}
                profileName={profileName}
                profileType={profileType}
                profileAddress={profileAddress}
                profilePhone={profilePhone}
                profileDescription={profileDescription}
                profileLogoUrl={profileLogoUrl}
                profileCoverUrl={profileCoverUrl}
                profileHours={profileHours}
                savingProfile={savingProfile}
                onProfileNameChange={setProfileName}
                onProfileTypeChange={setProfileType}
                onProfileAddressChange={setProfileAddress}
                onProfilePhoneChange={setProfilePhone}
                onProfileDescriptionChange={setProfileDescription}
                onProfileLogoUrlChange={setProfileLogoUrl}
                onProfileCoverUrlChange={setProfileCoverUrl}
                onProfileHoursChange={setProfileHours}
                onUploadImage={uploadTemplateImage}
                onSave={(actionTime) => void saveBusinessProfile(actionTime)}
              />
            </DashboardSection>
          )}

          {selectedBusiness && canCreateOffers && (
            <DashboardSection
              id="business-departments-section"
              title={isGeorgian ? "თანამშრომლები" : "Staff"}
              meta={selectedDepartments.length > 1 ? selectedDepartments.length : undefined}
            >
              <div className="mt-3">
                <DepartmentsPanel
                  language={language}
                  business={selectedBusiness}
                  departments={selectedDepartments}
                  templateCountByDepartment={templateCountByDepartment}
                  busy={departmentActionBusy}
                  onToggleDepartmentPause={(department, paused) =>
                    void setSalesPaused(department, paused)
                  }
                  onAddDepartment={addDepartment}
                  onDeleteDepartment={(department) => void deleteDepartment(department)}
                  onSetStaffPin={setStaffPin}
                  onResetStaffLockouts={(department) => void resetStaffLockouts(department)}
                />
              </div>
            </DashboardSection>
          )}
        </div>
      </section>
    </main>
  );
}
export default withNativeScreen(BusinessDashboardPage, NativeBusinessScreen);
