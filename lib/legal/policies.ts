import {
  SUPPORT_EMAIL,
  type ContentSection,
  type Localized,
} from "@/lib/legal/shared";

// Short customer policies: /refund-policy and /pickup-policy. Same facts as the
// Terms (lib/legal/terms.ts, checked 7 Nov 2026):
// - cancel until 2 h before pickup_start, full refund (begin_customer_refund);
//   reserved later = no cancel, shown at checkout (components/CheckoutRules.tsx)
// - missed window = no_show at window end, no refund; the business may still
//   hand it over for 12 h and the code stays in Orders that long
//   (20261107110000_schedules_and_pickup_rules.sql)
// - reliability: +1 pickup, -2 cancel, -15 missed, < 50 blocked

export type PolicyContent = {
  badge: string;
  title: string;
  intro: string;
  sections: ContentSection[];
};

export const refundPolicyContent: Localized<PolicyContent> = {
  en: {
    badge: "Refunds",
    title: "Refunds and cancellations",
    intro:
      "In short: cancel up to 2 hours before pickup starts and you get all your money back. If you miss the pickup, you don't.",
    sections: [
      {
        id: "cancel",
        title: "Cancel in time, get a full refund",
        bullets: [
          "Cancel in Orders until 2 hours before the pickup window starts. Checkout shows the exact time before you pay.",
          "The full amount goes back to the card or account you paid with. TBC Bank processes the refund; when it appears depends on your bank.",
        ],
      },
      {
        id: "no-cancel",
        title: "When you can't cancel",
        bullets: [
          "In the last 2 hours before pickup starts, because the business is already preparing your box.",
          "If you reserve within those 2 hours, the reservation can't be cancelled. Checkout says so before you pay.",
        ],
      },
      {
        id: "missed",
        title: "Missed pickup",
        bullets: [
          "If you don't collect your order during the pickup window, it counts as a missed pickup and the payment isn't refunded.",
          "The business may still hand it over if you come later, but it doesn't have to.",
        ],
      },
      {
        id: "full-refund",
        title: "When you always get your money back",
        bullets: [
          `The business can't hand over your paid order. Write to ${SUPPORT_EMAIL} with your order details and we refund the full amount to the card or account you paid with.`,
          "Your payment went through after your reservation had already been released. This is refunded automatically.",
          "For any other problem with an order, write to us, and we'll resolve it with you and the business.",
        ],
      },
      {
        id: "withdrawal",
        title: "No 14-day withdrawal",
        paragraphs: [
          "Lunch Boxes are food that spoils quickly and is sold for a specific date, so the 14-day right of withdrawal for distance purchases doesn't apply to them. You can cancel as described above instead. This doesn't limit your other rights under Georgian consumer protection law.",
        ],
      },
    ],
  },
  ka: {
    badge: "თანხის დაბრუნება",
    title: "გაუქმება და თანხის დაბრუნება",
    intro:
      "მოკლედ: თუ ჯავშანს წაღების დაწყებამდე 2 საათით ადრე გააუქმებ, მთელი თანხა დაგიბრუნდება. თუ წაღებას გამოტოვებ, არ დაგიბრუნდება.",
    sections: [
      {
        id: "cancel",
        title: "დროული გაუქმება — სრული თანხა",
        bullets: [
          "ჯავშანი „შეკვეთებიდან“ გააუქმე წაღების დაწყებამდე არაუგვიანეს 2 საათისა. ზუსტ დროს გადახდამდე გაჩვენებთ.",
          "სრული თანხა დაგიბრუნდება იმ ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე. დაბრუნებას TBC ბანკი ამუშავებს, ასახვის დრო კი შენს ბანკზეა დამოკიდებული.",
        ],
      },
      {
        id: "no-cancel",
        title: "როდის ვერ გააუქმებ",
        bullets: [
          "წაღების დაწყებამდე ბოლო 2 საათში, რადგან ბიზნესი შენს ბოქსს უკვე ამზადებს.",
          "თუ ამ 2 საათში დაჯავშნი, ჯავშანი გაუქმებას არ ექვემდებარება. ამას გადახდამდე გაჩვენებთ.",
        ],
      },
      {
        id: "missed",
        title: "გამოტოვებული წაღება",
        bullets: [
          "თუ შეკვეთას წაღების დროს არ წაიღებ, ის გამოტოვებულ წაღებად ჩაითვლება და თანხა არ ბრუნდება.",
          "ბიზნესს შეუძლია ბოქსი მოგვიანებით მოსულსაც გადმოგცეს, მაგრამ ეს მისი ნებაა.",
        ],
      },
      {
        id: "full-refund",
        title: "როდის ბრუნდება თანხა ყოველთვის",
        bullets: [
          `ბიზნესმა გადახდილი შეკვეთა ვერ გადმოგცა. მოგვწერე ${SUPPORT_EMAIL}-ზე შეკვეთის დეტალებით და სრულ თანხას დაგიბრუნებთ იმ ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე.`,
          "გადახდა მას შემდეგ შესრულდა, რაც ჯავშნის ვადა უკვე გასული იყო. ასეთი თანხა ავტომატურად ბრუნდება.",
          "შეკვეთასთან დაკავშირებული სხვა პრობლემის შემთხვევაშიც მოგვწერე და საკითხს შენთან და ბიზნესთან ერთად მოვაგვარებთ.",
        ],
      },
      {
        id: "withdrawal",
        title: "14-დღიანი დაბრუნება არ ვრცელდება",
        paragraphs: [
          "ლანჩ ბოქსი სწრაფად მალფუჭებადი საკვებია, რომელიც კონკრეტული დღისთვის იყიდება, ამიტომ დისტანციური ნასყიდობისას უკან დაბრუნების 14-დღიანი უფლება მასზე არ ვრცელდება. სამაგიეროდ, ჯავშნის გაუქმება შეგიძლია ზემოთ აღწერილი წესით. ეს არ ზღუდავს შენს სხვა უფლებებს, რომლებიც საქართველოს მომხმარებელთა უფლებების დაცვის კანონმდებლობით გაქვს.",
        ],
      },
    ],
  },
};

