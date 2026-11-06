import { operatorSentence, type Localized } from "@/lib/legal/shared";

// Content for /contact and /support. The support address is SUPPORT_EMAIL in
// lib/legal/shared.ts (argadaagdo.ge mail isn't set up, see PROJECT_CONTEXT.md).

type Card = { title: string; text: string };

type ContactContent = {
  badge: string;
  title: string;
  intro: string;
  emailLabel: string;
  emailTitle: string;
  emailText: string;
  includeTitle: string;
  includeItems: string[];
  topics: Card[];
  responseLabel: string;
  responseTitle: string;
  responseText: string;
  areaLabel: string;
  areaTitle: string;
  areaText: string;
  footerTitle: string;
  footerText: string;
  faqLabel: string;
  helpCenterLabel: string;
};

export const contactContent: Localized<ContactContent> = {
  en: {
    badge: "Contact",
    title: "Contact us",
    intro: "Questions about an order, your account or selling on ArGadaagdo? Write to us.",
    emailLabel: "Email",
    emailTitle: "Write to our team",
    emailText: "Email is the fastest way to reach us.",
    includeTitle: "To help us answer faster, include:",
    includeItems: [
      "the email address of your account",
      "the order details (business, date and pickup time)",
      "a short description of what happened, with a screenshot if you have one",
    ],
    topics: [
      {
        title: "Orders and refunds",
        text: "Pickup problems, cancellations, refunds or an order the business couldn't hand over.",
      },
      {
        title: "Account and privacy",
        text: "Signing in, phone verification, a blocked account, or a request about your personal data.",
      },
      {
        title: "Businesses",
        text: "Joining ArGadaagdo, your application, payouts or your dashboard.",
      },
    ],
    responseLabel: "Response time",
    responseTitle: "1–2 business days",
    responseText: "We aim to reply to every message within 1–2 business days.",
    areaLabel: "Service area",
    areaTitle: "Tbilisi, Georgia",
    areaText: `ArGadaagdo currently operates in Tbilisi. Orders are pickup only. ${operatorSentence("en")}`,
    footerTitle: "Looking for a quick answer?",
    footerText: "Most questions are already answered in our FAQ and Help Center.",
    faqLabel: "FAQ",
    helpCenterLabel: "Help Center",
  },
  ka: {
    badge: "კონტაქტი",
    title: "დაგვიკავშირდი",
    intro: "გაქვს კითხვა შეკვეთაზე, ანგარიშზე ან ჩვენთან თანამშრომლობაზე? მოგვწერე.",
    emailLabel: "ელფოსტა",
    emailTitle: "მოგვწერე",
    emailText: "ელფოსტა ჩვენთან დაკავშირების ყველაზე სწრაფი გზაა.",
    includeTitle: "რომ უფრო სწრაფად გიპასუხოთ, მიუთითე:",
    includeItems: [
      "შენი ანგარიშის ელფოსტა",
      "შეკვეთის დეტალები (ბიზნესი, თარიღი და წაღების დრო)",
      "მოკლე აღწერა, რა მოხდა, და, თუ გაქვს, ეკრანის სურათი",
    ],
    topics: [
      {
        title: "შეკვეთები და თანხის დაბრუნება",
        text: "წაღებასთან დაკავშირებული პრობლემა, გაუქმება, თანხის დაბრუნება ან შეკვეთა, რომელიც ბიზნესმა ვერ გადმოგცა.",
      },
      {
        title: "ანგარიში და კონფიდენციალურობა",
        text: "ანგარიშზე შესვლა, ტელეფონის დადასტურება, შეზღუდული ანგარიში ან მოთხოვნა პერსონალურ მონაცემებზე.",
      },
      {
        title: "ბიზნესები",
        text: "პლატფორმასთან შემოერთება, განაცხადი, ანგარიშსწორება ან ბიზნეს პანელი.",
      },
    ],
    responseLabel: "პასუხის დრო",
    responseTitle: "1–2 სამუშაო დღე",
    responseText: "ვცდილობთ, ყველა წერილს 1–2 სამუშაო დღეში ვუპასუხოთ.",
    areaLabel: "მომსახურების არეალი",
    areaTitle: "თბილისი, საქართველო",
    areaText: `არ გადააგდო ამჟამად თბილისში მუშაობს. შეკვეთას თავად წაიღებ. ${operatorSentence("ka")}`,
    footerTitle: "სწრაფი პასუხი გჭირდება?",
    footerText: "კითხვების უმეტესობაზე პასუხს ხშირად დასმულ კითხვებსა და დახმარების ცენტრში იპოვი.",
    faqLabel: "ხშირი კითხვები",
    helpCenterLabel: "დახმარების ცენტრი",
  },
};

