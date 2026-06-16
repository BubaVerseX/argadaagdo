import type { Offer } from "@/lib/types";
import type { Language } from "@/lib/i18n";

export type OfferLifecycleStatus =
  | "active"
  | "sold_out"
  | "expired"
  | "inactive";

export type OfferGroup = "today" | "tomorrow" | "upcoming";

export type RatingSummary = {
  business_id: number;
  average_rating: number;
  rating_count: number;
};

type OfferTiming = {
  pickup_date?: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
};

const TBILISI_TIME_ZONE = "Asia/Tbilisi";

function getTbilisiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TBILISI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value || "1970",
    month: parts.find((part) => part.type === "month")?.value || "01",
    day: parts.find((part) => part.type === "day")?.value || "01",
  };
}

export function getTbilisiDateKey(date = new Date()) {
  const parts = getTbilisiDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getTomorrowDateKey() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return getTbilisiDateKey(now);
}

function getTbilisiDateTimeKey(date = new Date()) {
  const dateParts = getTbilisiDateParts(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TBILISI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = timeParts.find((part) => part.type === "hour")?.value || "00";
  const minute = timeParts.find((part) => part.type === "minute")?.value || "00";

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${hour}:${minute}`;
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, 5);
}

export function getOfferDateKey(offer: OfferTiming) {
  return offer.pickup_date || getTbilisiDateKey();
}

export function getOfferEndKey(offer: OfferTiming) {
  return `${getOfferDateKey(offer)}T${normalizeTime(offer.pickup_end, "23:59")}`;
}

export function getOfferStartKey(offer: OfferTiming) {
  return `${getOfferDateKey(offer)}T${normalizeTime(offer.pickup_start, "00:00")}`;
}

export function getEffectiveOfferStatus(offer: Offer): OfferLifecycleStatus {
  if (offer.status === "inactive") return "inactive";
  if (offer.status === "expired") return "expired";
  if (getOfferEndKey(offer) < getTbilisiDateTimeKey()) return "expired";
  if (offer.status === "sold_out" || Number(offer.quantity || 0) <= 0) {
    return "sold_out";
  }
  if (offer.active && (!offer.status || offer.status === "active")) return "active";
  return "inactive";
}

export function isOfferReservable(offer: Offer) {
  return getEffectiveOfferStatus(offer) === "active";
}

export function getOfferStatusLabel(offer: Offer, language: Language = "en") {
  const status = getEffectiveOfferStatus(offer);
  if (status === "active") return language === "ka" ? "აქტიური" : "Active";
  if (status === "sold_out") return language === "ka" ? "გაყიდულია" : "Sold out";
  if (status === "expired") return language === "ka" ? "ვადაგასული" : "Expired";
  return language === "ka" ? "არააქტიური" : "Inactive";
}

export function getOfferStatusClassName(offer: Offer) {
  const status = getEffectiveOfferStatus(offer);
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "sold_out") return "bg-yellow-100 text-yellow-800";
  if (status === "expired") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export function getOfferDateLabel(offer: OfferTiming, language: Language = "en") {
  const offerDate = getOfferDateKey(offer);
  if (offerDate === getTbilisiDateKey()) {
    return language === "ka" ? "დღეს" : "Today";
  }
  if (offerDate === getTomorrowDateKey()) {
    return language === "ka" ? "ხვალ" : "Tomorrow";
  }
  return offerDate;
}

export function getOfferGroup(offer: Offer): OfferGroup {
  const offerDate = getOfferDateKey(offer);
  if (offerDate === getTbilisiDateKey()) return "today";
  if (offerDate === getTomorrowDateKey()) return "tomorrow";
  return "upcoming";
}

export function formatPickupWindow(offer: OfferTiming, language: Language = "en") {
  return `${getOfferDateLabel(offer, language)} · ${normalizeTime(
    offer.pickup_start,
    "--:--"
  )} - ${normalizeTime(offer.pickup_end, "--:--")}`;
}

export function isOrderPastPickupEnd(offer: OfferTiming | null | undefined) {
  if (!offer) return false;
  return getOfferEndKey(offer) < getTbilisiDateTimeKey();
}

export function getRatingLabel(
  summary: RatingSummary | undefined,
  language: Language = "en"
) {
  if (!summary || summary.rating_count <= 0) {
    return language === "ka" ? "შეფასებები ჯერ არ არის" : "No ratings yet";
  }
  return `${summary.average_rating.toFixed(1)} / 5 (${summary.rating_count})`;
}

export function compareMarketplaceOffers(
  firstOffer: Offer,
  secondOffer: Offer,
  ratingSummaries: Record<number, RatingSummary>
) {
  const firstActive = getEffectiveOfferStatus(firstOffer) === "active" ? 1 : 0;
  const secondActive = getEffectiveOfferStatus(secondOffer) === "active" ? 1 : 0;

  if (firstActive !== secondActive) return secondActive - firstActive;

  const firstRating = ratingSummaries[firstOffer.business_id]?.average_rating || 0;
  const secondRating = ratingSummaries[secondOffer.business_id]?.average_rating || 0;

  if (firstRating !== secondRating) return secondRating - firstRating;

  const pickupCompare = getOfferStartKey(firstOffer).localeCompare(
    getOfferStartKey(secondOffer)
  );

  if (pickupCompare !== 0) return pickupCompare;

  return secondOffer.id - firstOffer.id;
}
