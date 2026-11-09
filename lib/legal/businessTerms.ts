import {
  OPERATOR_NAME,
  OPERATOR_LOCATION,
  SUPPORT_EMAIL,
  type ContentSection,
  type Localized,
} from "@/lib/legal/shared";

// Business Terms (check-2 #12, 7 Nov 2026). Accepted with a checkbox in the
// last registration step; the acceptance is stored with the time
// (private.consent_events kind business_terms, BUSINESS_TERMS_VERSION in
// lib/consents.ts). Draft for the owner's lawyer. Facts:
// - commission per business (businesses.platform_fee_rate), TBC split payment
// - cancel until 2 h before pickup = full refund; missed pickup = sale stands;
//   late handover possible for 12 h (20261107110000_schedules_and_pickup_rules.sql)
// - customer email visible to the business for 30 days (business_can_view_customer)
// - deletion + retention: 20261107130000_business_profile_privacy.sql

export type BusinessTermsContent = {
  badge: string;
  title: string;
  intro: string;
  sections: ContentSection[];
};

export const businessTermsContent: Localized<BusinessTermsContent> = {
  en: {
    badge: "For businesses",
    title: "Business Terms",
    intro: `These terms are an agreement between your business and ${OPERATOR_NAME.en} (${OPERATOR_LOCATION.en}), who runs ArGadaagdo. They apply together with the general Terms of Use. You accept them when you register your business.`,
    sections: [
      {
        id: "joining",
        title: "Joining and verification",
        bullets: [
          "You register with your company's legal details, a phone number confirmed by SMS, an IBAN at a Georgian bank in the company's name and a Public Registry extract. The details must be true and up to date.",
          "We review every application and may decline it (we tell you why), ask for more information, or pause a business for further review.",
          "The person who registers confirms that they may act for the business.",
        ],
      },
      {
        id: "boxes",
        title: "Your Lunch Boxes",
        bullets: [
          "A Lunch Box contains good food that you didn't sell that day. Describe it honestly: category, size, price, how many and when it can be picked up.",
          "You set the price. If you show an original price, it must be the real usual price of the contents.",
          "Templates go live automatically at the time you choose; you can pause them or tap Stop sales for today at any time. Boxes already sold must still be handed over.",
        ],
      },
      {
        id: "food-safety",
        title: "Food safety",
        bullets: [
          "You are the seller of the food and responsible for it. You follow Georgian food safety law, including registration as a food business operator where required, hygiene and the right storage temperatures.",
          "You never put food past its use-by date or food that isn't safe to eat into a Lunch Box.",
          "You give customers allergen information when they ask, and add it to the offer when you can.",
        ],
      },
      {
        id: "handover",
        title: "Handing over orders",
        bullets: [
          "You hand over every paid order during the pickup window shown: the customer shows a 6-digit code (enter it in the dashboard or on the staff page) or slides to collect in front of your staff.",
          "If a customer comes after the window, you may still hand the order over with the code for 12 hours, but you don't have to.",
        ],
      },
      {
        id: "refunds",
        title: "Cancellations, missed pickups and refunds",
        bullets: [
          "Customers can cancel up to 2 hours before the pickup window starts and get a full refund. The box goes back on sale.",
          "If a customer misses the pickup window, the sale stands and the customer isn't refunded.",
          "If you can't hand over a paid order (sold out, closed, or the food isn't right), the customer gets a full refund, including your share. Tell us at once. Repeated failures can lead to a pause of your account.",
        ],
      },
      {
        id: "money",
        title: "Commission and payouts",
        bullets: [
          "There's no monthly fee. We charge a commission on each paid order at the rate agreed with you before you start; your dashboard report shows it.",
          "We change your rate only after telling you by email at least 30 days in advance. If you don't agree, you can stop before the new rate applies.",
          "With a TBC Bank account, TBC splits each payment automatically: your share goes straight to your company's account and our commission to ours, on TBC's usual settlement schedule; refunds are taken back the same way. With another Georgian bank, or while TBC has not yet switched on the split, the payment comes to us in full and every Monday we transfer your share, minus our commission, for the previous week's orders (picked up or missed). Refunded orders are not included.",
          "You are responsible for your own taxes and for any receipts the law requires you to give for your sales.",
        ],
      },
      {
        id: "customers",
        title: "Customer data",
        bullets: [
          "You see a customer's order, email (for 30 days) and reliability score only so you can hand over orders. Don't use them for anything else, including marketing, and don't share them.",
          "Ratings and reviews are the customers' own. Don't try to influence them with rewards or pressure. You can report a review that is offensive or false.",
        ],
      },
      {
        id: "content",
        title: "Your profile and photos",
        bullets: [
          "Your business profile (name, category, address, logo, cover photo, description, opening hours) and offer photos are shown in the app and on the website. You allow us to show them for as long as you use ArGadaagdo.",
          "Upload only pictures you own or may use. Your private phone number, legal details and IBAN are never shown publicly.",
        ],
      },
      {
        id: "ending",
        title: "Pausing and ending",
        bullets: [
          "You can pause selling at any time, and delete your account in Settings after all reservations are completed or resolved.",
          "We may pause or close a business account for food safety complaints, repeated orders not handed over, false information or misuse, with notice where possible.",
          "When an account is deleted, its profile, pictures, templates, IBAN and the owner's personal data are deleted. The company's legal name and ID code stay with its order records for 6 years for accounting.",
        ],
      },
      {
        id: "liability",
        title: "Liability",
        paragraphs: [
          "You are liable for the food you sell and for claims about it. Our total liability to your business is limited to the commission you paid us in the 3 months before the claim, except where the law doesn't allow such a limit.",
        ],
      },
      {
        id: "changes",
        title: "Changes and law",
        paragraphs: [
          "We tell you about important changes to these terms by email at least 30 days before they apply. These terms are governed by the laws of Georgia; disputes go to the courts of Tbilisi.",
          `Questions: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  ka: {
    badge: "ბიზნესებისთვის",
    title: "ბიზნესის წესები",
    intro: `ეს წესები შეთანხმებაა შენს ბიზნესსა და ${OPERATOR_NAME.ka}-ს (${OPERATOR_LOCATION.ka}) შორის, რომელიც არ გადააგდოს მართავს. ისინი გამოყენების ზოგად წესებთან ერთად მოქმედებს. მათ ბიზნესის რეგისტრაციისას ეთანხმები.`,
    sections: [
      {
        id: "joining",
        title: "რეგისტრაცია და შემოწმება",
        bullets: [
          "რეგისტრაციისთვის მიუთითებ კომპანიის იურიდიულ მონაცემებს, SMS-ით დადასტურებულ ტელეფონის ნომერს, კომპანიის სახელზე გახსნილი ანგარიშის IBAN-ს (საქართველოს ნებისმიერი ბანკი) და საჯარო რეესტრის ამონაწერს. მონაცემები უნდა იყოს ზუსტი და აქტუალური.",
          "ყველა განაცხადს ვამოწმებთ და შეიძლება არ დავამტკიცოთ (მიზეზს მოგწერთ), დამატებითი ინფორმაცია გთხოვოთ ან ბიზნესი დამატებითი შემოწმებისთვის დროებით შევაჩეროთ.",
          "ვინც ბიზნესს არეგისტრირებს, ადასტურებს, რომ ბიზნესის სახელით მოქმედების უფლება აქვს.",
        ],
      },
      {
        id: "boxes",
        title: "შენი ლანჩ ბოქსები",
        bullets: [
          "ლანჩ ბოქსში დევს ვარგისი საკვები, რომელიც იმ დღეს ვერ გაყიდე. აღწერე ის პატიოსნად: კატეგორია, ზომა, ფასი, რაოდენობა და წაღების დრო.",
          "ფასს შენ ადგენ. თუ საწყის ფასს უთითებ, ის შიგთავსის ნამდვილი ჩვეულებრივი ფასი უნდა იყოს.",
          "შაბლონები ავტომატურად შენ მიერ არჩეულ დროს ქვეყნდება; ნებისმიერ დროს შეგიძლია შეაჩერო ან დააჭირო „დღეს გაყიდვის შეჩერება“. უკვე გაყიდული ბოქსები მაინც უნდა გადასცე.",
        ],
      },
      {
        id: "food-safety",
        title: "სურსათის უვნებლობა",
        bullets: [
          "საკვების გამყიდველი შენ ხარ და მასზე პასუხს აგებ. იცავ საქართველოს სურსათის უვნებლობის კანონმდებლობას, მათ შორის, სადაც საჭიროა, ბიზნესოპერატორად რეგისტრაციას, ჰიგიენასა და შენახვის სწორ ტემპერატურას.",
          "ლანჩ ბოქსში არასდროს დებ ვადაგასულ (გამოყენების ბოლო ვადის გასულ) ან საჭმელად უვარგის საკვებს.",
          "მომხმარებელს მოთხოვნისას აწვდი ინფორმაციას ალერგენების შესახებ, და შესაძლებლობის შემთხვევაში შეთავაზებაშიც უთითებ.",
        ],
      },
      {
        id: "handover",
        title: "შეკვეთის გადაცემა",
        bullets: [
          "ყველა გადახდილ შეკვეთას მითითებულ დროს გადასცემ: მომხმარებელი აჩვენებს 6-ნიშნა კოდს (შეიყვანე პანელში ან თანამშრომლის გვერდზე) ან შენი თანამშრომლის თვალწინ გადაასრიალებს წაღების ღილაკს.",
          "თუ მომხმარებელი წაღების დროის შემდეგ მოვიდა, 12 საათის განმავლობაში შეგიძლია შეკვეთა კოდით მაინც გადასცე, თუმცა ვალდებული არ ხარ.",
        ],
      },
      {
        id: "refunds",
        title: "გაუქმება, გამოტოვებული წაღება და თანხის დაბრუნება",
        bullets: [
          "მომხმარებელს გაუქმება შეუძლია წაღების დაწყებამდე 2 საათით ადრე და სრულ თანხას იბრუნებს. ბოქსი ისევ გასაყიდად ბრუნდება.",
          "თუ მომხმარებელმა წაღების დრო გამოტოვა, გაყიდვა ძალაში რჩება და თანხა არ უბრუნდება.",
          "თუ გადახდილ შეკვეთას ვერ გადასცემ (გაიყიდა, დაკეტილია ან საკვები არ ვარგა), მომხმარებელს სრული თანხა უბრუნდება, შენი წილის ჩათვლით. მაშინვე შეგვატყობინე. განმეორებითი შემთხვევები შეიძლება ანგარიშის შეჩერებით დასრულდეს.",
        ],
      },
      {
        id: "money",
        title: "საკომისიო და ანგარიშსწორება",
        bullets: [
          "ყოველთვიური გადასახადი არ არის. თითოეულ გადახდილ შეკვეთაზე ვიღებთ საკომისიოს იმ განაკვეთით, რომელზეც დაწყებამდე შევთანხმდით; მას პანელის ანგარიშში ნახავ.",
          "განაკვეთს ვცვლით მხოლოდ მას შემდეგ, რაც ელფოსტით მინიმუმ 30 დღით ადრე გაცნობებთ. თუ არ ეთანხმები, შეგიძლია ახალი განაკვეთის ამოქმედებამდე შეწყვიტო თანამშრომლობა.",
          "თუ კომპანიის ანგარიში TBC ბანკშია, TBC თითოეულ გადახდას ავტომატურად ყოფს (split): შენი წილი პირდაპირ კომპანიის ანგარიშზე ირიცხება, ჩვენი საკომისიო კი — ჩვენსაზე, TBC-ის ჩვეულებრივი ანგარიშსწორების ვადებში; თანხის დაბრუნება იმავე გზით ხდება. სხვა ქართულ ბანკში, ან სანამ TBC split-ს ჩართავს, გადახდა სრულად ჩვენთან შემოდის და ყოველ ორშაბათს გადმოგირიცხავთ შენს წილს, ჩვენი საკომისიოს გამოკლებით, წინა კვირის შეკვეთებისთვის (გატანილი ან გაუტანელი). დაბრუნებული შეკვეთები არ შედის.",
          "შენს გადასახადებზე და კანონით მოთხოვნილ ჩეკებზე (ქვითრებზე) შენ აგებ პასუხს.",
        ],
      },
      {
        id: "customers",
        title: "მომხმარებლის მონაცემები",
        bullets: [
          "მომხმარებლის შეკვეთას, ელფოსტას (30 დღის განმავლობაში) და სანდოობის ქულას ხედავ მხოლოდ იმისთვის, რომ შეკვეთა გადასცე. სხვა მიზნით, მათ შორის რეკლამისთვის, არ გამოიყენო და არავის გაუზიარო.",
          "შეფასებები მომხმარებლებს ეკუთვნის. ნუ შეეცდები მათზე გავლენის მოხდენას საჩუქრებით ან ზეწოლით. შეურაცხმყოფელ ან ყალბ შეფასებაზე საჩივრის გამოგზავნა შეგიძლია.",
        ],
      },
      {
        id: "content",
        title: "შენი პროფილი და ფოტოები",
        bullets: [
          "ბიზნესის პროფილი (დასახელება, კატეგორია, მისამართი, ლოგო, ყდის ფოტო, აღწერა, სამუშაო საათები) და შეთავაზებების ფოტოები აპლიკაციასა და ვებსაიტზე ჩანს. გვაძლევ უფლებას, ისინი ვაჩვენოთ, სანამ არ გადააგდოთი სარგებლობ.",
          "ატვირთე მხოლოდ შენი ან ის ფოტოები, რომელთა გამოყენების უფლებაც გაქვს. შენი პირადი ტელეფონი, იურიდიული მონაცემები და IBAN საჯაროდ არასდროს ჩანს.",
        ],
      },
      {
        id: "ending",
        title: "შეჩერება და დასრულება",
        bullets: [
          "გაყიდვის შეჩერება ნებისმიერ დროს შეგიძლია, ანგარიშის წაშლა კი პარამეტრებში, მას შემდეგ, რაც ყველა ჯავშანი დასრულდება ან მოგვარდება.",
          "შეიძლება ბიზნეს ანგარიში შევაჩეროთ ან დავხუროთ სურსათის უვნებლობაზე საჩივრების, განმეორებით გადაუცემელი შეკვეთების, ყალბი ინფორმაციის ან ბოროტად გამოყენების გამო, შესაძლებლობის შემთხვევაში წინასწარი გაფრთხილებით.",
          "ანგარიშის წაშლისას იშლება მისი პროფილი, ფოტოები, შაბლონები, IBAN და მფლობელის პერსონალური მონაცემები. კომპანიის იურიდიული დასახელება და საიდენტიფიკაციო კოდი საბუღალტრო მიზნით შეკვეთების ჩანაწერებთან ერთად 6 წელი ინახება.",
        ],
      },
      {
        id: "liability",
        title: "პასუხისმგებლობა",
        paragraphs: [
          "შენ აგებ პასუხს შენ მიერ გაყიდულ საკვებზე და მასთან დაკავშირებულ პრეტენზიებზე. ჩვენი ჯამური პასუხისმგებლობა შენი ბიზნესის წინაშე შემოიფარგლება იმ საკომისიოთი, რომელიც პრეტენზიამდე ბოლო 3 თვეში გადაგვიხადე, გარდა იმ შემთხვევებისა, როცა კანონი ასეთ შეზღუდვას არ უშვებს.",
        ],
      },
      {
        id: "changes",
        title: "ცვლილებები და კანონმდებლობა",
        paragraphs: [
          "ამ წესების მნიშვნელოვანი ცვლილების შესახებ ელფოსტით გაცნობებთ ამოქმედებამდე მინიმუმ 30 დღით ადრე. ამ წესებზე ვრცელდება საქართველოს კანონმდებლობა; დავებს თბილისის სასამართლოები განიხილავს.",
          `კითხვები: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
};
