import type { Localized } from "@/lib/legal/shared";

// Facts behind this page (checked 6 Nov 2026):
// - application steps + requirements: components/business/BusinessOnboardingWizard.tsx,
//   submit_business_application / guard_business_approval
//   (supabase/migrations/20261105120000_business_verification.sql)
// - commission per business, set by admins: 20261104081140_platform_fee_rate.sql
// - TBC split to the business IBAN: lib/payments/tbc.ts, app/api/payments/checkout
// - bag templates go live at their own publish time (pg_cron every 10 min), "Stop sales for today",
//   departments + staff PIN page: 20261101110658_departments_and_bag_templates.sql
// - monthly impact report (CSV / printable): app/business/report

type Item = { title: string; text: string };

type ForBusinessesContent = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  registerLabel: string;
  talkLabel: string;
  pricingBadge: string;
  pricingTitle: string;
  pricingText: string;
  pricingNote: string;
  benefitsBadge: string;
  benefitsTitle: string;
  benefits: Item[];
  howBadge: string;
  howTitle: string;
  howSteps: Item[];
  needBadge: string;
  needTitle: string;
  needItems: string[];
  paidBadge: string;
  paidTitle: string;
  paidItems: string[];
  ctaTitle: string;
  ctaText: string;
  ctaQuestions: string;
  ctaContact: string;
};

