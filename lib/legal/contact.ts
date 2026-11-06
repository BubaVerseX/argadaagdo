import { operatorSentence, type Localized } from "@/lib/legal/shared";

// Content for /contact. The support address is SUPPORT_EMAIL in
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
