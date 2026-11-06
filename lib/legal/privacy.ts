import {
  MINIMUM_AGE,
  SUPPORT_EMAIL,
  operatorSentence,
  type ContentSection,
  type Localized,
} from "@/lib/legal/shared";

// Facts behind this page (checked 6 Nov 2026):
// - deletion: app/api/account/delete/route.ts + anonymize_account_for_deletion
//   (supabase/migrations/20261016104337_account_deletion.sql)
// - business verification data + private registry bucket:
//   supabase/migrations/20261105120000_business_verification.sql
// - SMS via ubill.ge (lib/sms/ubill.ts), email via Resend (lib/email/send.ts),
//   payments via TBC (lib/payments/tbc.ts), no analytics/ads SDKs (package.json)
// - device storage: Supabase session + "argadaagdo-language" (lib/useLanguage.ts),
//   business draft (BusinessOnboardingWizard), native feed cache (lib/nativeData.ts),
//   location choice (lib/location.ts), push flags (lib/push/client.ts),
//   welcome-seen (lib/accountGate.ts)
// - location stays on the device (lib/location.ts); map tiles from OpenFreeMap
//   (lib/mapStyle.ts); address search via Nominatim (app/api/geocode/route.ts)
// - push tokens: push_devices, removed on push off / app sign-out / deletion
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
          `${operatorSentence("en")} The operator runs the ArGadaagdo website and app and is responsible for the personal data described here (the data controller). For any privacy question or request, write to ${SUPPORT_EMAIL}.`,
          `ArGadaagdo is for people aged ${MINIMUM_AGE} and over. We don't knowingly collect data from anyone younger. If you believe someone under ${MINIMUM_AGE} has created an account, write to us and we'll delete it.`,
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
          "Push notifications: if you turn them on, your device's push token from Apple or Google, stored with your account. It's deleted when you turn push off, sign out in the app or delete your account.",
        ],
        note: "Location: if you allow it, your position is used only on your device, to sort boxes by distance and show you on the map. It isn't sent to our servers. Map images for the area on screen load from OpenFreeMap, which sees your IP address and that area. We don't access your contacts or use advertising identifiers.",
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
          "Apple (APNs) and Google (Firebase Cloud Messaging): delivery of push notifications, if you turn them on.",
          "OpenFreeMap: map images.",
          "OpenStreetMap Foundation (Nominatim): address search when a business sets its location. Our server sends only the typed address.",
          "Google (Gmail): our support inbox, which receives your support and privacy emails.",
        ],
      },
      {
        title: "International transfers",
        paragraphs: [
          "Some providers are outside Georgia, including companies in the United States. Each receives only the data its task needs. Where a provider offers them, we rely on its data processing terms and standard contractual safeguards.",
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
          "We don't use advertising or analytics cookies or trackers. We store only what the service needs on your device: your sign-in session, language, location choice (on or off, not your position), push settings (including whether we've already asked), whether you've seen the welcome screen, a business application draft while you fill it in and, in the app, a short-lived copy of the offers list so it opens faster.",
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
          "In the app: Profile → Settings → Delete account. On the website: Settings → Delete account. First collect or cancel any active reservation. A business must first complete or resolve all of its reservations.",
          `No app? Email ${SUPPORT_EMAIL} from your account's email address with the subject "Delete my account". We delete the account within 30 days.`,
        ],
        bullets: [
          "Deleted: your sign-in, email address, profile (including your phone number), favourites, push tokens and review comments.",
          "Kept, no longer linked to you: order and payment records (for accounting) and your star ratings (in the business's average).",
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
          `${operatorSentence("ka")} ოპერატორი მართავს არ გადააგდოს ვებსაიტსა და აპლიკაციას და პასუხისმგებელია აქ აღწერილ პერსონალურ მონაცემებზე (მონაცემთა დამმუშავებელი). კონფიდენციალურობასთან დაკავშირებული ნებისმიერი კითხვით ან მოთხოვნით მოგვწერე: ${SUPPORT_EMAIL}.`,
          `არ გადააგდო ${MINIMUM_AGE} წლის და უფროსი ასაკის ადამიანებისთვისაა. ${MINIMUM_AGE} წლამდე პირების მონაცემებს შეგნებულად არ ვაგროვებთ. თუ ფიქრობ, რომ ანგარიში ${MINIMUM_AGE} წლამდე პირმა შექმნა, მოგვწერე და მას წავშლით.`,
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
          "Push-შეტყობინებები: თუ მათ ჩართავ, შენი მოწყობილობის Push-ტოკენი Apple-ისგან ან Google-ისგან, რომელიც შენს ანგარიშთან ერთად ინახება. ის იშლება, როცა Push-ს გამორთავ, აპლიკაციიდან გამოხვალ ან ანგარიშს წაშლი.",
        ],
        note: "მდებარეობა: თუ მას დაუშვებ, შენი ადგილმდებარეობა მხოლოდ შენს მოწყობილობაზე გამოიყენება — ბოქსების მანძილით დასალაგებლად და რუკაზე შენი ადგილის საჩვენებლად. ის ჩვენს სერვერებზე არ იგზავნება. ეკრანზე ნაჩვენები ტერიტორიის რუკა OpenFreeMap-იდან იტვირთება, ამიტომ OpenFreeMap ხედავს შენს IP მისამართს და რუკის ამ მონაკვეთს. შენს კონტაქტებზე წვდომა არ გვაქვს და სარეკლამო იდენტიფიკატორებს არ ვიყენებთ.",
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
          "Apple (APNs) და Google (Firebase Cloud Messaging): Push-შეტყობინებების მიწოდება, თუ მათ ჩართავ.",
          "OpenFreeMap: რუკის გამოსახულებები.",
          "OpenStreetMap Foundation (Nominatim): მისამართის ძიება, როცა ბიზნესი თავის მდებარეობას უთითებს. ჩვენი სერვერი მხოლოდ შეყვანილ მისამართს აგზავნის.",
          "Google (Gmail): მხარდაჭერის ელფოსტა, სადაც შენი მხარდაჭერისა და კონფიდენციალურობის მოთხოვნები შემოდის.",
        ],
      },
      {
        title: "მონაცემების საზღვარგარეთ გადაცემა",
        paragraphs: [
          "ზოგიერთი პროვაიდერი საქართველოს გარეთაა, მათ შორის აშშ-ის კომპანიები. თითოეული მხოლოდ იმ მონაცემებს იღებს, რაც მის ამოცანას სჭირდება. სადაც პროვაიდერი ამას გვთავაზობს, ვეყრდნობით მის მონაცემთა დამუშავების პირობებსა და სტანდარტულ სახელშეკრულებო გარანტიებს.",
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
          "სარეკლამო ან ანალიტიკურ ქუქი-ფაილებსა და ტრეკერებს არ ვიყენებთ. მოწყობილობაზე მხოლოდ ის ინახება, რაც სერვისის მუშაობას სჭირდება: ავტორიზაციის სესია, არჩეული ენა, მდებარეობის არჩევანი (ჩართულია თუ არა, და არა თავად მდებარეობა), Push-შეტყობინებების პარამეტრები (მათ შორის, უკვე გკითხეთ თუ არა), ნახე თუ არა მისასალმებელი ეკრანი, ბიზნესის განაცხადის მონახაზი შევსების პროცესში და, აპლიკაციაში, შეთავაზებების სიის დროებითი ასლი, რომ სწრაფად გაიხსნას.",
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
          "აპლიკაციაში: პროფილი → პარამეტრები → ანგარიშის წაშლა. ვებსაიტზე: პარამეტრები → ანგარიშის წაშლა. მანამდე აქტიური ჯავშანი წაიღე ან გააუქმე. ბიზნესმა ჯერ ყველა მიმდინარე ჯავშანი უნდა დაასრულოს ან მოაგვაროს.",
          `აპლიკაცია არ გაქვს? მოგვწერე ${SUPPORT_EMAIL} მისამართზე იმ ელფოსტიდან, რომელზეც ანგარიში გაქვს, თემით „Delete my account“. ანგარიშს 30 დღის განმავლობაში წავშლით.`,
        ],
        bullets: [
          "იშლება: ავტორიზაციის მონაცემები, ელფოსტა, პროფილი (მათ შორის ტელეფონის ნომერი), რჩეულები, Push-ტოკენები და შენი კომენტარები.",
          "ინახება, მაგრამ შენთან აღარ არის დაკავშირებული: შეკვეთებისა და გადახდების ჩანაწერები (საბუღალტრო მიზნით) და ვარსკვლავებით შეფასებები (ბიზნესის საშუალო ქულაში).",
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
