import {
  formatMoney,
  getTbilisiDateKey,
  getTbilisiDateKeyFromValue,
} from "@/lib/offerLifecycle";
import {
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { platformFeeRate } from "@/lib/paymentArchitecture";
import type { Offer, Order, Rating } from "@/lib/types";

export const estimatedKgSavedPerBox = 0.6;

export type ChartDatum = {
  label: string;
  value: number;
};

export type OfferAnalytics = {
  offerId: number;
  reservations: number;
  remainingQuantity: number;
  completionRate: number;
  cancellationRate: number;
  estimatedRevenue: number;
  pickupSuccessRate: number;
};

type PerformanceSummary = {
  bestSellingOffer: string;
  worstSellingOffer: string;
  averageReservationLeadTime: string;
  mostActivePickupHour: string;
  mostPopularWeekday: string;
};

export type BusinessAnalyticsSummary = {
  todayReservations: number;
  thisWeekReservations: number;
  thisMonthReservations: number;
  completedPickups: number;
  cancelledOrders: number;
  noShowOrders: number;
  estimatedRevenue: number;
  estimatedPlatformFee: number;
  estimatedBusinessEarnings: number;
  estimatedFoodSavedKg: number;
  averageRating: string;
  boxesSold: number;
  boxesRemaining: number;
  performance: PerformanceSummary;
  reservationsOverTime: ChartDatum[];
  revenueOverTime: ChartDatum[];
  offerPopularity: ChartDatum[];
  offerAnalyticsById: Record<number, OfferAnalytics>;
};

export type MarketplaceAnalyticsSummary = {
  customers: number;
  businesses: number;
  offers: number;
  reservations: number;
  completedPickups: number;
  cancellationRate: number;
  averageRating: string;
  estimatedMarketplaceRevenue: number;
  estimatedBusinessRevenue: number;
  reservationsOverTime: ChartDatum[];
  revenueOverTime: ChartDatum[];
  offerPopularity: ChartDatum[];
};

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getOrderGrossAmount(order: Order) {
  return toNumber(order.amount) || toNumber(order.offers?.price);
}

function getBusinessAmount(order: Order) {
  const grossAmount = getOrderGrossAmount(order);
  return toNumber(order.business_amount) || grossAmount * (1 - platformFeeRate);
}

function getPlatformAmount(order: Order) {
  const grossAmount = getOrderGrossAmount(order);
  return toNumber(order.platform_fee) || grossAmount * platformFeeRate;
}

function isRevenueOrder(order: Order) {
  return (
    isConfirmedOrderStatus(order.status) ||
    isCollectedOrderStatus(order.status) ||
    order.status === "no_show"
  );
}

function getOrderDateKey(order: Order) {
  return getTbilisiDateKeyFromValue(order.created_at) || "Unknown";
}

function getWeekStart(date = new Date()) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function isThisWeek(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= getWeekStart();
}

function isThisMonth(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function toPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function topChartItems(map: Map<string, number>, limit = 7): ChartDatum[] {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function timeSeriesFromOrders(
  orders: Order[],
  getValue: (order: Order) => number
) {
  const totals = new Map<string, number>();

  orders.forEach((order) => {
    const key = getOrderDateKey(order);
    totals.set(key, (totals.get(key) || 0) + getValue(order));
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-7);
}

function getWeekdayFromPickupDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00+04:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
}

function getPickupHour(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 2);
}

function getAverageLeadTime(orders: Order[]) {
  const leadHours = orders
    .map((order) => {
      if (!order.created_at || !order.offers?.pickup_date || !order.offers?.pickup_start) {
        return null;
      }

      const createdAt = new Date(order.created_at);
      const pickupAt = new Date(
        `${order.offers.pickup_date}T${order.offers.pickup_start.slice(0, 5)}:00+04:00`
      );

      if (
        Number.isNaN(createdAt.getTime()) ||
        Number.isNaN(pickupAt.getTime())
      ) {
        return null;
      }

      return Math.max(
        0,
        (pickupAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      );
    })
    .filter((value): value is number => value !== null);

  if (leadHours.length === 0) return "Not enough data";

  const average =
    leadHours.reduce((total, value) => total + value, 0) / leadHours.length;

  if (average < 1) return "Under 1 hour before pickup";
  return `${Math.round(average)} hours before pickup`;
}

function getPerformanceSummary(
  offers: Offer[],
  orders: Order[]
): PerformanceSummary {
  const ordersByOffer = new Map<number, number>();
  const pickupHours = new Map<string, number>();
  const weekdays = new Map<string, number>();

  orders.forEach((order) => {
    ordersByOffer.set(order.offer_id, (ordersByOffer.get(order.offer_id) || 0) + 1);

    const hour = getPickupHour(order.offers?.pickup_start);
    if (hour) pickupHours.set(`${hour}:00`, (pickupHours.get(`${hour}:00`) || 0) + 1);

    const weekday = getWeekdayFromPickupDate(order.offers?.pickup_date);
    if (weekday) weekdays.set(weekday, (weekdays.get(weekday) || 0) + 1);
  });

  const rankedOffers = offers
    .map((offer) => ({
      title: offer.title,
      reservations: ordersByOffer.get(offer.id) || 0,
    }))
    .sort((a, b) => b.reservations - a.reservations);

  const bestSellingOffer = rankedOffers[0]?.reservations
    ? `${rankedOffers[0].title} (${rankedOffers[0].reservations})`
    : "Not enough data";
  const worstSellingOffer =
    rankedOffers.length > 0
      ? `${rankedOffers[rankedOffers.length - 1].title} (${
          rankedOffers[rankedOffers.length - 1].reservations
        })`
      : "Not enough data";
  const mostActivePickupHour =
    topChartItems(pickupHours, 1)[0]?.label || "Not enough data";
  const mostPopularWeekday =
    topChartItems(weekdays, 1)[0]?.label || "Not enough data";

  return {
    bestSellingOffer,
    worstSellingOffer,
    averageReservationLeadTime: getAverageLeadTime(orders),
    mostActivePickupHour,
    mostPopularWeekday,
  };
}

export function calculateOfferAnalytics(
  offers: Offer[],
  orders: Order[]
): Record<number, OfferAnalytics> {
  return offers.reduce<Record<number, OfferAnalytics>>((analyticsMap, offer) => {
    const offerOrders = orders.filter((order) => order.offer_id === offer.id);
    const completedOrders = offerOrders.filter((order) =>
      isCollectedOrderStatus(order.status)
    );
    const cancelledOrders = offerOrders.filter((order) =>
      isCancelledOrderStatus(order.status)
    );
    const revenueOrders = offerOrders.filter(isRevenueOrder);

    analyticsMap[offer.id] = {
      offerId: offer.id,
      reservations: offerOrders.length,
      remainingQuantity: Number(offer.quantity || 0),
      completionRate: toPercentage(completedOrders.length, offerOrders.length),
      cancellationRate: toPercentage(cancelledOrders.length, offerOrders.length),
      estimatedRevenue: revenueOrders.reduce(
        (total, order) => total + getBusinessAmount(order),
        0
      ),
      pickupSuccessRate: toPercentage(completedOrders.length, offerOrders.length),
    };

    return analyticsMap;
  }, {});
}

export function calculateBusinessAnalytics({
  offers,
  orders,
  reviews,
}: {
  offers: Offer[];
  orders: Order[];
  reviews: Rating[];
}): BusinessAnalyticsSummary {
  const todayKey = getTbilisiDateKey();
  const revenueOrders = orders.filter(isRevenueOrder);
  const completedPickups = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter((order) =>
    isCancelledOrderStatus(order.status)
  );
  const noShowOrders = orders.filter((order) => order.status === "no_show");
  const boxesSold = revenueOrders.length;
  const estimatedRevenue = revenueOrders.reduce(
    (total, order) => total + getOrderGrossAmount(order),
    0
  );
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((total, review) => total + Number(review.rating), 0) /
          reviews.length
        ).toFixed(1)
      : "No ratings yet";
  const offerAnalyticsById = calculateOfferAnalytics(offers, orders);
  const offerPopularityMap = new Map(
    offers.map((offer) => [
      offer.title,
      offerAnalyticsById[offer.id]?.reservations || 0,
    ])
  );

  return {
    todayReservations: orders.filter(
      (order) => order.offers?.pickup_date === todayKey
    ).length,
    thisWeekReservations: orders.filter((order) => isThisWeek(order.created_at))
      .length,
    thisMonthReservations: orders.filter((order) =>
      isThisMonth(order.created_at)
    ).length,
    completedPickups: completedPickups.length,
    cancelledOrders: cancelledOrders.length,
    noShowOrders: noShowOrders.length,
    estimatedRevenue,
    estimatedPlatformFee: revenueOrders.reduce(
      (total, order) => total + getPlatformAmount(order),
      0
    ),
    estimatedBusinessEarnings: revenueOrders.reduce(
      (total, order) => total + getBusinessAmount(order),
      0
    ),
    estimatedFoodSavedKg: Math.round(boxesSold * estimatedKgSavedPerBox * 10) / 10,
    averageRating,
    boxesSold,
    boxesRemaining: offers.reduce(
      (total, offer) => total + Number(offer.quantity || 0),
      0
    ),
    performance: getPerformanceSummary(offers, orders),
    reservationsOverTime: timeSeriesFromOrders(orders, () => 1),
    revenueOverTime: timeSeriesFromOrders(revenueOrders, getBusinessAmount),
    offerPopularity: topChartItems(offerPopularityMap, 5),
    offerAnalyticsById,
  };
}

export function calculateMarketplaceAnalytics({
  businessesCount,
  customersCount,
  offers,
  orders,
  ratings,
}: {
  businessesCount: number;
  customersCount: number;
  offers: Offer[];
  orders: Order[];
  ratings: Array<{ rating: number | string | null }>;
}): MarketplaceAnalyticsSummary {
  const completedPickups = orders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter((order) =>
    isCancelledOrderStatus(order.status)
  );
  const revenueOrders = orders.filter(isRevenueOrder);
  const averageRating =
    ratings.length > 0
      ? (
          ratings.reduce((total, rating) => total + toNumber(rating.rating), 0) /
          ratings.length
        ).toFixed(1)
      : "No ratings yet";
  const offerTitleById = new Map(offers.map((offer) => [offer.id, offer.title]));
  const popularityMap = new Map<string, number>();

  orders.forEach((order) => {
    const label = offerTitleById.get(order.offer_id) || `Offer #${order.offer_id}`;
    popularityMap.set(label, (popularityMap.get(label) || 0) + 1);
  });

  return {
    customers: customersCount,
    businesses: businessesCount,
    offers: offers.length,
    reservations: orders.length,
    completedPickups: completedPickups.length,
    cancellationRate: toPercentage(cancelledOrders.length, orders.length),
    averageRating,
    estimatedMarketplaceRevenue: revenueOrders.reduce(
      (total, order) => total + getPlatformAmount(order),
      0
    ),
    estimatedBusinessRevenue: revenueOrders.reduce(
      (total, order) => total + getBusinessAmount(order),
      0
    ),
    reservationsOverTime: timeSeriesFromOrders(orders, () => 1),
    revenueOverTime: timeSeriesFromOrders(revenueOrders, getOrderGrossAmount),
    offerPopularity: topChartItems(popularityMap, 7),
  };
}

export function buildCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escapeValue = (value: string | number | null) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  return [
    headers.map(escapeValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatAnalyticsMoney(value: number) {
  return formatMoney(Math.round(value * 100) / 100);
}
