import type { FaqItem, Localized } from "@/lib/legal/shared";

// The answers behind the Help centre (/support and /faq, see HELP_CATEGORIES
// below). Facts are the same as in lib/legal/terms.ts.

export type FaqEntry = FaqItem & { id: string };

export type FaqGroup = {
  id: "ordering" | "pickup" | "account" | "businesses" | "general";
  title: string;
  items: FaqEntry[];
};

type FaqContent = {
  groups: FaqGroup[];
};

export const faqContent: Localized<FaqContent> = {
  en: {
    groups: [
      {
        id: "ordering",
        title: "Reserving and paying",
        items: [
          {
            id: "what",
            question: "What is a Lunch Box?",
            answer:
              "Food a local business didn't sell that day, offered at a lower price. The exact contents vary, but before you reserve you always see the business, the box size and category, the price and the pickup time.",
          },
          {
            id: "reserve",
            question: "How do I reserve?",
            answer:
              "Open an offer, check the pickup time and tap Pay and reserve. You pay on TBC Bank's secure page, and as soon as the payment is confirmed, your reservation appears in Orders. You need an account and a confirmed mobile number (and, if you signed up with email, a confirmed email address).",
          },
          {
            id: "pay",
            question: "How do I pay?",
            answer:
              "Online, on TBC Bank's secure payment page. The price you see is the price you pay, with no extra fees. For now, only cards from Georgian banks work, also in Apple Pay and Google Pay; foreign cards will come later. We never see or store your card details.",
          },
          {
            id: "limits",
            question: "How many boxes can I reserve?",
            answer:
              "Up to 3 active reservations at a time, one per offer. Each reservation is for one Lunch Box.",
          },
          {
            id: "allergens",
            question: "What about allergens?",
            answer:
              "If the business lists allergens, you'll find them on the offer page. If they aren't listed, or if you have an allergy, ask the business at pickup before eating.",
          },
        ],
      },
      {
        id: "pickup",
        title: "Pickup and cancellations",
        items: [
          {
            id: "pickup",
            question: "How does pickup work?",
            answer:
              "Go to the business during the pickup window shown on your order. Once the box is in your hands, open the order and slide to collect in front of staff. If you slide by mistake, you can undo it within 2 minutes. The 6-digit pickup code is a backup if the slider can't be used.",
          },
          {
            id: "cancel",
            question: "Can I cancel?",
            answer:
              "Yes, in Orders, up to 2 hours before the pickup window starts. You get a full refund to the card or account you paid with; when it appears depends on your bank. In the last 2 hours before pickup, cancellation is no longer possible, and a box reserved in that time can't be cancelled (checkout shows this before you pay).",
          },
          {
            id: "miss",
            question: "What if I miss the pickup?",
            answer:
              "If you don't collect your order during the pickup window, it counts as a missed pickup and the payment isn't refunded. The business may still hand it over if you come later, but it doesn't have to. A missed pickup lowers your reliability score by 15 points; below 50, new reservations are blocked on your account.",
          },
          {
            id: "problem",
            question: "Something went wrong with my order. What should I do?",
            answer:
              "Write to us with your account email or phone number, the order details and a short description of what happened. We'll resolve it with you and the business.",
          },
          {
            id: "ratings",
            question: "How do ratings work?",
            answer:
              "After a completed pickup, you can rate the business from 1 to 5 stars and add a comment if you like. Reviews are shown without your name or email.",
          },
        ],
      },
      {
        id: "account",
        title: "Account and notifications",
        items: [
          {
            id: "notifications",
            question: "Which notifications will I get?",
            answer:
              "Your orders and their status are always under Orders in the app. Push notifications (reservation confirmed, pickup reminder, cancellations and refunds) are optional, and you can turn them off at any time in Settings or in your device settings. By email we send only account messages, such as confirming your email address.",
          },
          {
            id: "delete",
            question: "How do I delete my account?",
            answer:
              "Go to Settings → Delete account. Collect or cancel any active reservation first. Order records are kept for accounting, but they're no longer linked to you.",
          },
        ],
      },
      {
        id: "businesses",
        title: "For businesses",
        items: [
          {
            id: "join",
            question: "How do I join as a business?",
            answer:
              "Open For businesses and register in four steps: company details, phone confirmation by SMS, payout details, and your first Lunch Box. We review every application, and once it's approved, you can start selling.",
          },
          {
            id: "documents",
            question: "What do I need to apply?",
            answer:
              "Your company's legal name, identification code (9 or 11 digits) and legal form; the owner's full name; a mobile number for the SMS code; an IBAN at any Georgian bank, in the company's name; and, optionally, a Public Registry extract (PDF or JPG, up to 10 MB).",
          },
          {
            id: "cost",
            question: "What does it cost?",
            answer:
              "There's no monthly fee. We charge a commission only on paid orders, at a rate agreed with you before you start. With a TBC Bank account, TBC splits each payment automatically: your share goes straight to your account and our commission to ours. With another Georgian bank, the payment comes to us and we transfer your share, minus our commission, every Monday for the previous week.",
          },
          {
            id: "publish",
            question: "How do I publish Lunch Boxes?",
            answer:
              "Set up a Lunch Box template once in your dashboard: name, price, how many per day, pickup window, the time it shows up in the app, the days (every day or chosen days) and, if you want, a time when reservations close (otherwise until pickup ends). Size starts on M and the category is picked for you; you can change both. It goes live automatically at that time (we check every 10 minutes), or you can publish it yourself. On a day with nothing left, tap Stop sales for today.",
          },
          {
            id: "handover",
            question: "How do I hand over an order?",
            answer:
              "The customer slides to collect on their own phone in front of your staff, and the order is marked handed over in your dashboard by itself. Your staff need nothing: no app, account or PIN. If the slider can't be used, the customer gives a 6-digit backup code, which you enter in the dashboard. An optional staff page, protected by a PIN, shows the order list without your account login.",
          },
          {
            id: "noshow",
            question: "What if a customer doesn't show up?",
            answer:
              "When the pickup window ends, the order is marked as a missed pickup. The customer isn't refunded, so the sale stands. If the customer turns up later, you may still hand it over with the code within 12 hours; that clears the missed pickup from their score.",
          },
        ],
      },
      {
        id: "general",
        title: "General",
        items: [
          {
            id: "where",
            question: "Where does ArGadaagdo work?",
            answer: "In Tbilisi. Orders are pickup only; there's no delivery.",
          },
          {
            id: "why",
            question: "Why does ArGadaagdo exist?",
            answer:
              "Every day, good food is thrown away simply because it didn't sell in time. We help businesses sell it instead, so customers save money and less food goes to waste.",
          },
        ],
      },
    ],
  },
  ka: {
    groups: [
      {
        id: "ordering",
        title: "დაჯავშნა და გადახდა",
        items: [
          {
            id: "what",
            question: "რა არის ლანჩ ბოქსი?",
            answer:
              "საკვები, რომელიც ადგილობრივმა ბიზნესმა იმ დღეს ვერ გაყიდა და ახლა დაბალ ფასად გთავაზობს. ზუსტი შემადგენლობა შეიძლება განსხვავდებოდეს, მაგრამ დაჯავშნამდე ყოველთვის ხედავ ბიზნესს, ბოქსის ზომასა და კატეგორიას, ფასსა და წაღების დროს.",
          },
          {
            id: "reserve",
            question: "როგორ დავჯავშნო?",
            answer:
              "გახსენი შეთავაზება, გადაამოწმე წაღების დრო და დააჭირე ღილაკს „გადახდა და დაჯავშნა“. გადაიხდი TBC ბანკის დაცულ გვერდზე და, როგორც კი გადახდა დადასტურდება, ჯავშანი „შეკვეთებში“ გამოჩნდება. დასაჯავშნად გჭირდება ანგარიში და დადასტურებული მობილურის ნომერი (თუ ელფოსტით დარეგისტრირდი, დადასტურებული ელფოსტაც).",
          },
          {
            id: "pay",
            question: "როგორ გადავიხადო?",
            answer:
              "ონლაინ, TBC ბანკის დაცულ გადახდის გვერდზე. რა ფასსაც ხედავ, იმას იხდი, დამატებითი საკომისიოს გარეშე. ამ ეტაპზე გადახდა შესაძლებელია მხოლოდ ქართული ბანკის ბარათით, მათ შორის Apple Pay-ითა და Google Pay-ით. უცხოურ ბარათებს მოგვიანებით დავამატებთ. ბარათის მონაცემებს ვერც ვხედავთ და არც ვინახავთ.",
          },
          {
            id: "limits",
            question: "რამდენი ბოქსის დაჯავშნა შემიძლია?",
            answer:
              "ერთდროულად მაქსიმუმ 3 აქტიური ჯავშანი, თითო შეთავაზებაზე ერთი. ერთი ჯავშანი ერთ ლანჩ ბოქსს მოიცავს.",
          },
          {
            id: "allergens",
            question: "როგორ გავიგო ალერგენების შესახებ?",
            answer:
              "თუ ბიზნესს ალერგენები მითითებული აქვს, მათ შეთავაზების გვერდზე ნახავ. თუ მითითებული არ არის ან ალერგია გაქვს, ჭამამდე წაღებისას ჰკითხე ბიზნესს.",
          },
        ],
      },
      {
        id: "pickup",
        title: "წაღება და გაუქმება",
        items: [
          {
            id: "pickup",
            question: "როგორ ხდება წაღება?",
            answer:
              "მიდი ბიზნესთან შეკვეთაში მითითებულ წაღების დროს. როცა ბოქსი უკვე ხელში გაქვს, გახსენი შეკვეთა და თანამშრომლის თვალწინ გადაასრიალე წაღების ღილაკი. შემთხვევით გადასრიალებას 2 წუთის განმავლობაში გააუქმებ. 6-ნიშნა წაღების კოდი სარეზერვოა, თუ გადასრიალება ვერ ხერხდება.",
          },
          {
            id: "cancel",
            question: "შემიძლია ჯავშნის გაუქმება?",
            answer:
              "კი, „შეკვეთებიდან“, წაღების დაწყებამდე არაუგვიანეს 2 საათისა. სრული თანხა დაგიბრუნდება იმ ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე; ასახვის დრო შენს ბანკზეა დამოკიდებული. წაღებამდე ბოლო 2 საათში ჯავშანს ვეღარ გააუქმებ, ამ დროს გაკეთებული ჯავშანი კი გაუქმებას არ ექვემდებარება (ამას გადახდამდე გაჩვენებთ).",
          },
          {
            id: "miss",
            question: "რა მოხდება, თუ შეკვეთას დროზე ვერ წავიღებ?",
            answer:
              "თუ შეკვეთას წაღების დროს არ წაიღებ, ის გამოტოვებულ წაღებად ჩაითვლება და თანხა არ ბრუნდება. ბიზნესს შეუძლია ბოქსი მოგვიანებით მოსულსაც გადმოგცეს, მაგრამ ეს მისი ნებაა. გამოტოვებული წაღება სანდოობის ქულას 15-ით ამცირებს; 50-ზე დაბლა ახალი ჯავშნები შენს ანგარიშზე იზღუდება.",
          },
          {
            id: "problem",
            question: "შეკვეთასთან პრობლემა მაქვს. რა ვქნა?",
            answer:
              "მოგვწერე და მიუთითე ანგარიშის ელფოსტა ან ტელეფონის ნომერი, შეკვეთის დეტალები და მოკლე აღწერა, რა მოხდა. საკითხს შენთან და ბიზნესთან ერთად მოვაგვარებთ.",
          },
          {
            id: "ratings",
            question: "როგორ მუშაობს შეფასებები?",
            answer:
              "დასრულებული წაღების შემდეგ ბიზნესს 1-დან 5 ვარსკვლავამდე შეაფასებ და, თუ გინდა, კომენტარსაც დაამატებ. შეფასებები შენი სახელისა და ელფოსტის გარეშე ჩანს.",
          },
        ],
      },
      {
        id: "account",
        title: "ანგარიში და შეტყობინებები",
        items: [
          {
            id: "notifications",
            question: "რა შეტყობინებებს მივიღებ?",
            answer:
              "შეკვეთები და მათი სტატუსი ყოველთვის ჩანს აპში, „შეკვეთებში“. Push-შეტყობინებები (ჯავშნის დადასტურება, წაღების შეხსენება, გაუქმება და თანხის დაბრუნება) ნებაყოფლობითია და მათ გამორთვას ნებისმიერ დროს შეძლებ პარამეტრებში ან მოწყობილობის პარამეტრებში. ელფოსტით მხოლოდ ანგარიშის წერილებს ვაგზავნით, მაგალითად ელფოსტის დადასტურებას.",
          },
          {
            id: "delete",
            question: "როგორ წავშალო ანგარიში?",
            answer:
              "გადადი: პარამეტრები → ანგარიშის წაშლა. მანამდე აქტიური ჯავშანი წაიღე ან გააუქმე. შეკვეთების ჩანაწერები საბუღალტრო მიზნით ინახება, მაგრამ შენთან აღარ არის დაკავშირებული.",
          },
        ],
      },
      {
        id: "businesses",
        title: "ბიზნესებისთვის",
        items: [
          {
            id: "join",
            question: "როგორ შემოვუერთდე როგორც ბიზნესი?",
            answer:
              "გახსენი გვერდი „ბიზნესებისთვის“ და დარეგისტრირდი ოთხ ნაბიჯად: კომპანიის მონაცემები, ტელეფონის დადასტურება SMS-ით, ანგარიშსწორების მონაცემები და პირველი ლანჩ ბოქსი. ყველა განაცხადს ვამოწმებთ და დამტკიცებისთანავე შეგიძლია გაყიდვა დაიწყო.",
          },
          {
            id: "documents",
            question: "რა მჭირდება განაცხადისთვის?",
            answer:
              "კომპანიის იურიდიული დასახელება, საიდენტიფიკაციო კოდი (9 ან 11 ციფრი) და სამართლებრივი ფორმა; მფლობელის სახელი და გვარი; მობილურის ნომერი SMS კოდისთვის; კომპანიის სახელზე გახსნილი ანგარიშის IBAN (საქართველოს ნებისმიერი ბანკი); საჯარო რეესტრის ამონაწერი (არასავალდებულო; PDF ან JPG, მაქსიმუმ 10 მბ).",
          },
          {
            id: "cost",
            question: "რა ღირს?",
            answer:
              "ყოველთვიური გადასახადი არ არის. საკომისიოს ვიღებთ მხოლოდ გადახდილ შეკვეთებზე, განაკვეთით, რომელზეც დაწყებამდე შევთანხმდებით. TBC ბანკის ანგარიშით TBC თითოეულ გადახდას ავტომატურად ყოფს (split): შენი წილი პირდაპირ შენს ანგარიშზე ირიცხება, ჩვენი საკომისიო კი — ჩვენსაზე. სხვა ქართული ბანკის შემთხვევაში გადახდა ჩვენთან შემოდის და შენს წილს, ჩვენი საკომისიოს გამოკლებით, ყოველ ორშაბათს გადმოგირიცხავთ წინა კვირისთვის.",
          },
          {
            id: "publish",
            question: "როგორ გამოვაქვეყნო ლანჩ ბოქსები?",
            answer:
              "პანელში ლანჩ ბოქსის შაბლონს ერთხელ აწყობ: სახელი, ფასი, დღეში რამდენი, წაღების დრო, აპში გამოჩენის დრო, დღეები (ყოველდღე ან არჩეულ დღეებში) და, სურვილისამებრ, ჯავშნის ბოლო დრო (თუ არ მიუთითებ — წაღების დასრულებამდე). ზომა თავიდან M-ია, კატეგორიას კი აპი თავად ირჩევს — ორივეს შეცვლა შეგიძლია. ბოქსი ამ დროს ავტომატურად ქვეყნდება (ვამოწმებთ ყოველ 10 წუთში), ან შეგიძლია თავად გამოაქვეყნო. თუ დღეს გასაყიდი აღარაფერი გაქვს, დააჭირე „დღეს გაყიდვის შეჩერება“.",
          },
          {
            id: "handover",
            question: "როგორ გადავცე შეკვეთა?",
            answer:
              "მომხმარებელი შენი თანამშრომლის თვალწინ, თავის ტელეფონზე გადაასრიალებს წაღების ღილაკს და შეკვეთა პანელში გაცემულად თავად მოინიშნება. თანამშრომელს არაფერი სჭირდება: არც აპი, არც ანგარიში, არც PIN. თუ გადასრიალება ვერ ხერხდება, მომხმარებელი 6-ნიშნა სარეზერვო კოდს გეტყვის, რომელსაც პანელში შეიყვან. სურვილისამებრ, შეგიძლია თანამშრომლის გვერდიც გამოიყენო: ის PIN კოდით არის დაცული და შეკვეთების სიას შენს ანგარიშზე შესვლის გარეშე აჩვენებს.",
          },
          {
            id: "noshow",
            question: "რა ხდება, თუ მომხმარებელი არ მოვიდა?",
            answer:
              "წაღების დროის დასრულებისთანავე შეკვეთა გამოტოვებულ წაღებად მოინიშნება. მომხმარებელს თანხა არ უბრუნდება, ასე რომ გაყიდვა ძალაში რჩება. თუ მომხმარებელი მოგვიანებით მოვიდა, 12 საათის განმავლობაში შეგიძლია მაინც გასცე კოდით; ეს მის ქულას გამოტოვებულ წაღებას მოუხსნის.",
          },
        ],
      },
      {
        id: "general",
        title: "ზოგადი",
        items: [
          {
            id: "where",
            question: "სად მუშაობს არ გადააგდო?",
            answer: "თბილისში. შეკვეთას თავად წაიღებ; მიწოდების სერვისი არ გვაქვს.",
          },
          {
            id: "why",
            question: "რატომ შეიქმნა არ გადააგდო?",
            answer:
              "ყოველდღე კარგი საკვები იყრება მხოლოდ იმიტომ, რომ დროზე ვერ გაიყიდა. ჩვენ ბიზნესებს ვეხმარებით, ის გაყიდონ: მომხმარებელი ზოგავს, ნაგავში კი ნაკლები საკვები ხვდება.",
          },
        ],
      },
    ],
  },
};

