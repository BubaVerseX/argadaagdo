import {
  MINIMUM_AGE,
  SUPPORT_EMAIL,
  operatorDetails,
  operatorSentence,
  type ContentSection,
  type Localized,
} from "@/lib/legal/shared";

// Facts behind this page (checked 7 Nov 2026):
// - cancel up to 2 h before pickup_start, full refund: begin_customer_refund
//   (supabase/migrations/20261016104256_payment_safety.sql) + /api/payments/refund;
//   bought later = no cancel, shown at checkout (components/CheckoutRules.tsx)
// - missed pickup = no_show as soon as the window ends, no refund; the business
//   may still hand it over for 12 h (complete_pickup / staff_collect):
//   20261107110000_schedules_and_pickup_rules.sql
// - reliability: -2 cancel, -15 no-show, +1 pickup, < 50 = restricted (can't reserve)
// - max 3 active reservations, one per offer: create_provider_payment_order
// - slider 1 h before the window until it ends, 2-minute undo
// - sign-up by phone (SMS code) or email + password (lib/useAuthForm.ts); the
//   slider is the main pickup, the 6-digit code the backup (13 Nov 2026)
// - 5 wrong pickup codes lock the order: 20261016141833_pickup_code_attempt_limit.sql
// - commission per business: 20261104081140_platform_fee_rate.sql; TBC split: lib/payments/tbc.ts

type TermsContent = {
  badge: string;
  title: string;
  intro: string;
  sections: ContentSection[];
  helpTitle: string;
  helpText: string;
  faqLabel: string;
  contactLabel: string;
};

