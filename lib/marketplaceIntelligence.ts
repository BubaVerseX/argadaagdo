import {
  estimatedKgSavedPerBox,
  formatAnalyticsMoney,
} from "@/lib/analytics";
import {
  getEffectiveOfferStatus,
  getOfferStartKey,
  getTbilisiDateKey,
} from "@/lib/offerLifecycle";
import {
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import type { Offer, Order, Rating } from "@/lib/types";

type BadgeTone = "green" | "yellow" | "red" | "gray";
type RecommendationTone = "green" | "yellow" | "red";

export type InsightBadge = {
  label: string;
  tone: BadgeTone;
};

export type RecommendationCard = {
  title: string;
  text: string;
  tone: RecommendationTone;
};

export type OfferIntelligence = {
  offerId: number;
  timeUntilPickup: string;
  reservationPercentage: number;
  boxesRemaining: number;
  sellOutProbability: number;
  reservationSpeed: string;
  badges: InsightBadge[];
  recommendations: RecommendationCard[];
};

export type SummaryMetric = {
  title: string;
  value: number | string;
  helper: string;
  tone?: "green" | "yellow" | "red" | "white";
};

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function getTbilisiDate(value: string) {
  const date = new Date(`${value}:00+04:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getHoursUntilPickup(offer: Offer, now = new Date()) {
  const pickupStart = getTbilisiDate(getOfferStartKey(offer));
  if (!pickupStart) return null;
  return (pickupStart.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function getHoursSinceCreated(offer: Offer, now = new Date()) {
  if (!offer.created_at) return 1;
  const createdAt = new Date(offer.created_at);
  if (Number.isNaN(createdAt.getTime())) return 1;
  return Math.max(1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
}

function formatTimeUntilPickup(hours: number | null, status: string) {
  if (status === "expired") return "Pickup passed";
  if (hours === null) return "Pickup time unavailable";
  if (hours <= 0) return "Pickup window starting";
  if (hours < 1) return "Under 1 hour";
  if (hours < 24) return `${Math.round(hours)}h until pickup`;
  return `${Math.round(hours / 24)}d until pickup`;
}

function getReservationSpeedLabel(reservations: number, hoursSinceCreated: number) {
  if (reservations === 0) return "No reservations yet";
  const speed = reservations / Math.max(hoursSinceCreated, 1);
  if (speed >= 1) return `${speed.toFixed(1)} reservations/hour`;
  return `${(speed * 24).toFixed(1)} reservations/day`;
}

function calculateSellOutProbability({
  status,
  reservationPercentage,
  boxesRemaining,
  hoursUntilPickup,
  reservations,
  hoursSinceCreated,
}: {
  status: string;
  reservationPercentage: number;
  boxesRemaining: number;
  hoursUntilPickup: number | null;
  reservations: number;
  hoursSinceCreated: number;
}) {
  if (status === "sold_out") return 100;
  if (status !== "active") return 0;
  if (boxesRemaining <= 0) return 100;

  const speed = reservations / Math.max(hoursSinceCreated, 1);
  const timePressure =
    hoursUntilPickup === null ? 10 : clamp(40 - Math.max(hoursUntilPickup, 0) * 3);
  const speedScore = clamp(speed * 35);
  const inventoryPressure = boxesRemaining <= 2 ? 20 : boxesRemaining <= 5 ? 10 : 0;

  return clamp(
    Math.round(reservationPercentage * 0.55 + timePressure + speedScore + inventoryPressure)
  );
}

function getOfferBadges({
  status,
  reservationPercentage,
  boxesRemaining,
  sellOutProbability,
  hoursUntilPickup,
}: {
  status: string;
  reservationPercentage: number;
  boxesRemaining: number;
  sellOutProbability: number;
  hoursUntilPickup: number | null;
}): InsightBadge[] {
  const badges: InsightBadge[] = [];

  if (status === "expired") {
    badges.push({ label: "Archived", tone: "gray" });
    badges.push({ label: "Duplicate to reuse", tone: "yellow" });
    return badges;
  }

  if (status === "inactive") badges.push({ label: "Inactive", tone: "gray" });
  if (status === "sold_out") badges.push({ label: "Sold out", tone: "green" });
  if (status === "active") badges.push({ label: "Active", tone: "green" });
  if (boxesRemaining > 0 && boxesRemaining <= 3) {
    badges.push({ label: `${boxesRemaining} left`, tone: "yellow" });
  }
  if (reservationPercentage >= 75) {
    badges.push({ label: "Selling well", tone: "green" });
  }
  if (reservationPercentage <= 20 && status === "active") {
    badges.push({ label: "Needs attention", tone: "yellow" });
  }
  if (sellOutProbability >= 75) {
    badges.push({ label: "Likely to sell out", tone: "green" });
  }
  if (hoursUntilPickup !== null && hoursUntilPickup <= 2 && hoursUntilPickup > 0) {
    badges.push({ label: "Pickup soon", tone: "red" });
  }

  return badges.slice(0, 4);
}

function getOfferRecommendations({
  status,
  reservationPercentage,
  boxesRemaining,
  hoursUntilPickup,
  reservations,
}: {
  status: string;
  reservationPercentage: number;
  boxesRemaining: number;
  hoursUntilPickup: number | null;
  reservations: number;
}): RecommendationCard[] {
  if (status === "expired") {
    return [
      {
        title: "Create similar offer",
        text: "Duplicate this archived offer and choose a future pickup date.",
        tone: "yellow",
      },
    ];
  }

  if (status === "inactive") {
    return [
      {
        title: "Reactivate when ready",
        text: "This offer is hidden. Activate it only after checking quantity and pickup time.",
        tone: "yellow",
      },
    ];
  }

  const recommendations: RecommendationCard[] = [];

  if (reservationPercentage >= 80 && boxesRemaining <= 3) {
    recommendations.push({
      title: "Offer selling very well",
      text: "Next time, try slightly higher quantity if your surplus allows it.",
      tone: "green",
    });
  }

  if (reservationPercentage <= 20 && reservations === 0) {
    recommendations.push({
      title: "Offer selling slowly",
      text: "Publish earlier or use a clearer title like Bakery Surprise Bag.",
      tone: "yellow",
    });
  }

  if (hoursUntilPickup !== null && hoursUntilPickup <= 3 && boxesRemaining > 3) {
    recommendations.push({
      title: "Pickup window is close",
      text: "Consider extending the pickup window next time if food safety allows it.",
      tone: "yellow",
    });
  }

  if (reservationPercentage >= 60 && hoursUntilPickup !== null && hoursUntilPickup > 6) {
    recommendations.push({
      title: "Strong early demand",
      text: "This offer is performing well before pickup. Repeat this timing.",
      tone: "green",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Keep monitoring",
      text: "No urgent action. Watch reservations as pickup gets closer.",
      tone: "green",
    });
  }

  return recommendations.slice(0, 2);
}

export function buildOfferIntelligence(
  offers: Offer[],
  orders: Order[]
): Record<number, OfferIntelligence> {
  const now = new Date();

  return offers.reduce<Record<number, OfferIntelligence>>(
    (intelligenceMap, offer) => {
      const offerOrders = orders.filter((order) => order.offer_id === offer.id);
      const reservations = offerOrders.length;
      const boxesRemaining = toNumber(offer.quantity);
      const estimatedOriginalQuantity = Math.max(
        boxesRemaining + reservations,
        boxesRemaining,
        reservations,
        1
      );
      const reservationPercentage = Math.round(
        (reservations / estimatedOriginalQuantity) * 100
      );
      const status = getEffectiveOfferStatus(offer);
      const hoursUntilPickup = getHoursUntilPickup(offer, now);
      const hoursSinceCreated = getHoursSinceCreated(offer, now);
      const sellOutProbability = calculateSellOutProbability({
        status,
        reservationPercentage,
        boxesRemaining,
        hoursUntilPickup,
        reservations,
        hoursSinceCreated,
      });

      intelligenceMap[offer.id] = {
        offerId: offer.id,
        timeUntilPickup: formatTimeUntilPickup(hoursUntilPickup, status),
        reservationPercentage,
        boxesRemaining,
        sellOutProbability,
        reservationSpeed: getReservationSpeedLabel(
          reservations,
          hoursSinceCreated
        ),
        badges: getOfferBadges({
          status,
          reservationPercentage,
          boxesRemaining,
          sellOutProbability,
          hoursUntilPickup,
        }),
        recommendations: getOfferRecommendations({
          status,
          reservationPercentage,
          boxesRemaining,
          hoursUntilPickup,
          reservations,
        }),
      };

      return intelligenceMap;
    },
    {}
  );
}

export function buildBusinessRecommendations(
  offers: Offer[],
  offerIntelligenceById: Record<number, OfferIntelligence>
): RecommendationCard[] {
  const activeOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "active"
  );
  const archivedOffers = offers.filter(
    (offer) => getEffectiveOfferStatus(offer) === "expired"
  );
  const recommendations: RecommendationCard[] = [];
  const strongOffers = activeOffers.filter(
    (offer) => (offerIntelligenceById[offer.id]?.reservationPercentage || 0) >= 70
  );
  const slowOffers = activeOffers.filter(
    (offer) => (offerIntelligenceById[offer.id]?.reservationPercentage || 0) <= 20
  );

  if (activeOffers.length === 0) {
    recommendations.push({
      title: "Create an active offer",
      text: "Customers can only reserve active offers with future pickup windows.",
      tone: "yellow",
    });
  }

  if (strongOffers.length > 0) {
    recommendations.push({
      title: "Increase quantity carefully",
      text: `${strongOffers.length} offer ${
        strongOffers.length === 1 ? "is" : "are"
      } selling well. Repeat the timing and consider a few more boxes next time.`,
      tone: "green",
    });
  }

  if (slowOffers.length > 0) {
    recommendations.push({
      title: "Publish earlier",
      text: `${slowOffers.length} active offer ${
        slowOffers.length === 1 ? "has" : "have"
      } low reservations. Clearer titles and earlier publishing can help.`,
      tone: "yellow",
    });
  }

  if (archivedOffers.length > 0) {
    recommendations.push({
      title: "Reuse archived offers",
      text: "Duplicate expired offers to create similar future offers faster.",
      tone: "yellow",
    });
  }

  return recommendations.slice(0, 4);
}

export function buildBusinessDailySummary({
  offers,
  orders,
}: {
  offers: Offer[];
  orders: Order[];
}): SummaryMetric[] {
  const todayKey = getTbilisiDateKey();
  const todayOffers = offers.filter((offer) => offer.pickup_date === todayKey);
  const todayOfferIds = new Set(todayOffers.map((offer) => offer.id));
  const todayOrders = orders.filter((order) => todayOfferIds.has(order.offer_id));
  const revenueOrders = todayOrders.filter(
    (order) =>
      isConfirmedOrderStatus(order.status) ||
      isCollectedOrderStatus(order.status) ||
      order.status === "no_show"
  );
  const completed = todayOrders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const revenue = revenueOrders.reduce(
    (total, order) => total + toNumber(order.business_amount || order.amount),
    0
  );

  return [
    {
      title: "Reservations",
      value: todayOrders.length,
      helper: "Orders connected to today's pickup offers",
      tone: todayOrders.length > 0 ? "green" : "white",
    },
    {
      title: "Pickups",
      value: completed.length,
      helper: "Today's completed collections",
      tone: completed.length > 0 ? "green" : "white",
    },
    {
      title: "Revenue estimate",
      value: formatAnalyticsMoney(revenue),
      helper: "Estimated business revenue from today's active orders",
      tone: revenue > 0 ? "green" : "white",
    },
    {
      title: "Boxes saved",
      value: `${Math.round(revenueOrders.length * estimatedKgSavedPerBox * 10) / 10} kg`,
      helper: "Simple food rescue estimate based on reserved boxes",
      tone: revenueOrders.length > 0 ? "green" : "white",
    },
    {
      title: "Offers expiring",
      value: todayOffers.filter((offer) => getEffectiveOfferStatus(offer) === "active")
        .length,
      helper: "Active offers with pickup scheduled today",
      tone: todayOffers.length > 0 ? "yellow" : "white",
    },
  ];
}

export function buildBusinessWeeklySummary({
  orders,
  reviews,
}: {
  orders: Order[];
  reviews: Rating[];
}): SummaryMetric[] {
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
  weekStart.setHours(0, 0, 0, 0);
  const weekOrders = orders.filter((order) => {
    if (!order.created_at) return false;
    const createdAt = new Date(order.created_at);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= weekStart;
  });
  const completed = weekOrders.filter((order) =>
    isCollectedOrderStatus(order.status)
  );
  const cancelled = weekOrders.filter((order) =>
    isCancelledOrderStatus(order.status)
  );
  const revenue = weekOrders
    .filter(
      (order) =>
        isConfirmedOrderStatus(order.status) ||
        isCollectedOrderStatus(order.status) ||
        order.status === "no_show"
    )
    .reduce(
      (total, order) => total + toNumber(order.business_amount || order.amount),
      0
    );
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((total, review) => total + Number(review.rating), 0) /
          reviews.length
        ).toFixed(1)
      : "No ratings";

  return [
    {
      title: "Reservations",
      value: weekOrders.length,
      helper: "Reservations created this week",
      tone: weekOrders.length > 0 ? "green" : "white",
    },
    {
      title: "Completed",
      value: completed.length,
      helper: "Pickups completed this week",
      tone: completed.length > 0 ? "green" : "white",
    },
    {
      title: "Cancelled",
      value: cancelled.length,
      helper: "Cancelled or refunded orders this week",
      tone: cancelled.length > 0 ? "yellow" : "white",
    },
    {
      title: "Average Rating",
      value: averageRating,
      helper: "Current rating average from all reviews",
      tone: reviews.length > 0 ? "yellow" : "white",
    },
    {
      title: "Estimated Revenue",
      value: formatAnalyticsMoney(revenue),
      helper: "Estimated business revenue from this week's orders",
      tone: revenue > 0 ? "green" : "white",
    },
  ];
}