/** The FAQ entries with these ids, in the order given (used by /support). */
// The Help centre (/support and /faq) shows the same answers in four
// categories, every question collapsed. Old links like /faq#pickup still land
// in the right category (legacyGroups).
export type HelpCategoryId = "orders" | "payment" | "account" | "businesses";

export type HelpCategory = {
  id: HelpCategoryId;
  title: Localized<string>;
  itemIds: string[];
  legacyGroups: FaqGroup["id"][];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "orders",
    title: { ka: "შეკვეთა და წაღება", en: "Orders & pickup" },
    itemIds: ["what", "reserve", "limits", "pickup", "miss", "allergens", "ratings", "where", "why"],
    legacyGroups: ["ordering", "pickup", "general"],
  },
  {
    id: "payment",
    title: { ka: "გადახდა და დაბრუნება", en: "Payment & refunds" },
    itemIds: ["pay", "cancel", "problem"],
    legacyGroups: [],
  },
  {
    id: "account",
    title: { ka: "ანგარიში", en: "Account" },
    itemIds: ["notifications", "delete"],
    legacyGroups: ["account"],
  },
  {
    id: "businesses",
    title: { ka: "ბიზნესისთვის", en: "For businesses" },
    itemIds: ["join", "documents", "cost", "publish", "handover", "noshow"],
    legacyGroups: ["businesses"],
  },
];