export const termsContent: Localized<TermsContent> = {
  en: {
    badge: "Terms",
    title: "Terms of Use",
    intro:
      "These terms apply to the ArGadaagdo website and app, for customers and businesses alike. By using ArGadaagdo, you agree to them.",
    sections: [
      {
        title: "What ArGadaagdo is",
        paragraphs: [
          "ArGadaagdo is an online marketplace. Food businesses in Tbilisi use it to sell food they didn't sell that day as discounted Lunch Boxes. You reserve a Lunch Box in the app, pay online and collect it from the business in person.",
          "Each Lunch Box is prepared and sold by the business, which is responsible for the food. ArGadaagdo provides the platform, handles payment through TBC Bank and supports both sides.",
          `${operatorSentence("en")} In these terms, "we" and "us" mean the operator.`,
        ],
      },
      {
        title: "Your account",
        bullets: [
          `You must be at least ${MINIMUM_AGE} years old to create an account and reserve.`,
          "You sign up with your mobile number and a one-time SMS code, or with an email address and a password. If you use email, confirm it before you reserve.",
          "Before your first reservation, you confirm a Georgian mobile number with an SMS code. One phone number can be linked to one account only.",
          "Keep your password and SMS codes private. You are responsible for activity in your account.",
          "Keep your details accurate and up to date.",
        ],
      },
      {
        title: "Lunch Boxes",
        bullets: [
          "A Lunch Box contains food the business didn't sell that day. The exact contents aren't known in advance and can vary.",
          "Before you reserve, you see the business, the box size and category, the price, and the pickup date and time.",
          "Prices are in Georgian lari (GEL) and are final: customers pay no extra fees.",
          "If the business lists allergens, they appear on the offer page. If you have an allergy or dietary restriction, always check with the business before eating.",
        ],
      },
      {
        title: "Reservations and payment",
        bullets: [
          "Each reservation is for one Lunch Box. You can hold up to 3 active reservations at a time, one per offer.",
          "You pay online on TBC Bank's secure payment page. Your reservation is confirmed once the bank confirms the payment, and the order then appears in Orders.",
          "If a payment fails or isn't completed, the box goes back on sale and you aren't charged. If the bank charges you after your hold has been released, the amount is refunded automatically.",
          "We never see or store your card details. Only TBC Bank processes them.",
        ],
      },
      {
        id: "pickup",
        title: "Pickup",
        bullets: [
          "Collect your order in person from the business during the pickup window shown.",
          "At pickup, open the order in the app and slide to collect in front of staff. Staff can check the business name, the order number and the running clock on your screen. The 6-digit pickup code is a backup if the slider can't be used.",
          "The slider is available from 1 hour before the pickup window until the window ends. Slide only once the box is in your hands, because sliding completes the order. If you slide by mistake, you can undo it within 2 minutes.",
          "If you miss the pickup window, the order counts as a missed pickup and the payment isn't refunded. The business may still hand the box over if you come later, but it doesn't have to.",
          "After 5 incorrect code entries, the order is locked for security. Contact us to unlock it.",
        ],
      },
      {
        id: "cancellations",
        title: "Cancellations and refunds",
        bullets: [
          "You can cancel a reservation in Orders up to 2 hours before the pickup window starts. You receive a full refund to the card or account you paid with. TBC Bank processes the refund; when it appears depends on your bank.",
          "In the last 2 hours before pickup starts, cancellation is no longer possible, because the business is already preparing your box. If you reserve within those 2 hours, the reservation can't be cancelled; checkout tells you this before you pay.",
          "A missed pickup isn't refunded (see Pickup above).",
          "Your reliability score starts at 100: +1 for each pickup, −2 for each cancellation and −15 for each missed pickup. Businesses can see it. Below 50, new reservations are blocked automatically. If you think this is a mistake, write to us and a person will review it.",
          "Lunch Boxes are food that spoils quickly and is sold for a specific date, so the 14-day right of withdrawal for distance purchases doesn't apply to them. You can cancel as described above instead.",
          `If the business can't hand over your paid order, write to ${SUPPORT_EMAIL} with your order details, and we'll refund the full amount to the card or account you paid with. For any other problem with an order, write to us too, and we'll resolve it with you and the business.`,
        ],
      },
      {
        title: "Ratings and reviews",
        bullets: [
          "After a completed pickup, you can rate the business from 1 to 5 stars and add an optional comment, once per order.",
          "Reviews appear on the business's page without your name or email.",
          "Be honest and respectful. Anyone signed in can report a review, and we may hide reviews that are offensive, spam or false.",
        ],
      },
      {
        id: "businesses",
        title: "For businesses",
        bullets: [
          "A business can sell only after we approve it. The application includes the company's legal details, a phone number confirmed by SMS, a bank account (IBAN) and, optionally, an extract from the Public Registry. We review every application. We may decline an application (and tell you why) or pause a business for further review.",
          "The business is responsible for the food it sells: its safety and quality, compliance with food safety rules, accurate descriptions and allergen information, and handing over every paid order during the stated pickup window.",
          "Businesses also accept the Business Terms (argadaagdo.ge/business-terms) when they register.",
          "ArGadaagdo charges a commission on each paid order, at a rate agreed with each business in advance. There is no monthly fee. Where the business banks with TBC Bank, TBC splits every payment automatically: the business's share goes straight to the business and our commission to us. Otherwise the payment comes to us and we pass the business's share on every week.",
        ],
      },
      {
        title: "Fair use",
        paragraphs: [
          "Don't create fake accounts or reservations, try to get around payment, guess pickup codes, interfere with the service or use it for anything unlawful. We may suspend or close an account that breaks these terms.",
        ],
      },
      {
        title: "Deleting your account",
        paragraphs: [
          "You can delete your account at any time in Settings → Delete account (in the app or on the website), or by email request. First collect or cancel any active reservation. Our Privacy Policy explains both ways and what happens to your data.",
        ],
      },
      {
        title: "Liability",
        paragraphs: [
          "We work to keep ArGadaagdo available and accurate, but we can't promise it will always run without interruption. Each Lunch Box is prepared and sold by the business, which is responsible for the food. Nothing in these terms limits your rights under Georgian consumer protection law.",
        ],
      },
      {
        title: "Changes and governing law",
        paragraphs: [
          "We may update these terms as the service develops. The date above shows the current version, and we'll let you know about significant changes before they take effect.",
          `These terms are governed by the laws of Georgia. Questions? Write to ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        id: "operator",
        title: "Operator details",
        bullets: operatorDetails.en,
      },
    ],
    helpTitle: "Need clarification?",
    helpText: "Read the FAQ or write to us. We're happy to explain.",
    faqLabel: "FAQ",
    contactLabel: "Contact us",
  },
  ka: {
    badge: "წესები",
    title: "გამოყენების წესები",
    intro:
      "ეს წესები ვრცელდება არ გადააგდოს ვებსაიტსა და აპლიკაციაზე, როგორც მომხმარებლებზე, ისე ბიზნესებზე. სერვისით სარგებლობით ამ წესებს ეთანხმები.",
    sections: [
      {
        title: "რა არის არ გადააგდო",
        paragraphs: [
          "არ გადააგდო ონლაინ პლატფორმაა. თბილისის კვების ობიექტები აქ იმ დღეს გაუყიდავ საკვებს ლანჩ ბოქსების სახით, ფასდაკლებით ყიდიან. ლანჩ ბოქსს აპლიკაციაში დაჯავშნი, ონლაინ გადაიხდი და ბიზნესიდან თავად წაიღებ.",
          "ლანჩ ბოქსს ამზადებს და ყიდის ბიზნესი, რომელიც საკვებზე პასუხს აგებს. არ გადააგდო უზრუნველყოფს პლატფორმას, გადახდას TBC ბანკის მეშვეობით და ორივე მხარის მხარდაჭერას.",
          `${operatorSentence("ka")} ამ წესებში „ჩვენ“ ოპერატორს ნიშნავს.`,
        ],
      },
      {
        title: "ანგარიში",
        bullets: [
          `ანგარიშის შექმნა და დაჯავშნა მხოლოდ ${MINIMUM_AGE} წლიდან შეიძლება.`,
          "დარეგისტრირება შეგიძლია მობილურის ნომრითა და ერთჯერადი SMS კოდით, ან ელფოსტითა და პაროლით. თუ ელფოსტას იყენებ, დაჯავშნამდე ის უნდა დაადასტურო.",
          "პირველ ჯავშნამდე საქართველოს მობილურის ნომერს SMS კოდით ადასტურებ. ერთი ნომერი მხოლოდ ერთ ანგარიშზე შეიძლება იყოს მიბმული.",
          "პაროლსა და SMS კოდებს ნურავის გაუზიარებ. შენს ანგარიშში შესრულებულ მოქმედებებზე პასუხისმგებელი შენ ხარ.",
          "მიუთითე სწორი და აქტუალური მონაცემები.",
        ],
      },
      {
        title: "ლანჩ ბოქსი",
        bullets: [
          "ლანჩ ბოქსში ბიზნესის იმ დღეს გაუყიდავი საკვებია. ზუსტი შემადგენლობა წინასწარ ცნობილი არ არის და შეიძლება განსხვავდებოდეს.",
          "დაჯავშნამდე ხედავ ბიზნესს, ბოქსის ზომასა და კატეგორიას, ფასს, წაღების თარიღსა და დროს.",
          "ფასი ლარშია და საბოლოოა: მომხმარებელი დამატებით საკომისიოს არ იხდის.",
          "თუ ბიზნესს ალერგენები მითითებული აქვს, მათ შეთავაზების გვერდზე ნახავ. ალერგიის ან კვებითი შეზღუდვის შემთხვევაში ჭამამდე ყოველთვის ჰკითხე ბიზნესს.",
        ],
      },
      {
        title: "ჯავშანი და გადახდა",
        bullets: [
          "ერთი ჯავშანი ერთ ლანჩ ბოქსს მოიცავს. ერთდროულად შეიძლება გქონდეს მაქსიმუმ 3 აქტიური ჯავშანი, თითო შეთავაზებაზე ერთი.",
          "გადახდა ონლაინ ხდება, TBC ბანკის დაცულ გადახდის გვერდზე. ჯავშანი დასტურდება, როგორც კი ბანკი გადახდას დაადასტურებს, და შეკვეთა „შეკვეთებში“ გამოჩნდება.",
          "თუ გადახდა ვერ შესრულდა ან ბოლომდე არ მიიყვანე, ბოქსი ისევ გასაყიდად ბრუნდება და თანხა არ ჩამოგეჭრება. თუ ბანკმა თანხა ჯავშნის ვადის გასვლის შემდეგ ჩამოგაჭრა, ის ავტომატურად დაგიბრუნდება.",
          "ბარათის მონაცემებს ვერც ვხედავთ და არც ვინახავთ. მათ მხოლოდ TBC ბანკი ამუშავებს.",
        ],
      },
      {
        id: "pickup",
        title: "წაღება",
        bullets: [
          "შეკვეთა ბიზნესიდან თავად წაიღე, მითითებულ წაღების დროს.",
          "წაღებისას აპში გახსენი შეკვეთა და თანამშრომლის თვალწინ გადაასრიალე წაღების ღილაკი. თანამშრომელს შეუძლია შენს ეკრანზე შეამოწმოს ბიზნესის სახელი, შეკვეთის ნომერი და მოძრავი საათი. 6-ნიშნა წაღების კოდი სარეზერვოა, თუ გადასრიალება ვერ ხერხდება.",
          "წაღების ღილაკი აქტიურდება წაღების დაწყებამდე 1 საათით ადრე და აქტიური რჩება წაღების დროის დასრულებამდე. გადაასრიალე მხოლოდ მაშინ, როცა ბოქსი უკვე ხელში გაქვს, რადგან ეს შეკვეთას ასრულებს. შემთხვევით გადასრიალებას 2 წუთის განმავლობაში გააუქმებ.",
          "თუ წაღების დროს გამოტოვებ, შეკვეთა გამოტოვებულ წაღებად ჩაითვლება და თანხა არ დაგიბრუნდება. ბიზნესს შეუძლია ბოქსი მოგვიანებით მოსულსაც გადმოგცეს, მაგრამ ეს მისი ნებაა.",
          "კოდის 5-ჯერ არასწორად შეყვანის შემდეგ შეკვეთა უსაფრთხოების მიზნით იბლოკება. განსაბლოკად მოგვწერე.",
        ],
      },
      {
        id: "cancellations",
        title: "გაუქმება და თანხის დაბრუნება",
        bullets: [
          "ჯავშნის გაუქმება „შეკვეთებიდან“ შეგიძლია წაღების დაწყებამდე არაუგვიანეს 2 საათისა. სრული თანხა დაგიბრუნდება იმ ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე. დაბრუნებას TBC ბანკი ამუშავებს, ანგარიშზე ასახვის დრო კი შენს ბანკზეა დამოკიდებული.",
          "წაღების დაწყებამდე ბოლო 2 საათში ჯავშანს ვეღარ გააუქმებ, რადგან ბიზნესი შენს ბოქსს უკვე ამზადებს. თუ ამ 2 საათში დაჯავშნი, ჯავშანი გაუქმებას არ ექვემდებარება; ამას გადახდამდე გაჩვენებთ.",
          "გამოტოვებული წაღების თანხა არ ბრუნდება (იხ. „წაღება“ ზემოთ).",
          "სანდოობის ქულა 100-დან იწყება: ყოველი წაღება +1, ყოველი გაუქმება −2, ყოველი გამოტოვებული წაღება −15. ქულას ბიზნესი ხედავს. 50-ზე დაბლა ახალი ჯავშნები ავტომატურად იზღუდება. თუ ფიქრობ, რომ ეს შეცდომაა, მოგვწერე და საკითხს ადამიანი განიხილავს.",
          "ლანჩ ბოქსი სწრაფად მალფუჭებადი საკვებია, რომელიც კონკრეტული დღისთვის იყიდება, ამიტომ დისტანციური ნასყიდობისას უკან დაბრუნების 14-დღიანი უფლება მასზე არ ვრცელდება. სამაგიეროდ, ჯავშნის გაუქმება შეგიძლია ზემოთ აღწერილი წესით.",
          `თუ ბიზნესმა გადახდილი შეკვეთა ვერ გადმოგცა, მოგვწერე ${SUPPORT_EMAIL}-ზე შეკვეთის დეტალებით და სრულ თანხას დაგიბრუნებთ იმ ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე. შეკვეთასთან დაკავშირებული სხვა პრობლემის შემთხვევაშიც მოგვწერე და საკითხს შენთან და ბიზნესთან ერთად მოვაგვარებთ.`,
        ],
      },
      {
        title: "შეფასებები",
        bullets: [
          "დასრულებული წაღების შემდეგ ბიზნესს 1-დან 5 ვარსკვლავამდე შეაფასებ და, თუ გინდა, კომენტარსაც დატოვებ. თითო შეკვეთაზე ერთხელ.",
          "შეფასებები ბიზნესის გვერდზე ჩანს შენი სახელისა და ელფოსტის გარეშე.",
          "იყავი გულწრფელი და თავაზიანი. ნებისმიერ ავტორიზებულ მომხმარებელს შეუძლია შეფასებაზე საჩივრის გამოგზავნა. შეურაცხმყოფელ, ყალბ ან სპამის შემცველ შეფასებას შეიძლება დავმალოთ.",
        ],
      },
      {
        id: "businesses",
        title: "ბიზნესებისთვის",
        bullets: [
          "ბიზნესი გაყიდვას მხოლოდ დამტკიცების შემდეგ იწყებს. განაცხადი მოიცავს კომპანიის იურიდიულ მონაცემებს, SMS-ით დადასტურებულ ტელეფონის ნომერს, საბანკო ანგარიშის IBAN-ს და, სურვილისამებრ, საჯარო რეესტრის ამონაწერს. ყველა განაცხადს ვამოწმებთ. შეიძლება განაცხადი არ დავამტკიცოთ (მიზეზს მოგწერთ) ან ბიზნესი დამატებითი შემოწმებისთვის დროებით შევაჩეროთ.",
          "ბიზნესი პასუხს აგებს მის მიერ გაყიდულ საკვებზე: მის უვნებლობასა და ხარისხზე, სურსათის უვნებლობის მოთხოვნების დაცვაზე, ზუსტ აღწერასა და ალერგენების შესახებ ინფორმაციაზე, ასევე ყველა გადახდილი შეკვეთის მითითებულ დროს გადაცემაზე.",
          "ბიზნესები რეგისტრაციისას ასევე ეთანხმებიან ბიზნესის წესებს (argadaagdo.ge/business-terms).",
          "თითოეულ გადახდილ შეკვეთაზე არ გადააგდო იღებს საკომისიოს, რომლის განაკვეთიც თითოეულ ბიზნესთან წინასწარ თანხმდება. ყოველთვიური გადასახადი არ არის. თუ ბიზნესის ანგარიში TBC ბანკშია, TBC თითოეულ გადახდას ავტომატურად ყოფს (split): ბიზნესის წილი პირდაპირ ბიზნესს ერიცხება, ჩვენი საკომისიო კი — ჩვენ. სხვა შემთხვევაში გადახდა ჩვენთან შემოდის და ბიზნესის წილს ყოველ კვირა გადავურიცხავთ.",
        ],
      },
      {
        title: "კეთილსინდისიერი გამოყენება",
        paragraphs: [
          "აკრძალულია ყალბი ანგარიშების ან ჯავშნების შექმნა, გადახდის გვერდის ავლის მცდელობა, წაღების კოდების გამოცნობა, სერვისის მუშაობაში ჩარევა და მისი ნებისმიერი უკანონო მიზნით გამოყენება. წესების დარღვევისას შეიძლება ანგარიში შევაჩეროთ ან დავხუროთ.",
        ],
      },
      {
        title: "ანგარიშის წაშლა",
        paragraphs: [
          "ანგარიშის წაშლა ნებისმიერ დროს შეგიძლია: პარამეტრები → ანგარიშის წაშლა (აპლიკაციაში ან ვებსაიტზე), ან ელფოსტით მოთხოვნით. მანამდე აქტიური ჯავშანი წაიღე ან გააუქმე. ორივე გზა და ის, რა ემართება შენს მონაცემებს, აღწერილია კონფიდენციალურობის პოლიტიკაში.",
        ],
      },
      {
        title: "პასუხისმგებლობა",
        paragraphs: [
          "ვცდილობთ, არ გადააგდო ყოველთვის ხელმისაწვდომი და ზუსტი იყოს, თუმცა ვერ დაგპირდებით, რომ ის ყოველთვის შეფერხების გარეშე იმუშავებს. ლანჩ ბოქსს ამზადებს და ყიდის ბიზნესი, რომელიც საკვებზე პასუხს აგებს. ეს წესები არ ზღუდავს შენს უფლებებს, რომლებიც საქართველოს მომხმარებელთა უფლებების დაცვის კანონმდებლობით გაქვს.",
        ],
      },
      {
        title: "ცვლილებები და მოქმედი კანონმდებლობა",
        paragraphs: [
          "სერვისის განვითარებასთან ერთად ეს წესები შეიძლება განვაახლოთ. მოქმედი ვერსიის თარიღი ზემოთაა მითითებული, არსებითი ცვლილების შესახებ კი ძალაში შესვლამდე გაცნობებთ.",
          `ამ წესებზე ვრცელდება საქართველოს კანონმდებლობა. კითხვების შემთხვევაში მოგვწერე: ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        id: "operator",
        title: "ოპერატორის მონაცემები",
        bullets: operatorDetails.ka,
      },
    ],
    helpTitle: "გჭირდება განმარტება?",
    helpText: "გადახედე ხშირად დასმულ კითხვებს ან მოგვწერე. სიამოვნებით აგიხსნით.",
    faqLabel: "ხშირი კითხვები",
    contactLabel: "დაგვიკავშირდი",
  },
};