export const forBusinessesContent: Localized<ForBusinessesContent> = {
  en: {
    heroBadge: "For businesses",
    heroTitle: "Your unsold food still has value.",
    heroSubtitle:
      "Sell end-of-day surplus as Lunch Boxes to customers in Tbilisi. They pay in advance in the app and collect from you in person.",
    registerLabel: "Register your business",
    talkLabel: "Talk to us first",
    pricingBadge: "Pricing",
    pricingTitle: "No monthly fee.",
    pricingText:
      "You pay a commission only on paid orders, at a rate we agree with you before you start.",
    pricingNote: "No sale, no fee. Signing up and listing are free.",
    benefitsBadge: "Why ArGadaagdo",
    benefitsTitle: "Less waste, more revenue.",
    benefits: [
      {
        title: "Recover revenue",
        text: "Turn food you'd otherwise throw away into prepaid sales.",
      },
      {
        title: "Reach new customers",
        text: "People nearby discover your business through a Lunch Box.",
      },
      {
        title: "Little extra work",
        text: "Set up your Lunch Box once. It's published automatically, and handover takes seconds.",
      },
    ],
    howBadge: "How it works",
    howTitle: "From surplus to sold",
    howSteps: [
      {
        title: "Apply",
        text: "Register in four steps: company details, phone confirmation by SMS, payout details and your first Lunch Box.",
      },
      {
        title: "Get approved",
        text: "We check every application. Once you're approved, you can start selling.",
      },
      {
        title: "Publish",
        text: "Set the category, size, price, quantity per day, pickup window, weekdays and when each box goes live. Boxes are published automatically at that time, and Stop sales for today pauses sales in one tap.",
      },
      {
        title: "Hand over",
        text: "The customer shows a 6-digit code or slides to collect in front of you. Staff can use a PIN-protected page, without your login.",
      },
    ],
    needBadge: "Before you apply",
    needTitle: "What you'll need",
    needItems: [
      "The company's legal name, identification code (9 or 11 digits) and legal form",
      "The owner's full name",
      "A mobile number to confirm by SMS",
      "A TBC Bank IBAN in the company's name",
      "An extract from the Public Registry (PDF or JPG, up to 10 MB)",
      "Your pickup address",
    ],
    paidBadge: "Payments",
    paidTitle: "How you get paid",
    paidItems: [
      "Customers pay online through TBC Bank when they reserve, so every order you hand over is already paid.",
      "TBC Bank splits each payment automatically: your share goes straight to your company's TBC account and our commission to ours. We never hold your money; TBC credits it on its usual settlement schedule.",
      "If a customer cancels at least 2 hours before pickup, they get a full refund and the box goes back on sale.",
      "If a customer misses the pickup window, the order is marked as a missed pickup and the sale stands. You may still hand it over if they come later.",
      "If an order is refunded (a cancellation in time, or an order you couldn't hand over), TBC returns the full amount to the customer, including your share.",
      "Your dashboard shows reservations, revenue and ratings, plus a monthly impact report you can download or print.",
    ],
    ctaTitle: "Ready to stop throwing food away?",
    ctaText: "Register in a few minutes. We'll review your application and help you get started. Registering means you accept the Business Terms (argadaagdo.ge/business-terms).",
    ctaQuestions: "Have questions first?",
    ctaContact: "Contact us",
  },
  ka: {
    heroBadge: "ბიზნესებისთვის",
    heroTitle: "შენს გაუყიდავ საკვებს ჯერ კიდევ აქვს ღირებულება.",
    heroSubtitle:
      "დღის ბოლოს დარჩენილი საკვები ლანჩ ბოქსების სახით მიჰყიდე თბილისელ მომხმარებლებს. ისინი აპლიკაციაში წინასწარ იხდიან და შეკვეთას შენგან თავად იღებენ.",
    registerLabel: "დაარეგისტრირე ბიზნესი",
    talkLabel: "ჯერ დაგვიკავშირდი",
    pricingBadge: "ფასები",
    pricingTitle: "ყოველთვიური გადასახადის გარეშე.",
    pricingText:
      "საკომისიოს იხდი მხოლოდ გადახდილ შეკვეთებზე, განაკვეთით, რომელზეც დაწყებამდე შევთანხმდებით.",
    pricingNote: "არ გაიყიდა — არ იხდი. რეგისტრაცია და განთავსება უფასოა.",
    benefitsBadge: "რატომ არ გადააგდო",
    benefitsTitle: "ნაკლები ნარჩენი, მეტი შემოსავალი.",
    benefits: [
      {
        title: "დაიბრუნე შემოსავალი",
        text: "საკვები, რომელიც სხვა შემთხვევაში გადაიყრებოდა, წინასწარ გადახდილ გაყიდვად აქციე.",
      },
      {
        title: "ახალი მომხმარებლები",
        text: "ახლომახლო მცხოვრებლები შენს ბიზნესს ლანჩ ბოქსის მეშვეობით გაიცნობენ.",
      },
      {
        title: "მინიმალური დამატებითი შრომა",
        text: "ლანჩ ბოქსს ერთხელ აწყობ, ის ავტომატურად ქვეყნდება, გადაცემას კი რამდენიმე წამი სჭირდება.",
      },
    ],
    howBadge: "როგორ მუშაობს",
    howTitle: "ჭარბი საკვებიდან გაყიდვამდე",
    howSteps: [
      {
        title: "განაცხადი",
        text: "დარეგისტრირდი ოთხ ნაბიჯად: კომპანიის მონაცემები, ტელეფონის დადასტურება SMS-ით, ანგარიშსწორების მონაცემები და პირველი ლანჩ ბოქსი.",
      },
      {
        title: "დამტკიცება",
        text: "ყველა განაცხადს ვამოწმებთ. დამტკიცების შემდეგ შეგიძლია გაყიდვა დაიწყო.",
      },
      {
        title: "გამოქვეყნება",
        text: "მიუთითე კატეგორია, ზომა, ფასი, დღიური რაოდენობა, წაღების დრო, კვირის დღეები და როდის გამოქვეყნდეს ბოქსი. ბოქსები ამ დროს ავტომატურად ქვეყნდება, ღილაკით „დღეს გაყიდვის შეჩერება“ კი გაყიდვას ერთი შეხებით შეაჩერებ.",
      },
      {
        title: "გადაცემა",
        text: "მომხმარებელი გაჩვენებს 6-ნიშნა კოდს ან შენს თვალწინ გადაასრიალებს წაღების ღილაკს. თანამშრომლები PIN კოდით დაცულ გვერდს იყენებენ, შენს ანგარიშზე შესვლის გარეშე.",
      },
    ],
    needBadge: "განაცხადამდე",
    needTitle: "რა დაგჭირდება",
    needItems: [
      "კომპანიის იურიდიული დასახელება, საიდენტიფიკაციო კოდი (9 ან 11 ციფრი) და სამართლებრივი ფორმა",
      "მფლობელის სახელი და გვარი",
      "მობილურის ნომერი SMS-ით დასადასტურებლად",
      "კომპანიის სახელზე გახსნილი TBC ბანკის IBAN",
      "საჯარო რეესტრის ამონაწერი (PDF ან JPG, მაქსიმუმ 10 მბ)",
      "წაღების მისამართი",
    ],
    paidBadge: "გადახდები",
    paidTitle: "როგორ იღებ თანხას",
    paidItems: [
      "მომხმარებელი დაჯავშნისას ონლაინ იხდის TBC ბანკის მეშვეობით, ასე რომ ყოველი შეკვეთა, რომელსაც გადასცემ, უკვე გადახდილია.",
      "TBC ბანკი თითოეულ გადახდას ავტომატურად ყოფს (split): შენი წილი პირდაპირ კომპანიის TBC ანგარიშზე ირიცხება, ჩვენი საკომისიო კი — ჩვენსაზე. შენს თანხას ჩვენ არ ვფლობთ; TBC მას ჩვეულებრივი ანგარიშსწორების ვადებში ჩაგირიცხავს.",
      "თუ მომხმარებელი ჯავშანს წაღებამდე არაუგვიანეს 2 საათისა გააუქმებს, თანხა სრულად უბრუნდება, ბოქსი კი ისევ გასაყიდად ბრუნდება.",
      "თუ მომხმარებელმა წაღების დრო გამოტოვა, შეკვეთა გამოტოვებულ წაღებად მოინიშნება და გაყიდვა ძალაში რჩება. თუ მოგვიანებით მოვიდა, შეგიძლია მაინც გადასცე.",
      "თუ შეკვეთის თანხა ბრუნდება (დროული გაუქმება ან შეკვეთა, რომელიც ვერ გადაეცი), TBC მომხმარებელს სრულ თანხას უბრუნებს, შენი წილის ჩათვლით.",
      "პანელში ხედავ ჯავშნებს, შემოსავალსა და შეფასებებს, ასევე ყოველთვიურ ანგარიშს გადარჩენილ საკვებზე, რომლის ჩამოტვირთვა ან დაბეჭდვაც შეგიძლია.",
    ],
    ctaTitle: "მზად ხარ, შეწყვიტო საკვების გადაყრა?",
    ctaText: "დარეგისტრირდი რამდენიმე წუთში. განაცხადს განვიხილავთ და დაწყებაში დაგეხმარებით. რეგისტრაციით ეთანხმები ბიზნესის წესებს (argadaagdo.ge/business-terms).",
    ctaQuestions: "ჯერ კითხვები გაქვს?",
    ctaContact: "დაგვიკავშირდი",
  },
};