export const pickupPolicyContent: Localized<PolicyContent> = {
  en: {
    badge: "Pickup",
    title: "Pickup rules",
    intro: "Collect your Lunch Box in person, at the business, during the pickup window.",
    sections: [
      {
        id: "when",
        title: "Where and when",
        bullets: [
          "The business's address and the pickup window are on the offer and in Orders.",
          "Orders are pickup only; there's no delivery.",
        ],
      },
      {
        id: "how",
        title: "How to collect",
        bullets: [
          "Open the order in the app and slide to collect in front of staff. The 6-digit pickup code is a backup if the slider can't be used.",
          "The slider works from 1 hour before the pickup window until the window ends. Slide only once the box is in your hands. If you slide by mistake, you can undo it within 2 minutes.",
          "After 5 wrong code entries, the order is locked for security. Write to us to unlock it.",
        ],
      },
      {
        id: "late",
        title: "If you're late",
        bullets: [
          "Once the pickup window ends, the order counts as a missed pickup and the payment isn't refunded.",
          "The business may still hand it over if you come later, but it doesn't have to. Your code stays in Orders for 12 hours for that.",
        ],
      },
      {
        id: "reliability",
        title: "Reliability score",
        bullets: [
          "Your score starts at 100: +1 for each pickup, −2 for each cancellation, −15 for each missed pickup. A late handover by the business takes the missed pickup back.",
          "Below 50, new reservations are blocked automatically. If you think this is a mistake, write to us and a person will review it.",
        ],
      },
      {
        id: "food",
        title: "Allergies and food safety",
        bullets: [
          "The exact contents aren't known in advance. If you have an allergy or dietary restriction, ask the business before eating.",
          "The business prepares and sells the food and is responsible for it.",
        ],
      },
    ],
  },
  ka: {
    badge: "წაღება",
    title: "წაღების წესები",
    intro: "ლანჩ ბოქსი თავად წაიღე ბიზნესიდან, წაღების დროს.",
    sections: [
      {
        id: "when",
        title: "სად და როდის",
        bullets: [
          "ბიზნესის მისამართი და წაღების დრო შეთავაზების გვერდზე და „შეკვეთებში“ წერია.",
          "შეკვეთა მხოლოდ წასაღებია, მიტანის სერვისი არ გვაქვს.",
        ],
      },
      {
        id: "how",
        title: "როგორ წაიღო",
        bullets: [
          "აპში გახსენი შეკვეთა და თანამშრომლის თვალწინ გადაასრიალე წაღების ღილაკი. 6-ნიშნა წაღების კოდი სარეზერვოა, თუ გადასრიალება ვერ ხერხდება.",
          "ღილაკი მუშაობს წაღების დაწყებამდე 1 საათით ადრე და წაღების დროის დასრულებამდე. გადაასრიალე მხოლოდ მაშინ, როცა ბოქსი უკვე ხელში გაქვს. შემთხვევით გადასრიალებას 2 წუთის განმავლობაში გააუქმებ.",
          "კოდის 5-ჯერ არასწორად შეყვანის შემდეგ შეკვეთა უსაფრთხოების მიზნით იბლოკება. განსაბლოკად მოგვწერე.",
        ],
      },
      {
        id: "late",
        title: "თუ აგვიანებ",
        bullets: [
          "წაღების დროის დასრულებისთანავე შეკვეთა გამოტოვებულ წაღებად ჩაითვლება და თანხა არ ბრუნდება.",
          "ბიზნესს შეუძლია ბოქსი მოგვიანებით მოსულსაც გადმოგცეს, მაგრამ ეს მისი ნებაა. ამისთვის კოდი „შეკვეთებში“ 12 საათის განმავლობაში ჩანს.",
        ],
      },
      {
        id: "reliability",
        title: "სანდოობის ქულა",
        bullets: [
          "ქულა 100-დან იწყება: ყოველი წაღება +1, ყოველი გაუქმება −2, ყოველი გამოტოვებული წაღება −15. თუ ბიზნესმა ბოქსი მოგვიანებით გადმოგცა, გამოტოვებული წაღება გეხსნება.",
          "50-ზე დაბლა ახალი ჯავშნები ავტომატურად იზღუდება. თუ ფიქრობ, რომ ეს შეცდომაა, მოგვწერე და საკითხს ადამიანი განიხილავს.",
        ],
      },
      {
        id: "food",
        title: "ალერგია და საკვების უვნებლობა",
        bullets: [
          "ზუსტი შემადგენლობა წინასწარ ცნობილი არ არის. ალერგიის ან კვებითი შეზღუდვის შემთხვევაში ჭამამდე ჰკითხე ბიზნესს.",
          "საკვებს ამზადებს და ყიდის ბიზნესი, რომელიც მასზე პასუხს აგებს.",
        ],
      },
    ],
  },
};
