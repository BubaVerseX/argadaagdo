import { SUPPORT_EMAIL, type ContentSection, type Localized } from "@/lib/legal/shared";

// Facts behind this page (checked 6 Nov 2026):
// - deletion: app/api/account/delete/route.ts + anonymize_account_for_deletion
//   (supabase/migrations/20261016104337_account_deletion.sql)
// - business verification data + private registry bucket:
//   supabase/migrations/20261105120000_business_verification.sql
// - SMS via ubill.ge (lib/sms/ubill.ts), email via Resend (lib/email/send.ts),
//   payments via TBC (lib/payments/tbc.ts), no analytics/ads SDKs (package.json)
// - device storage: Supabase session + "argadaagdo-language" (lib/useLanguage.ts),
//   business draft (BusinessOnboardingWizard), native feed cache (lib/nativeData.ts)
// - pickup codes readable only by the customer: get_my_pickup_codes()
// The "delete-account" anchor is the account-deletion URL in the store listings.

type PrivacyContent = {
  badge: string;
  title: string;
  intro: string;
  sections: ContentSection[];
  helpTitle: string;
  helpText: string;
  contactLabel: string;
};

export const privacyContent: Localized<PrivacyContent> = {
  en: {
    badge: "Privacy",
    title: "Privacy Policy",
    intro:
      "What personal data ArGadaagdo collects, why we use it, who receives it and how you stay in control.",
    sections: [
      {
        title: "Who we are",
        paragraphs: [
          `ArGadaagdo runs the ArGadaagdo website and app and is responsible for the personal data described here. For any privacy question or request, write to ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        title: "What we collect",
        bullets: [
          "Account: your email address and password. The password is stored only as a secure hash by our sign-in provider.",
          "Profile, if you add it: display name and phone number.",
          "Phone verification: your mobile number, when you confirm it with an SMS code.",
          "Orders: reservations, pickup codes, order and payment status, cancellations, completed and missed pickups, favourites, ratings and review comments, and your reliability score.",
          "Payments: the amount, the status and TBC Bank's payment reference. Never your card details.",
          "Businesses: business name, type, address and phone; legal name, identification code and legal form; the owner's full name; a phone number confirmed by SMS; a TBC Bank IBAN; a Public Registry extract; offers and offer photos.",
          "Support: the messages you send us.",
          "Technical data: our hosting providers keep standard server logs (such as IP address and browser or device type) to run and protect the service.",
          "Push notifications: if you allow them, a token that lets Apple's or Google's notification service reach your device.",
        ],
        note: "We don't access your location or contacts, and we don't use advertising identifiers.",
      },
      {
        title: "How we use it",
        bullets: [
          "To run your account and orders: reservations, payments, pickups, cancellations and refunds.",
          "To keep the marketplace safe and fair: confirming phone numbers (one number per account), checking businesses before approval, limiting pickup-code attempts, and a reliability score based on your pickups, cancellations and missed pickups.",
          "To send service emails: email confirmation and password reset, reservation confirmed, pickup reminder, pickup completed, a request to rate, and cancellation and refund updates. Businesses also receive the decision on their application.",
          "To keep the accounting records the law requires.",
          "To answer your support requests.",
        ],
        note: "We process your data to provide the service you use, to meet our legal obligations and for our legitimate interest in keeping ArGadaagdo safe. We send push notifications only with your consent. We don't sell personal data, show ads or track you across other apps and websites.",
      },
      {
        title: "Notifications",
        paragraphs: [
          "Emails about your account and orders are part of the service. Push notifications are optional. If you allow them, we send order confirmations, pickup reminders, cancellation and refund updates, and new Lunch Boxes from your favourites. They are delivered through Apple Push Notification service (iPhone) and Firebase Cloud Messaging (Android). You can turn them off at any time in the app's Settings or in your device settings.",
        ],
      },
      {
        title: "Who can see your data",
        bullets: [
          "The business you reserve from sees your reservation, your account email and your reliability score, so it can hand over your order.",
          "Ratings and review comments are shown publicly on the business's page, without your name or email.",
          "For approved businesses, the business name, address and other listing details are public.",
          "Public authorities, when the law requires it.",
        ],
      },
      {
        title: "Service providers",
        paragraphs: [
          "These providers process data on our behalf, only to run ArGadaagdo:",
        ],
        bullets: [
          "Supabase: database, sign-in and file storage, hosted in Frankfurt, Germany (EU).",
          "Vercel: hosting of the website and app servers, which run in Frankfurt, Germany (EU).",
          "TBC Bank: payments and refunds.",
          "ubill.ge: delivery of SMS verification codes.",
          "Resend: delivery of emails.",
          "Apple and Google: delivery of push notifications, if you allow them.",
        ],
      },
      {
        title: "International transfers",
        paragraphs: [
          "Some of these providers are based outside Georgia, including in the United States. Each receives only the data it needs for its task and is bound by its own data protection commitments.",
        ],
      },
      {
        title: "How long we keep it",
        bullets: [
          "Account and profile data: for as long as your account exists.",
          "Orders and payments: kept as accounting records for as long as Georgian accounting and tax law requires, including after account deletion, but no longer linked to you.",
          "Business verification: the owner's name, phone number and Public Registry extract are deleted with the account. The company's legal name, identification code and IBAN are kept for payout records.",
          "Server logs: kept by our hosting providers for a limited period.",
        ],
      },
      {
        title: "Storage on your device",
        paragraphs: [
          "We don't use advertising or analytics cookies or trackers. We store only what the service needs on your device: your sign-in session, your language choice, a business application draft while you fill it in and, in the app, a short-lived copy of the offers list so it opens faster.",
        ],
      },
      {
        title: "Security",
        paragraphs: [
          "All connections are encrypted (HTTPS). Card details are handled only by TBC Bank. Database rules limit who can read what: pickup codes are visible only to the customer, and Public Registry extracts are kept in private storage that only our administrators can open.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          `Under the Law of Georgia on Personal Data Protection, you can ask for access to your data and a copy of it, ask us to correct or delete it, or restrict how we use it, and withdraw consent you have given (for example, for push notifications). Write to ${SUPPORT_EMAIL}.`,
          "If you believe we have mishandled your data, you can also complain to the Personal Data Protection Service of Georgia.",
        ],
      },
      {
        id: "delete-account",
        title: "Deleting your account",
        paragraphs: [
          "You can delete your account at any time in the app: Settings → Delete account → Delete my account. First collect or cancel any active reservation. A business must first complete or resolve all of its reservations.",
        ],
        bullets: [
          "Deleted: your sign-in, email address, profile details (including your phone number) and favourites.",
          "Your review comments are removed. Your star ratings stay in the business's average, with no link to you.",
          "Order and payment records are kept for accounting, but no longer linked to you.",
          "Business accounts: the business and its offers are hidden; the owner's name, phone number and registry extract are deleted; the legal name, identification code and IBAN are kept for payout records.",
        ],
      },
      {
        title: "Changes to this policy",
        paragraphs: [
          "We update this policy when our practices change. The date above shows the current version, and we'll let you know about significant changes in advance.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          `Questions or requests about your data: ${SUPPORT_EMAIL}. We aim to reply within 1–2 business days.`,
        ],
      },
    ],
    helpTitle: "Questions about privacy?",
    helpText:
      "Write to us about your account, order or business data. We'll answer in plain language.",
    contactLabel: "Contact us",
  },
  ka: {
    badge: "კონფიდენციალურობა",
    title: "კონფიდენ­ციალუ­რობის პოლიტიკა",
    intro:
      "რა პერსონალურ მონაცემებს აგროვებს არ გადააგდო, რისთვის იყენებს, ვის უზიარებს და როგორ აკონტროლებ მათ შენ.",
    sections: [
      {
        title: "ვინ ვართ",
        paragraphs: [
          `არ გადააგდო მართავს არ გადააგდოს ვებსაიტსა და აპლიკაციას და პასუხისმგებელია აქ აღწერილ პერსონალურ მონაცემებზე. კონფიდენციალურობასთან დაკავშირებული ნებისმიერი კითხვით ან მოთხოვნით მოგვწერე: ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        title: "რა მონაცემებს ვაგროვებთ",
        bullets: [
          "ანგარიში: ელფოსტა და პაროლი. პაროლს ავტორიზაციის პროვაიდერი მხოლოდ დაშიფრული (ჰეშირებული) სახით ინახავს.",
          "პროფილი, თუ დაამატებ: სახელი და ტელეფონის ნომერი.",
          "ტელეფონის დადასტურება: მობილურის ნომერი, როცა მას SMS კოდით ადასტურებ.",
          "შეკვეთები: ჯავშნები, წაღების კოდები, შეკვეთისა და გადახდის სტატუსი, გაუქმებები, წაღებული და გამოტოვებული შეკვეთები, რჩეულები, შეფასებები და კომენტარები, ასევე სანდოობის ქულა.",
          "გადახდები: თანხა, სტატუსი და TBC ბანკის გადახდის იდენტიფიკატორი. ბარათის მონაცემები — არასდროს.",
          "ბიზნესები: დასახელება, ტიპი, მისამართი და ტელეფონი; იურიდიული დასახელება, საიდენტიფიკაციო კოდი და სამართლებრივი ფორმა; მფლობელის სახელი და გვარი; SMS-ით დადასტურებული ტელეფონის ნომერი; TBC ბანკის IBAN; საჯარო რეესტრის ამონაწერი; შეთავაზებები და მათი ფოტოები.",
          "მხარდაჭერა: შეტყობინებები, რომლებსაც გვიგზავნი.",
          "ტექნიკური მონაცემები: ჰოსტინგის პროვაიდერები სერვისის მუშაობისა და დაცვისთვის ინახავენ სტანდარტულ სერვერულ ჩანაწერებს (მაგალითად, IP მისამართს, ბრაუზერის ან მოწყობილობის ტიპს).",
          "Push-შეტყობინებები: თუ მათ დაუშვებ, მოწყობილობის ტოკენი, რომლითაც Apple-ის ან Google-ის შეტყობინებების სერვისი შენს მოწყობილობას პოულობს.",
        ],
        note: "შენს მდებარეობასა და კონტაქტებზე წვდომა არ გვაქვს და სარეკლამო იდენტიფიკატორებს არ ვიყენებთ.",
      },
      {
        title: "როგორ ვიყენებთ მონაცემებს",
        bullets: [
          "ანგარიშისა და შეკვეთების სამართავად: ჯავშნები, გადახდები, წაღება, გაუქმება და თანხის დაბრუნება.",
          "პლატფორმის უსაფრთხოებისა და სამართლიანობისთვის: ტელეფონის ნომრის დადასტურება (ერთი ნომერი — ერთი ანგარიში), ბიზნესების შემოწმება დამტკიცებამდე, წაღების კოდის მცდელობების შეზღუდვა და სანდოობის ქულა, რომელიც წაღებებს, გაუქმებებსა და გამოტოვებულ წაღებებს ეფუძნება.",
          "სერვისული წერილებისთვის: ელფოსტის დადასტურება და პაროლის აღდგენა, ჯავშნის დადასტურება, წაღების შეხსენება, წაღების დასრულება, შეფასების თხოვნა, გაუქმება და თანხის დაბრუნება. ბიზნესები ასევე იღებენ წერილს განაცხადის შედეგის შესახებ.",
          "კანონით მოთხოვნილი საბუღალტრო ჩანაწერების შესანახად.",
          "მხარდაჭერის მოთხოვნებზე საპასუხოდ.",
        ],
        note: "მონაცემებს ვამუშავებთ იმ სერვისის მისაწოდებლად, რომლითაც სარგებლობ, კანონით დაკისრებული ვალდებულებების შესასრულებლად და ჩვენი ლეგიტიმური ინტერესისთვის, რომ არ გადააგდო უსაფრთხო იყოს. Push-შეტყობინებებს მხოლოდ შენი თანხმობით ვაგზავნით. პერსონალურ მონაცემებს არ ვყიდით, რეკლამას არ ვაჩვენებთ და სხვა აპლიკაციებსა თუ ვებსაიტებზე თვალს არ გადევნებთ.",
      },
      {
        title: "შეტყობინებები",
        paragraphs: [
          "ელფოსტით შეტყობინებები ანგარიშისა და შეკვეთების შესახებ სერვისის ნაწილია. Push-შეტყობინებები ნებაყოფლობითია. თუ მათ დაუშვებ, მიიღებ შეკვეთის დადასტურებას, წაღების შეხსენებებს, ინფორმაციას გაუქმებისა და თანხის დაბრუნების შესახებ და ახალ ლანჩ ბოქსებს შენი რჩეულებიდან. ისინი იგზავნება Apple Push Notification service-ისა (iPhone) და Firebase Cloud Messaging-ის (Android) მეშვეობით. მათი გამორთვა ნებისმიერ დროს შეგიძლია აპლიკაციის პარამეტრებში ან მოწყობილობის პარამეტრებში.",
        ],
      },
      {
        title: "ვინ ხედავს შენს მონაცემებს",
        bullets: [
          "ბიზნესი, სადაც ლანჩ ბოქსი დაჯავშნე, ხედავს შენს ჯავშანს, ანგარიშის ელფოსტასა და სანდოობის ქულას, რომ შეკვეთა გადმოგცეს.",
          "შეფასებები და კომენტარები ბიზნესის გვერდზე საჯაროდ ჩანს, შენი სახელისა და ელფოსტის გარეშე.",
          "დამტკიცებული ბიზნესის დასახელება, მისამართი და სხვა საჯარო დეტალები ყველასთვის ხილულია.",
          "სახელმწიფო ორგანოები, როცა ამას კანონი მოითხოვს.",
        ],
      },
      {
        title: "მომსახურების პროვაიდერები",
        paragraphs: [
          "ეს პროვაიდერები მონაცემებს ჩვენი სახელით ამუშავებენ, მხოლოდ არ გადააგდოს მუშაობისთვის:",
        ],
        bullets: [
          "Supabase: მონაცემთა ბაზა, ავტორიზაცია და ფაილების საცავი; სერვერები ფრანკფურტშია, გერმანია (ევროკავშირი).",
          "Vercel: ვებსაიტისა და აპლიკაციის სერვერების ჰოსტინგი; სერვერები ფრანკფურტშია, გერმანია (ევროკავშირი).",
          "TBC ბანკი: გადახდები და თანხის დაბრუნება.",
          "ubill.ge: SMS კოდების მიწოდება.",
          "Resend: ელფოსტის მიწოდება.",
          "Apple და Google: Push-შეტყობინებების მიწოდება, თუ მათ დაუშვებ.",
        ],
      },
      {
        title: "მონაცემების საზღვარგარეთ გადაცემა",
        paragraphs: [
          "ზოგიერთი პროვაიდერი საქართველოს გარეთ, მათ შორის აშშ-ში მდებარეობს. თითოეული მათგანი მხოლოდ იმ მონაცემებს იღებს, რაც მისი ამოცანისთვის აუცილებელია, და მონაცემთა დაცვის საკუთარი ვალდებულებებით არის შეზღუდული.",
        ],
      },
      {
        title: "რამდენ ხანს ვინახავთ",
        bullets: [
          "ანგარიშისა და პროფილის მონაცემები: სანამ ანგარიში არსებობს.",
          "შეკვეთები და გადახდები: საბუღალტრო ჩანაწერებად ინახება იმ ვადით, რასაც საქართველოს საბუღალტრო და საგადასახადო კანონმდებლობა მოითხოვს, ანგარიშის წაშლის შემდეგაც, თუმცა შენთან კავშირის გარეშე.",
          "ბიზნესის ვერიფიკაცია: მფლობელის სახელი, ტელეფონის ნომერი და საჯარო რეესტრის ამონაწერი ანგარიშთან ერთად იშლება. კომპანიის იურიდიული დასახელება, საიდენტიფიკაციო კოდი და IBAN ანგარიშსწორების ჩანაწერებისთვის ინახება.",
          "სერვერული ჩანაწერები: ჰოსტინგის პროვაიდერებთან შეზღუდული ვადით ინახება.",
        ],
      },
      {
        title: "რას ვინახავთ შენს მოწყობილობაზე",
        paragraphs: [
          "სარეკლამო ან ანალიტიკურ ქუქი-ფაილებსა და ტრეკერებს არ ვიყენებთ. მოწყობილობაზე მხოლოდ ის ინახება, რაც სერვისის მუშაობას სჭირდება: ავტორიზაციის სესია, არჩეული ენა, ბიზნესის განაცხადის მონახაზი შევსების პროცესში და, აპლიკაციაში, შეთავაზებების სიის დროებითი ასლი, რომ სწრაფად გაიხსნას.",
        ],
      },
      {
        title: "უსაფრთხოება",
        paragraphs: [
          "ყველა კავშირი დაშიფრულია (HTTPS). ბარათის მონაცემებს მხოლოდ TBC ბანკი ამუშავებს. მონაცემთა ბაზის წესები ზღუდავს, ვის რისი ნახვა შეუძლია: წაღების კოდს მხოლოდ მომხმარებელი ხედავს, საჯარო რეესტრის ამონაწერები კი დახურულ საცავში ინახება, რომელზეც წვდომა მხოლოდ ჩვენს ადმინისტრატორებს აქვთ.",
        ],
      },
      {
        title: "შენი უფლებები",
        paragraphs: [
          `საქართველოს კანონის „პერსონალურ მონაცემთა დაცვის შესახებ“ თანახმად, შეგიძლია მოითხოვო შენს მონაცემებზე წვდომა და მათი ასლი, მათი გასწორება ან წაშლა, დამუშავების შეზღუდვა, ასევე გამოიხმო მოცემული თანხმობა (მაგალითად, Push-შეტყობინებებზე). მოგვწერე: ${SUPPORT_EMAIL}.`,
          "თუ ფიქრობ, რომ შენს მონაცემებს არასწორად ვამუშავებთ, შეგიძლია მიმართო პერსონალურ მონაცემთა დაცვის სამსახურს.",
        ],
      },
      {
        id: "delete-account",
        title: "ანგარიშის წაშლა",
        paragraphs: [
          "ანგარიშის წაშლა ნებისმიერ დროს შეგიძლია აპლიკაციაში: პარამეტრები → ანგარიშის წაშლა → ჩემი ანგარიშის წაშლა. მანამდე აქტიური ჯავშანი წაიღე ან გააუქმე. ბიზნესმა ჯერ ყველა მიმდინარე ჯავშანი უნდა დაასრულოს ან მოაგვაროს.",
        ],
        bullets: [
          "იშლება: ავტორიზაციის მონაცემები, ელფოსტა, პროფილის დეტალები (მათ შორის ტელეფონის ნომერი) და რჩეულები.",
          "შენი კომენტარები იშლება. ვარსკვლავებით შეფასება ბიზნესის საშუალო ქულაში რჩება, შენთან კავშირის გარეშე.",
          "შეკვეთებისა და გადახდების ჩანაწერები საბუღალტრო მიზნით ინახება, მაგრამ შენთან აღარ არის დაკავშირებული.",
          "ბიზნეს ანგარიში: ბიზნესი და მისი შეთავაზებები იმალება; მფლობელის სახელი, ტელეფონის ნომერი და რეესტრის ამონაწერი იშლება; იურიდიული დასახელება, საიდენტიფიკაციო კოდი და IBAN ანგარიშსწორების ჩანაწერებისთვის ინახება.",
        ],
      },
      {
        title: "ცვლილებები",
        paragraphs: [
          "ამ პოლიტიკას ვაახლებთ, როცა ჩვენი პრაქტიკა იცვლება. მოქმედი ვერსიის თარიღი ზემოთაა მითითებული, არსებითი ცვლილებების შესახებ კი წინასწარ გაცნობებთ.",
        ],
      },
      {
        title: "კონტაქტი",
        paragraphs: [
          `კითხვები ან მოთხოვნები შენს მონაცემებთან დაკავშირებით: ${SUPPORT_EMAIL}. ვცდილობთ, 1–2 სამუშაო დღეში გიპასუხოთ.`,
        ],
      },
    ],
    helpTitle: "გაქვს კითხვა კონფიდენ­ციალუ­რობაზე?",
    helpText:
      "მოგვწერე ანგარიშის, შეკვეთის ან ბიზნესის მონაცემების შესახებ. გიპასუხებთ მარტივად და გასაგებად.",
    contactLabel: "დაგვიკავშირდი",
  },
};