type SupportContent = {
  badge: string;
  title: string;
  intro: string;
  ordersCard: Card & { action: string };
  pickupCard: Card & { action: string };
  faqTitle: string;
  faqIntro: string;
  customersLabel: string;
  businessesLabel: string;
  contactTitle: string;
  contactText: string;
  urgentTitle: string;
  urgentText: string;
  moreTitle: string;
  moreText: string;
  openFaqLabel: string;
  contactPageLabel: string;
};

export const supportContent: Localized<SupportContent> = {
  en: {
    badge: "Help Center",
    title: "Help with reservations, pickup and selling.",
    intro: "Quick answers for customers and businesses, and the fastest way to reach us.",
    ordersCard: {
      title: "Your orders",
      text: "Find your pickup code, check the pickup time or cancel up to 2 hours before pickup.",
      action: "Open Orders",
    },
    pickupCard: {
      title: "Pickup",
      text: "Go during the pickup window, then show your code or slide to collect in front of staff.",
      action: "Read the FAQ",
    },
    faqTitle: "Common questions",
    faqIntro: "The answers people look for most often.",
    customersLabel: "Customers",
    businessesLabel: "Businesses",
    contactTitle: "Write to us",
    contactText:
      "Include your account email, the order details and a short description, and we'll get back to you within 1–2 business days.",
    urgentTitle: "Urgent problem at pickup?",
    urgentText: "Write URGENT in the subject line, and we'll look at your message first.",
    moreTitle: "Need more detail?",
    moreText: "The full FAQ covers payment, notifications, account deletion and selling on ArGadaagdo.",
    openFaqLabel: "Open the FAQ",
    contactPageLabel: "Contact us",
  },
  ka: {
    badge: "დახმარების ცენტრი",
    title: "დახმარება დაჯავშნაში, წაღებასა და გაყიდვაში.",
    intro: "სწრაფი პასუხები მომხმარებლებისა და ბიზნესებისთვის და ჩვენთან დაკავშირების უმოკლესი გზა.",
    ordersCard: {
      title: "შენი შეკვეთები",
      text: "იპოვე წაღების კოდი, გადაამოწმე წაღების დრო ან გააუქმე ჯავშანი წაღებამდე 2 საათით ადრე.",
      action: "შეკვეთების გახსნა",
    },
    pickupCard: {
      title: "წაღება",
      text: "მიდი წაღების დროს და თანამშრომელს აჩვენე კოდი ან მის თვალწინ გადაასრიალე წაღების ღილაკი.",
      action: "ხშირი კითხვები",
    },
    faqTitle: "ხშირი კითხვები",
    faqIntro: "პასუხები, რომლებსაც ყველაზე ხშირად ეძებენ.",
    customersLabel: "მომხმარებლები",
    businessesLabel: "ბიზნესები",
    contactTitle: "მოგვწერე",
    contactText:
      "მიუთითე ანგარიშის ელფოსტა, შეკვეთის დეტალები და მოკლე აღწერა. გიპასუხებთ 1–2 სამუშაო დღეში.",
    urgentTitle: "სასწრაფო პრობლემა წაღებისას?",
    urgentText: "წერილის თემაში მიუთითე URGENT და შენს წერილს პირველ რიგში განვიხილავთ.",
    moreTitle: "მეტი დეტალი გჭირდება?",
    moreText: "სრულ კითხვა-პასუხში ნახავ ინფორმაციას გადახდაზე, შეტყობინებებზე, ანგარიშის წაშლასა და გაყიდვაზე.",
    openFaqLabel: "კითხვა-პასუხის გახსნა",
    contactPageLabel: "დაგვიკავშირდი",
  },
};
