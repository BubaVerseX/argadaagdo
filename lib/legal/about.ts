import type { ContentSection, Localized } from "@/lib/legal/shared";

// Impact figures: lib/impact.ts (1 box ≈ 1 kg food ≈ 2.7 kg CO₂e, an estimate).

type AboutContent = {
  badge: string;
  title: string;
  intro: string;
  sections: ContentSection[];
  howTitle: string;
  howSteps: { title: string; text: string }[];
  valuesTitle: string;
  values: string[];
  ctaTitle: string;
  ctaText: string;
  browseLabel: string;
  contactLabel: string;
};

export const aboutContent: Localized<AboutContent> = {
  en: {
    badge: "About ArGadaagdo",
    title: "Good food shouldn't go to waste.",
    intro:
      "ArGadaagdo connects food businesses in Tbilisi with people who want good food at a better price.",
    sections: [
      {
        title: "What we do",
        paragraphs: [
          "At the end of the day, many businesses still have good food they haven't sold. On ArGadaagdo they offer it as Lunch Boxes at a discount. You reserve and pay in the app, then collect your box in person.",
        ],
      },
      {
        title: "Where we work",
        paragraphs: [
          "We operate in Tbilisi. Orders are pickup only, straight from the business; there's no delivery.",
        ],
      },
      {
        title: "Why it matters",
        paragraphs: [
          "Every box collected is food that isn't thrown away. By our estimate, one Lunch Box saves about 1 kg of food and about 2.7 kg of CO₂ emissions. Businesses recover revenue from food they would otherwise lose, and customers eat well for less.",
        ],
      },
    ],
    howTitle: "How it works",
    howSteps: [
      {
        title: "Find a box",
        text: "See what local businesses have left today, with the price and pickup time up front.",
      },
      {
        title: "Reserve and pay",
        text: "Pay securely through TBC Bank. Your pickup code appears in Orders.",
      },
      {
        title: "Pick it up",
        text: "Show your code or slide to collect at the business during the pickup window.",
      },
    ],
    valuesTitle: "What we stand for",
    values: ["Save food.", "Save money.", "Support local businesses."],
    ctaTitle: "Try it today",
    ctaText: "See what's available near you, or tell us how we can help.",
    browseLabel: "Browse offers",
    contactLabel: "Contact us",
  },
  ka: {
    badge: "არ გადააგდოს შესახებ",
    title: "კარგი საკვები არ უნდა გადაიყაროს.",
    intro:
      "არ გადააგდო თბილისის კვების ობიექტებს აკავშირებს ადამიანებთან, ვისაც კარგი საკვები უკეთეს ფასად სურს.",
    sections: [
      {
        title: "რას ვაკეთებთ",
        paragraphs: [
          "დღის ბოლოს ბევრ ბიზნესს კარგი, გაუყიდავი საკვები რჩება. ჩვენს პლატფორმაზე ისინი მას ლანჩ ბოქსების სახით, ფასდაკლებით გთავაზობენ. აპლიკაციაში დაჯავშნი და გადაიხდი, ბოქსს კი თავად წაიღებ.",
        ],
      },
      {
        title: "სად ვმუშაობთ",
        paragraphs: [
          "ვმუშაობთ თბილისში. შეკვეთას პირდაპირ ბიზნესიდან წაიღებ; მიწოდების სერვისი არ გვაქვს.",
        ],
      },
      {
        title: "რატომ არის ეს მნიშვნელოვანი",
        paragraphs: [
          "ყოველი წაღებული ბოქსი ნიშნავს საკვებს, რომელიც არ გადაიყარა. ჩვენი შეფასებით, ერთი ლანჩ ბოქსი დაახლოებით 1 კგ საკვებს და დაახლოებით 2,7 კგ CO₂-ის გაფრქვევას ზოგავს. ბიზნესები შემოსავალს იბრუნებენ იმ საკვებიდან, რომელსაც სხვა შემთხვევაში დაკარგავდნენ, მომხმარებლები კი კარგად და იაფად იკვებებიან.",
        ],
      },
    ],
    howTitle: "როგორ მუშაობს",
    howSteps: [
      {
        title: "იპოვე ბოქსი",
        text: "ნახე, რა დარჩათ დღეს ადგილობრივ ბიზნესებს. ფასი და წაღების დრო თავიდანვე ჩანს.",
      },
      {
        title: "დაჯავშნე და გადაიხადე",
        text: "გადაიხადე უსაფრთხოდ TBC ბანკის მეშვეობით. წაღების კოდი „შეკვეთებში“ გამოჩნდება.",
      },
      {
        title: "წაიღე",
        text: "წაღების დროს ბიზნესში აჩვენე კოდი ან გადაასრიალე წაღების ღილაკი.",
      },
    ],
    valuesTitle: "რისთვის ვართ",
    values: ["გადაარჩინე საკვები.", "დაზოგე ფული.", "მხარი დაუჭირე ადგილობრივ ბიზნესს."],
    ctaTitle: "სცადე დღესვე",
    ctaText: "ნახე, რა არის ხელმისაწვდომი შენთან ახლოს, ან მოგვწერე, თუ რამეში დახმარება გჭირდება.",
    browseLabel: "შეთავაზებების ნახვა",
    contactLabel: "დაგვიკავშირდი",
  },
};
