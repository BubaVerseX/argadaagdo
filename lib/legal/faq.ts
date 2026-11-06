import type { FaqItem, Localized } from "@/lib/legal/shared";

// Shared by /faq (all groups) and /support (a short selection, see
// pickFaqItems). Facts are the same as in lib/legal/terms.ts.

export type FaqEntry = FaqItem & { id: string };

export type FaqGroup = {
  id: "ordering" | "pickup" | "account" | "businesses" | "general";
  title: string;
  items: FaqEntry[];
};

type FaqContent = {
  badge: string;
  title: string;
  intro: string;
  groups: FaqGroup[];
  ctaTitle: string;
  ctaText: string;
  browseLabel: string;
  contactLabel: string;
};

export const faqContent: Localized<FaqContent> = {
  en: {
    badge: "Help",
    title: "Frequently asked questions",
    intro: "Short, clear answers about Lunch Boxes, payment, pickup and selling on ArGadaagdo.",
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
              "Open an offer, check the pickup time and tap Pay and reserve. You pay on TBC Bank's secure page, and as soon as the payment is confirmed, your reservation and pickup code appear in Orders. You need an account with a confirmed email address.",
          },
          {
            id: "pay",
            question: "How do I pay?",
            answer:
              "Online, on TBC Bank's secure payment page. The price you see is the price you pay, with no extra fees. We never see or store your card details.",
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
              "Go to the business during the pickup window shown on your order. Show staff your 6-digit pickup code, or slide to collect in the app in front of them once the box is in your hands. If you slide by mistake, you can undo it within 2 minutes.",
          },
          {
            id: "cancel",
            question: "Can I cancel?",
            answer:
              "Yes, in Orders, up to 2 hours before the pickup window starts. You get a full refund to the card or account you paid with; when it appears depends on your bank. In the last 2 hours before pickup, cancellation is no longer possible.",
          },
          {
            id: "miss",
            question: "What if I miss the pickup?",
            answer:
              "If you don't collect your order during the pickup window, it's marked as a missed pickup and the payment isn't refunded. Missed pickups lower your reliability score, and if it falls too low, new reservations are blocked on your account.",
          },
          {
            id: "problem",
            question: "Something went wrong with my order. What should I do?",
            answer:
              "Write to us with your account email, the order details and a short description of what happened. We'll resolve it with you and the business.",
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
              "Emails about your account and orders: reservation confirmed, pickup reminder, pickup completed, cancellations and refunds. Push notifications are optional, and you can turn them off at any time in Settings or in your device settings.",
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
              "Your company's legal name, identification code (9 or 11 digits) and legal form; the owner's full name; a mobile number for the SMS code; a TBC Bank IBAN in the company's name; and a Public Registry extract (PDF or JPG, up to 10 MB).",
          },
          {
            id: "cost",
            question: "What does it cost?",
            answer:
              "There's no monthly fee. We charge a commission only on paid orders, at a rate agreed with you before you start. Your share goes directly to your TBC account through TBC Bank's split payment.",
          },
          {
            id: "publish",
            question: "How do I publish Lunch Boxes?",
            answer:
              "Set up a Lunch Box once in your dashboard: category, size, price, how many per day (or until you stop), pickup window and weekdays. It's published automatically every evening for the next day, or you can publish it yourself. On a day with nothing left, tap Today: no bags.",
          },
          {
            id: "handover",
            question: "How do I hand over an order?",
            answer:
              "The customer shows a 6-digit pickup code, which you enter in the dashboard, or slides to collect in the app in front of you. Your staff can use a separate staff page protected by a PIN, without your account login.",
          },
          {
            id: "noshow",
            question: "What if a customer doesn't show up?",
            answer:
              "After the pickup window ends, the order is marked as a missed pickup. The customer isn't refunded, so the sale stands.",
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
    ctaTitle: "Still have a question?",
    ctaText: "Write to us, or see what's available today.",
    browseLabel: "Browse offers",
    contactLabel: "Contact us",
  },
  ka: {
    badge: "დახმარება",
    title: "ხშირად დასმული კითხვები",
    intro: "მოკლე და მკაფიო პასუხები ლანჩ ბოქსებზე, გადახდაზე, წაღებასა და ბიზნესებისთვის გაყიდვის პირობებზე.",
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
              "გახსენი შეთავაზება, გადაამოწმე წაღების დრო და დააჭირე ღილაკს „გადახდა და დაჯავშნა“. გადაიხდი TBC ბანკის დაცულ გვერდზე და, როგორც კი გადახდა დადასტურდება, ჯავშანი და წაღების კოდი „შეკვეთებში“ გამოჩნდება. დასაჯავშნად გჭირდება ანგარიში დადასტურებული ელფოსტით.",
          },
          {
            id: "pay",
            question: "როგორ გადავიხადო?",
            answer:
              "ონლაინ, TBC ბანკის დაცულ გადახდის გვერდზე. რა ფასსაც ხედავ, იმას იხდი, დამატებითი საკომისიოს გარეშე. ბარათის მონაცემებს ვერც ვხედავთ და არც ვინახავთ.",
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
              "მიდი ბიზნესთან შეკვეთაში მითითებულ წაღების დროს. თანამშრომელს აჩვენე 6-ნიშნა წაღების კოდი ან, როცა ბოქსი უკვე ხელში გაქვს, მის თვალწინ აპლიკაციაში გადაასრიალე წაღების ღილაკი. შემთხვევით გადასრიალებას 2 წუთის განმავლობაში გააუქმებ.",
          },
          {
            id: "cancel",
            question: "შემიძლია ჯავშნის გაუქმება?",
            answer:
              "კი, „შეკვეთებიდან“, წაღების დაწყებამდე არაუგვიანეს 2 საათისა. სრული თანხა დაგიბრუნდება იმ ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე; ასახვის დრო შენს ბანკზეა დამოკიდებული. წაღებამდე ბოლო 2 საათში ჯავშანს ვეღარ გააუქმებ.",
          },
          {
            id: "miss",
            question: "რა მოხდება, თუ შეკვეთას დროზე ვერ წავიღებ?",
            answer:
              "თუ შეკვეთას წაღების დროს არ წაიღებ, ის გამოტოვებულ წაღებად მოინიშნება და თანხა არ ბრუნდება. გამოტოვებული წაღება ამცირებს სანდოობის ქულას, ძალიან დაბალი ქულის შემთხვევაში კი ახალი ჯავშნები შენს ანგარიშზე იზღუდება.",
          },
          {
            id: "problem",
            question: "შეკვეთასთან პრობლემა მაქვს. რა ვქნა?",
            answer:
              "მოგვწერე ანგარიშის ელფოსტით, შეკვეთის დეტალებითა და მოკლე აღწერით, რა მოხდა. საკითხს შენთან და ბიზნესთან ერთად მოვაგვარებთ.",
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
              "ელფოსტით წერილებს ანგარიშისა და შეკვეთების შესახებ: ჯავშნის დადასტურება, წაღების შეხსენება, წაღების დასრულება, გაუქმება და თანხის დაბრუნება. Push-შეტყობინებები ნებაყოფლობითია და მათ გამორთვას ნებისმიერ დროს შეძლებ პარამეტრებში ან მოწყობილობის პარამეტრებში.",
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
              "კომპანიის იურიდიული დასახელება, საიდენტიფიკაციო კოდი (9 ან 11 ციფრი) და სამართლებრივი ფორმა; მფლობელის სახელი და გვარი; მობილურის ნომერი SMS კოდისთვის; კომპანიის სახელზე გახსნილი TBC ბანკის IBAN; საჯარო რეესტრის ამონაწერი (PDF ან JPG, მაქსიმუმ 10 მბ).",
          },
          {
            id: "cost",
            question: "რა ღირს?",
            answer:
              "ყოველთვიური გადასახადი არ არის. საკომისიოს ვიღებთ მხოლოდ გადახდილ შეკვეთებზე, განაკვეთით, რომელზეც დაწყებამდე შევთანხმდებით. შენი წილი TBC ბანკის გაყოფილი გადახდის (split) საშუალებით პირდაპირ შენს TBC ანგარიშზე ირიცხება.",
          },
          {
            id: "publish",
            question: "როგორ გამოვაქვეყნო ლანჩ ბოქსები?",
            answer:
              "პანელში ლანჩ ბოქსს ერთხელ აწყობ: კატეგორია, ზომა, ფასი, დღეში რამდენი (ან სანამ არ შეაჩერებ), წაღების დრო და კვირის დღეები. ის ყოველ საღამოს მომდევნო დღისთვის ავტომატურად ქვეყნდება, ან შეგიძლია თავად გამოაქვეყნო. თუ დღეს გასაყიდი აღარაფერი გაქვს, დააჭირე „დღეს: ლანჩ ბოქსები აღარ არის“.",
          },
          {
            id: "handover",
            question: "როგორ გადავცე შეკვეთა?",
            answer:
              "მომხმარებელი გაჩვენებს 6-ნიშნა წაღების კოდს, რომელსაც პანელში შეიყვან, ან შენს თვალწინ აპლიკაციაში გადაასრიალებს წაღების ღილაკს. თანამშრომლებს შეუძლიათ გამოიყენონ ცალკე გვერდი, რომელიც PIN კოდით არის დაცული და შენს ანგარიშზე შესვლას არ საჭიროებს.",
          },
          {
            id: "noshow",
            question: "რა ხდება, თუ მომხმარებელი არ მოვიდა?",
            answer:
              "წაღების დროის დასრულების შემდეგ შეკვეთა გამოტოვებულ წაღებად მოინიშნება. მომხმარებელს თანხა არ უბრუნდება, ასე რომ გაყიდვა ძალაში რჩება.",
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
    ctaTitle: "კიდევ გაქვს კითხვა?",
    ctaText: "მოგვწერე ან ნახე, რა არის დღეს ხელმისაწვდომი.",
    browseLabel: "შეთავაზებების ნახვა",
    contactLabel: "დაგვიკავშირდი",
  },
};

/** The FAQ entries with these ids, in the order given (used by /support). */
export function pickFaqItems(groups: FaqGroup[], ids: string[]): FaqEntry[] {
  const byId = new Map(
    groups.flatMap((group) => group.items).map((item) => [item.id, item])
  );

  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}
