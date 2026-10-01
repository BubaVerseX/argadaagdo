import {
  estimatedKgSavedPerBox,
  formatAnalyticsMoney,
} from "@/lib/analytics";
import type { Language } from "@/lib/i18n";
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

function formatTimeUntilPickup(
  hours: number | null,
  status: string,
  language: Language = "en"
) {
  const isGeorgian = language === "ka";

  if (status === "expired") {
    return isGeorgian ? "წაღების დრო გავიდა" : "Pickup passed";
  }
  if (hours === null) {
    return isGeorgian ? "წაღების დრო მიუწვდომელია" : "Pickup time unavailable";
  }
  if (hours <= 0) {
    return isGeorgian ? "წაღების ფანჯარა იწყება" : "Pickup window starting";
  }
  if (hours < 1) return isGeorgian ? "1 საათზე ნაკლები" : "Under 1 hour";
  if (hours < 24) {
    return isGeorgian
      ? `წაღებამდე ${Math.round(hours)} სთ`
      : `${Math.round(hours)}h until pickup`;
  }
  return isGeorgian
    ? `წაღებამდე ${Math.round(hours / 24)} დღე`
    : `${Math.round(hours / 24)}d until pickup`;
}

function getReservationSpeedLabel(
  reservations: number,
  hoursSinceCreated: number,
  language: Language = "en"
) {
  const isGeorgian = language === "ka";

  if (reservations === 0) {
    return isGeorgian ? "ჯავშნები ჯერ არ არის" : "No reservations yet";
  }
  const speed = reservations / Math.max(hoursSinceCreated, 1);
  if (speed >= 1) {
    return isGeorgian
      ? `${speed.toFixed(1)} ჯავშანი/სთ`
      : `${speed.toFixed(1)} reservations/hour`;
  }
  return isGeorgian
    ? `${(speed * 24).toFixed(1)} ჯავშანი/დღე`
    : `${(speed * 24).toFixed(1)} reservations/day`;
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

function getOfferBadges(
  {
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
  },
  language: Language = "en"
): InsightBadge[] {
  const isGeorgian = language === "ka";
  const badges: InsightBadge[] = [];

  if (status === "expired") {
    badges.push({ label: isGeorgian ? "დაარქივებული" : "Archived", tone: "gray" });
    badges.push({
      label: isGeorgian
        ? "ხელახლა გამოსაყენებლად შექმენი ასლი"
        : "Duplicate to reuse",
      tone: "yellow",
    });
    return badges;
  }

  if (status === "inactive") {
    badges.push({ label: isGeorgian ? "არააქტიური" : "Inactive", tone: "gray" });
  }
  if (status === "sold_out") {
    badges.push({ label: isGeorgian ? "გაყიდულია" : "Sold out", tone: "green" });
  }
  if (status === "active") {
    badges.push({ label: isGeorgian ? "აქტიური" : "Active", tone: "green" });
  }
  if (boxesRemaining > 0 && boxesRemaining <= 3) {
    badges.push({
      label: isGeorgian ? `დარჩა ${boxesRemaining}` : `${boxesRemaining} left`,
      tone: "yellow",
    });
  }
  if (reservationPercentage >= 75) {
    badges.push({
      label: isGeorgian ? "კარგად იყიდება" : "Selling well",
      tone: "green",
    });
  }
  if (reservationPercentage <= 20 && status === "active") {
    badges.push({
      label: isGeorgian ? "ყურადღებას საჭიროებს" : "Needs attention",
      tone: "yellow",
    });
  }
  if (sellOutProbability >= 75) {
    badges.push({
      label: isGeorgian ? "სავარაუდოდ გაიყიდება" : "Likely to sell out",
      tone: "green",
    });
  }
  if (hoursUntilPickup !== null && hoursUntilPickup <= 2 && hoursUntilPickup > 0) {
    badges.push({ label: isGeorgian ? "წაღება მალე" : "Pickup soon", tone: "red" });
  }

  return badges.slice(0, 4);
}

function getOfferRecommendations(
  {
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
  },
  language: Language = "en"
): RecommendationCard[] {
  const isGeorgian = language === "ka";

  if (status === "expired") {
    return [
      {
        title: isGeorgian ? "შექმენი მსგავსი შეთავაზება" : "Create similar offer",
        text: isGeorgian
          ? "შექმენი ამ დაარქივებული შეთავაზების ასლი და აირჩიე წაღების მომავალი თარიღი."
          : "Duplicate this archived offer and choose a future pickup date.",
        tone: "yellow",
      },
    ];
  }

  if (status === "inactive") {
    return [
      {
        title: isGeorgian
          ? "გაააქტიურე, როცა მზად იქნები"
          : "Reactivate when ready",
        text: isGeorgian
          ? "ეს შეთავაზება დამალულია. გაააქტიურე მხოლოდ რაოდენობისა და წაღების დროის შემოწმების შემდეგ."
          : "This offer is hidden. Activate it only after checking quantity and pickup time.",
        tone: "yellow",
      },
    ];
  }

  const recommendations: RecommendationCard[] = [];

  if (reservationPercentage >= 80 && boxesRemaining <= 3) {
    recommendations.push({
      title: isGeorgian
        ? "შეთავაზება ძალიან კარგად იყიდება"
        : "Offer selling very well",
      text: isGeorgian
        ? "შემდეგ ჯერზე სცადე ცოტა მეტი რაოდენობა, თუ ჭარბი საკვები ამის საშუალებას იძლევა."
        : "Next time, try slightly higher quantity if your surplus allows it.",
      tone: "green",
    });
  }

  if (reservationPercentage <= 20 && reservations === 0) {
    recommendations.push({
      title: isGeorgian ? "შეთავაზება ნელა იყიდება" : "Offer selling slowly",
      text: isGeorgian
        ? "გამოაქვეყნე უფრო ადრე ან გამოიყენე უფრო მკაფიო სათაური, მაგალითად „საცხობის სიურპრიზის ყუთი“."
        : "Publish earlier or use a clearer title like Bakery Surprise Bag.",
      tone: "yellow",
    });
  }

  if (hoursUntilPickup !== null && hoursUntilPickup <= 3 && boxesRemaining > 3) {
    recommendations.push({
      title: isGeorgian ? "წაღების ფანჯარა ახლოვდება" : "Pickup window is close",
      text: isGeorgian
        ? "შემდეგ ჯერზე განიხილე წაღების ფანჯრის გახანგრძლივება, თუ სურსათის უსაფრთხოება ამის საშუალებას იძლევა."
        : "Consider extending the pickup window next time if food safety allows it.",
      tone: "yellow",
    });
  }

  if (reservationPercentage >= 60 && hoursUntilPickup !== null && hoursUntilPickup > 6) {
    recommendations.push({
      title: isGeorgian ? "მაღალი ადრეული მოთხოვნა" : "Strong early demand",
      text: isGeorgian
        ? "ეს შეთავაზება წაღებამდე კარგ შედეგს აჩვენებს. გაიმეორე ეს დრო."
        : "This offer is performing well before pickup. Repeat this timing.",
      tone: "green",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: isGeorgian ? "განაგრძე დაკვირვება" : "Keep monitoring",
      text: isGeorgian
        ? "სასწრაფო მოქმედება საჭირო არ არის. თვალი ადევნე ჯავშნებს წაღების მოახლოებისას."
        : "No urgent action. Watch reservations as pickup gets closer.",
      tone: "green",
    });
  }

  return recommendations.slice(0, 2);
}

export function buildOfferIntelligence(
  offers: Offer[],
  orders: Order[],
  language: Language = "en"
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
        timeUntilPickup: formatTimeUntilPickup(hoursUntilPickup, status, language),
        reservationPercentage,
        boxesRemaining,
        sellOutProbability,
        reservationSpeed: getReservationSpeedLabel(
          reservations,
          hoursSinceCreated,
          language
        ),
        badges: getOfferBadges(
          {
            status,
            reservationPercentage,
            boxesRemaining,
            sellOutProbability,
            hoursUntilPickup,
          },
          language
        ),
        recommendations: getOfferRecommendations(
          {
            status,
            reservationPercentage,
            boxesRemaining,
            hoursUntilPickup,
            reservations,
          },
          language
        ),
      };

      return intelligenceMap;
    },
    {}
  );
}

export function buildBusinessRecommendations(
  offers: Offer[],
  offerIntelligenceById: Record<number, OfferIntelligence>,
  language: Language = "en"
): RecommendationCard[] {
  const isGeorgian = language === "ka";
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
      title: isGeorgian ? "შექმენი აქტიური შეთავაზება" : "Create an active offer",
      text: isGeorgian
        ? "მომხმარებლებს მხოლოდ მომავალი წაღების ფანჯრის მქონე აქტიური შეთავაზებების დაჯავშნა შეუძლიათ."
        : "Customers can only reserve active offers with future pickup windows.",
      tone: "yellow",
    });
  }

  if (strongOffers.length > 0) {
    recommendations.push({
      title: isGeorgian
        ? "რაოდენობა ფრთხილად გაზარდე"
        : "Increase quantity carefully",
      text: isGeorgian
        ? `${strongOffers.length} შეთავაზება კარგად იყიდება. გაიმეორე იგივე დრო და შემდეგ ჯერზე განიხილე რამდენიმე დამატებითი ყუთი.`
        : `${strongOffers.length} offer ${
            strongOffers.length === 1 ? "is" : "are"
          } selling well. Repeat the timing and consider a few more boxes next time.`,
      tone: "green",
    });
  }

  if (slowOffers.length > 0) {
    recommendations.push({
      title: isGeorgian ? "გამოაქვეყნე უფრო ადრე" : "Publish earlier",
      text: isGeorgian
        ? `${slowOffers.length} აქტიურ შეთავაზებას ცოტა ჯავშანი აქვს. უფრო მკაფიო სათაურები და ადრე გამოქვეყნება დაგეხმარება.`
        : `${slowOffers.length} active offer ${
            slowOffers.length === 1 ? "has" : "have"
          } low reservations. Clearer titles and earlier publishing can help.`,
      tone: "yellow",
    });
  }

  if (archivedOffers.length > 0) {
    recommendations.push({
      title: isGeorgian
        ? "ხელახლა გამოიყენე დაარქივებული შეთავაზებები"
        : "Reuse archived offers",
      text: isGeorgian
        ? "შექმენი ვადაგასული შეთავაზებების ასლები, რომ მსგავსი შეთავაზებები უფრო სწრაფად შექმნა."
        : "Duplicate expired offers to create similar future offers faster.",
      tone: "yellow",
    });
  }

  return recommendations.slice(0, 4);
}

export function buildBusinessDailySummary(
  {
    offers,
    orders,
  }: {
    offers: Offer[];
    orders: Order[];
  },
  language: Language = "en"
): SummaryMetric[] {
  const isGeorgian = language === "ka";
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
      title: isGeorgian ? "ჯავშნები" : "Reservations",
      value: todayOrders.length,
      helper: isGeorgian
        ? "დღევანდელი წაღების შეთავაზებებზე გაკეთებული შეკვეთები"
        : "Orders connected to today's pickup offers",
      tone: todayOrders.length > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "წაღებები" : "Pickups",
      value: completed.length,
      helper: isGeorgian
        ? "დღეს დასრულებული წაღებები"
        : "Today's completed collections",
      tone: completed.length > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "შემოსავლის შეფასება" : "Revenue estimate",
      value: formatAnalyticsMoney(revenue),
      helper: isGeorgian
        ? "ბიზნესის სავარაუდო შემოსავალი დღევანდელი აქტიური შეკვეთებიდან"
        : "Estimated business revenue from today's active orders",
      tone: revenue > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "გადარჩენილი ყუთები" : "Boxes saved",
      value: `${Math.round(revenueOrders.length * estimatedKgSavedPerBox * 10) / 10} ${
        isGeorgian ? "კგ" : "kg"
      }`,
      helper: isGeorgian
        ? "გადარჩენილი საკვების მარტივი შეფასება დაჯავშნილი ყუთების მიხედვით"
        : "Simple food rescue estimate based on reserved boxes",
      tone: revenueOrders.length > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "დღეს დასრულებადი შეთავაზებები" : "Offers expiring",
      value: todayOffers.filter((offer) => getEffectiveOfferStatus(offer) === "active")
        .length,
      helper: isGeorgian
        ? "აქტიური შეთავაზებები, რომელთა წაღებაც დღესაა დაგეგმილი"
        : "Active offers with pickup scheduled today",
      tone: todayOffers.length > 0 ? "yellow" : "white",
    },
  ];
}

export function buildBusinessWeeklySummary(
  {
    orders,
    reviews,
  }: {
    orders: Order[];
    reviews: Rating[];
  },
  language: Language = "en"
): SummaryMetric[] {
  const isGeorgian = language === "ka";
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
      : isGeorgian
      ? "შეფასებები არ არის"
      : "No ratings";

  return [
    {
      title: isGeorgian ? "ჯავშნები" : "Reservations",
      value: weekOrders.length,
      helper: isGeorgian
        ? "ამ კვირაში გაკეთებული ჯავშნები"
        : "Reservations created this week",
      tone: weekOrders.length > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "დასრულებული" : "Completed",
      value: completed.length,
      helper: isGeorgian
        ? "ამ კვირაში დასრულებული წაღებები"
        : "Pickups completed this week",
      tone: completed.length > 0 ? "green" : "white",
    },
    {
      title: isGeorgian ? "გაუქმებული" : "Cancelled",
      value: cancelled.length,
      helper: isGeorgian
        ? "ამ კვირაში გაუქმებული ან დაბრუნებული შეკვეთები"
        : "Cancelled or refunded orders this week",
      tone: cancelled.length > 0 ? "yellow" : "white",
    },
    {
      title: isGeorgian ? "საშუალო შეფასება" : "Average Rating",
      value: averageRating,
      helper: isGeorgian
        ? "ყველა შეფასების მიმდინარე საშუალო"
        : "Current rating average from all reviews",
      tone: reviews.length > 0 ? "yellow" : "white",
    },
    {
      title: isGeorgian ? "სავარაუდო შემოსავალი" : "Estimated Revenue",
      value: formatAnalyticsMoney(revenue),
      helper: isGeorgian
        ? "ბიზნესის სავარაუდო შემოსავალი ამ კვირის შეკვეთებიდან"
        : "Estimated business revenue from this week's orders",
      tone: revenue > 0 ? "green" : "white",
    },
  ];
}
