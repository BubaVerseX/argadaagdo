import {
  MINIMUM_AGE,
  SUPPORT_EMAIL,
  operatorSentence,
  type ContentSection,
  type Localized,
} from "@/lib/legal/shared";

// Facts behind this page (checked 7 Nov 2026):
// - deletion: app/api/account/delete/route.ts + anonymize_account_for_deletion
//   (20261016104337_account_deletion.sql, business part 20261107130000)
// - consent to transfers abroad (PDP Law Art. 37): checkbox at sign-up and a
//   one-time screen for older accounts, stored in private.consent_events with
//   date and time (20261107120000_consents.sql, components/ConsentGate.tsx)
// - phone confirmed by SMS before the first order, Georgian mobiles only:
//   20261105120100_enforce_phone_verification.sql, lib/verification.ts
// - profile name + photo: 20261107090000_profile_name_avatar.sql
// - reliability score: +1 pickup, -2 cancel, -15 missed, < 50 blocked
// - SMS via ubill.ge (lib/sms/ubill.ts), email via Resend (lib/email/send.ts),
//   payments via TBC (lib/payments/tbc.ts), push via APNs/FCM (lib/push/send.ts),
//   no analytics/ads SDKs (package.json)
// - database: Supabase Frankfurt since 6 Nov 2026; the old Sydney project is a
//   backup copy until 27 Nov 2026 (owner deletes it then)
// - location stays on the device (lib/location.ts); map tiles from OpenFreeMap
//   (lib/mapStyle.ts); address search via Nominatim (app/api/geocode/route.ts)
// - help chat: components/SupportChat.tsx + app/api/support (Anthropic API,
//   nothing stored; "Write to us" emails the chat via Resend), 10 Nov 2026
// - complaints: State Audit Office (took over from the Personal Data
//   Protection Service on 2 March 2026)
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
      "What personal data ArGadaagdo collects, why we use it, who receives it and where, and how you stay in control.",
    sections: [
      {
        id: "who",
        title: "Who we are",
        paragraphs: [
          `${operatorSentence("en")} The operator runs the ArGadaagdo website and app and is responsible for the personal data described here (the data controller). For any privacy question or request, write to ${SUPPORT_EMAIL}.`,
          `ArGadaagdo is for people aged ${MINIMUM_AGE} and over. We don't knowingly collect data from anyone younger. If you believe someone under ${MINIMUM_AGE} has created an account, write to us and we'll delete it.`,
        ],
      },
      {
        id: "collect",
        title: "What we collect",
        bullets: [
          "Account: your email address and password. The password is stored only as a secure hash by our sign-in provider.",
          "Your consents, with the date and time you gave them: to the transfer of data abroad (see below), to notifications and, for businesses, to the Business Terms.",
          "Profile, if you add it: your display name and profile photo.",
          "Phone number: required before your first order and confirmed with an SMS code. One number can belong to one account. Only Georgian mobile numbers can be confirmed.",
          "Orders: reservations, pickup codes, order and payment status, cancellations, completed and missed pickups, favourites, ratings and review comments, and your reliability score.",
          "Payments: the amount, the status and TBC Bank's payment reference. Never your card details.",
          "Businesses: the public business profile (name, category, address, logo, cover photo, description and opening hours); legal name, identification code and legal form; the owner's full name; a phone number confirmed by SMS; a bank account (IBAN); a Public Registry extract; offers and offer photos.",
          "Support: the messages you send us. In the help chat, your questions and, if you're signed in, a short summary of your own orders or business settings (never pickup codes, phone numbers, IBANs or card details) are used only to answer you, and we don't store the chat. If you press \"Write to us\", the chat is emailed to our support inbox.",
          "Technical data: our hosting providers keep standard server logs (such as IP address and browser or device type) to run and protect the service.",
          "Push notifications: if you turn them on, your device's push token from Apple or Google, stored with your account. It's deleted when you turn push off, sign out in the app or delete your account.",
        ],
        note: "Location: if you allow it, your position is used only on your device, to sort boxes by distance and show you on the map. It isn't sent to our servers. Map images for the area on screen load from OpenFreeMap, which sees your IP address and that area. We don't access your contacts or use advertising identifiers.",
      },
      {
        id: "use",
        title: "Why we use it",
        bullets: [
          "To provide the service you signed up for (your account, reservations, payments, pickups, cancellations and refunds).",
          "To keep the marketplace safe and fair, which is our legitimate interest: confirming phone numbers, checking businesses before approval, limiting pickup-code attempts and the reliability score.",
          "To send service emails: email confirmation and password reset, order confirmed, pickup reminder, pickup completed, a request to rate, and cancellation and refund updates. Businesses also receive the decision on their application.",
          "To keep the accounting records the law requires.",
          "With your consent: transferring data to our providers abroad, and push notifications.",
          "To answer your support requests.",
        ],
        note: "We don't sell personal data, show ads or track you across other apps and websites.",
      },
      {
        id: "reliability",
        title: "Automatic reliability score",
        paragraphs: [
          "Every account starts with 100 points. A pickup adds 1, a cancellation takes away 2 and a missed pickup takes away 15. If the business still hands over a missed order, those 15 points come back. Businesses see your score. Below 50 points, the system automatically blocks new reservations on your account.",
          `This is an automatic decision. You can ask for a person to review it: write to ${SUPPORT_EMAIL}, tell us why you think it's wrong, and we'll check your orders and can restore your access.`,
        ],
      },
      {
        id: "notifications",
        title: "Notifications",
        paragraphs: [
          "Emails about your account and orders are part of the service. Push notifications are optional and have two separate switches in Settings: order updates (confirmations, pickup reminders, cancellations and refunds) and new boxes from places you saved. Each is off until you turn it on, and each account on a phone is asked separately. They're delivered through Apple Push Notification service (iPhone) and Firebase Cloud Messaging (Android). You can turn them off at any time in Settings or in your device settings.",
        ],
      },
      {
        id: "visibility",
        title: "Who can see your data",
        bullets: [
          "The business you reserve from sees your reservation, your account email (for 30 days) and your reliability score, so it can hand over your order.",
          "Ratings and review comments are shown publicly on the business's page, without your name or email.",
          "For approved businesses, the business profile is public: name, category, address, logo, cover photo, description and opening hours. The owner's personal phone number, the legal details and the IBAN are never public.",
          "Public authorities, when the law requires it.",
        ],
      },
      {
        id: "providers",
        title: "Service providers and where they are",
        paragraphs: [
          "These providers process data on our behalf, only to run ArGadaagdo, and receive only the data their task needs:",
        ],
        bullets: [
          "Supabase Inc. (USA): database, sign-in and file storage. Servers in Frankfurt, Germany (EU).",
          "Old database copy: until 27 November 2026, a backup copy of the database as it was on 6 November 2026 is kept on Supabase servers in Sydney, Australia. It is deleted on that date.",
          "Vercel Inc. (USA): website and app servers in Frankfurt, Germany (EU); pages are delivered through Vercel's worldwide network.",
          "Resend Inc. (USA): delivery of emails.",
          "Google LLC (USA): delivery of Android push notifications (Firebase Cloud Messaging) and our support inbox (Gmail).",
          "Apple Inc. (USA): delivery of iPhone push notifications.",
          "TBC Bank (Georgia): payments and refunds.",
          "ubill.ge (Georgia): delivery of SMS codes.",
          "Anthropic PBC (USA): the AI (Claude) that answers in the help chat. It receives the chat and the summary needed to answer, and doesn't use them to train its models.",
          "OpenFreeMap: map images, from servers outside Georgia.",
          "OpenStreetMap Foundation (United Kingdom): address search (Nominatim) when a business sets its location. Our server sends only the typed address.",
        ],
      },
      {
        id: "transfers",
        title: "Transfers outside Georgia and your consent",
        paragraphs: [
          "Some of these providers process data outside Georgia: in the United States, the European Union (Germany), the United Kingdom and Australia. Not all of these countries are recognised by Georgia as giving an adequate level of protection.",
          "We therefore transfer your data abroad only with your written consent under Article 37 of the Law of Georgia on Personal Data Protection. You give it with the checkbox when you create your account (older accounts are asked once when they next sign in), and we store the date and time. Each provider is bound by its data processing terms.",
          "ArGadaagdo can't work without these providers. You can withdraw your consent at any time by deleting your account, after which we stop transferring your data.",
        ],
      },
      {
        id: "retention",
        title: "How long we keep it",
        bullets: [
          "Account, profile, phone number and consent records: for as long as your account exists.",
          "Orders and payments: kept as accounting records for 6 years, as Georgian tax law requires, including after account deletion, but no longer linked to you.",
          "Business accounts: see Deleting your account below. Applications that were rejected and not sent again are deleted after 90 days.",
          "SMS sending log: only coded (hashed) numbers, deleted after 7 days.",
          "Server logs: kept by our hosting providers for a limited period.",
        ],
      },
      {
        id: "device",
        title: "Storage on your device",
        paragraphs: [
          "We don't use advertising or analytics cookies or trackers. We store only what the service needs on your device: your sign-in session, language, location choice (on or off, not your position), push settings (including whether we've already asked), whether you've already confirmed your consent, whether you've seen the welcome screen, a business application draft while you fill it in and, in the app, a short-lived copy of the offers list so it opens faster.",
        ],
      },
      {
        id: "security",
        title: "Security",
        paragraphs: [
          "All connections are encrypted (HTTPS). Card details are handled only by TBC Bank. Database rules limit who can read what: pickup codes are visible only to the customer, and Public Registry extracts are kept in private storage that only our administrators can open. Administrator sign-in needs a second step (a code from an authenticator app).",
        ],
      },
      {
        id: "rights",
        title: "Your rights",
        paragraphs: [
          "Under the Law of Georgia on Personal Data Protection, you have the right to:",
        ],
        bullets: [
          "know whether and how we process your data;",
          "get access to your data and a copy of it, also in a common machine-readable format;",
          "have it corrected, updated or completed;",
          "have it deleted;",
          "have its processing restricted (blocked);",
          "object to processing based on our legitimate interest;",
          "withdraw any consent you gave, at any time (this doesn't affect processing before the withdrawal);",
          "ask for a person to review an automatic decision, such as a reservation block by the reliability score.",
        ],
        note: `Write to ${SUPPORT_EMAIL}. We reply within 10 working days. If you believe we have mishandled your data, you can complain to the State Audit Office of Georgia, which supervises personal data protection since 2 March 2026, or go to court.`,
      },
      {
        id: "delete-account",
        title: "Deleting your account",
        paragraphs: [
          "In the app: Profile → Settings → Delete account. On the website: Settings → Delete account. First collect or cancel any active reservation. A business must first complete or resolve all of its reservations.",
          `No app? Email ${SUPPORT_EMAIL} from your account's email address with the subject "Delete my account". We delete the account within 10 working days and confirm by email.`,
        ],
        bullets: [
          "Deleted: your sign-in, email address, profile (including name, photo and phone number), consents, favourites, push tokens and review comments.",
          "Kept for 6 years, no longer linked to you: order and payment records (for accounting) and your star ratings (in the business's average).",
          "Business accounts: the business profile, logo and photos, templates and offers are removed from the app; the owner's name, phone number, IBAN and registry extract are deleted. The company's legal name and identification code stay with its order records for 6 years for accounting, then they are deleted.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        paragraphs: [
          "We update this policy when our practices change. The date above shows the current version, and we'll let you know about significant changes in advance.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [
          `Questions or requests about your data: ${SUPPORT_EMAIL}. We aim to reply within 1–2 business days, and always within 10 working days.`,
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
      "რა პერსონალურ მონაცემებს აგროვებს არ გადააგდო, რისთვის იყენებს, ვის და სად გადასცემს და როგორ აკონტროლებ მათ შენ.",
    sections: [
      {
        id: "who",
        title: "ვინ ვართ",
        paragraphs: [
          `${operatorSentence("ka")} ოპერატორი მართავს არ გადააგდოს ვებსაიტსა და აპლიკაციას და პასუხისმგებელია აქ აღწერილ პერსონალურ მონაცემებზე (მონაცემთა დამმუშავებელი). კონფიდენციალურობასთან დაკავშირებული ნებისმიერი კითხვით ან მოთხოვნით მოგვწერე: ${SUPPORT_EMAIL}.`,
          `არ გადააგდო ${MINIMUM_AGE} წლის და უფროსი ასაკის ადამიანებისთვისაა. ${MINIMUM_AGE} წლამდე პირების მონაცემებს შეგნებულად არ ვაგროვებთ. თუ ფიქრობ, რომ ანგარიში ${MINIMUM_AGE} წლამდე პირმა შექმნა, მოგვწერე და მას წავშლით.`,
        ],
      },
      {
        id: "collect",
        title: "რა მონაცემებს ვაგროვებთ",
        bullets: [
          "ანგარიში: ელფოსტა და პაროლი. პაროლს ავტორიზაციის პროვაიდერი მხოლოდ დაშიფრული (ჰეშირებული) სახით ინახავს.",
          "შენი თანხმობები, მათი მოცემის თარიღითა და დროით: მონაცემების საზღვარგარეთ გადაცემაზე (იხ. ქვემოთ), შეტყობინებებზე და, ბიზნესებისთვის, ბიზნესის წესებზე.",
          "პროფილი, თუ დაამატებ: სახელი და პროფილის ფოტო.",
          "ტელეფონის ნომერი: სავალდებულოა პირველ შეკვეთამდე და დასტურდება SMS კოდით. ერთი ნომერი მხოლოდ ერთ ანგარიშს შეიძლება ეკუთვნოდეს. დადასტურება მხოლოდ საქართველოს მობილურის ნომრებით შეიძლება.",
          "შეკვეთები: ჯავშნები, წაღების კოდები, შეკვეთისა და გადახდის სტატუსი, გაუქმებები, წაღებული და გამოტოვებული შეკვეთები, რჩეულები, შეფასებები და კომენტარები, ასევე სანდოობის ქულა.",
          "გადახდები: თანხა, სტატუსი და TBC ბანკის გადახდის იდენტიფიკატორი. ბარათის მონაცემები — არასდროს.",
          "ბიზნესები: ბიზნესის საჯარო პროფილი (დასახელება, კატეგორია, მისამართი, ლოგო, ყდის ფოტო, აღწერა და სამუშაო საათები); იურიდიული დასახელება, საიდენტიფიკაციო კოდი და სამართლებრივი ფორმა; მფლობელის სახელი და გვარი; SMS-ით დადასტურებული ტელეფონის ნომერი; საბანკო ანგარიშის IBAN; საჯარო რეესტრის ამონაწერი; შეთავაზებები და მათი ფოტოები.",
          "მხარდაჭერა: შეტყობინებები, რომლებსაც გვიგზავნი. დახმარების ჩატში შენი კითხვები და, თუ შესული ხარ, მოკლე ინფორმაცია შენს შეკვეთებზე ან ბიზნესის პარამეტრებზე (არასდროს — წაღების კოდები, ტელეფონის ნომრები, IBAN-ები ან ბარათის მონაცემები) მხოლოდ პასუხის გასაცემად გამოიყენება და ჩატს არ ვინახავთ. თუ „მოგვწერე“-ს დააჭერ, ჩატი ჩვენი მხარდაჭერის ელფოსტაზე იგზავნება.",
          "ტექნიკური მონაცემები: ჰოსტინგის პროვაიდერები სერვისის მუშაობისა და დაცვისთვის ინახავენ სტანდარტულ სერვერულ ჩანაწერებს (მაგალითად, IP მისამართს, ბრაუზერის ან მოწყობილობის ტიპს).",
          "Push-შეტყობინებები: თუ მათ ჩართავ, შენი მოწყობილობის Push-ტოკენი Apple-ისგან ან Google-ისგან, რომელიც შენს ანგარიშთან ერთად ინახება. ის იშლება, როცა Push-ს გამორთავ, აპლიკაციიდან გამოხვალ ან ანგარიშს წაშლი.",
        ],
        note: "მდებარეობა: თუ მას დაუშვებ, შენი ადგილმდებარეობა მხოლოდ შენს მოწყობილობაზე გამოიყენება — ბოქსების მანძილით დასალაგებლად და რუკაზე შენი ადგილის საჩვენებლად. ის ჩვენს სერვერებზე არ იგზავნება. ეკრანზე ნაჩვენები ტერიტორიის რუკა OpenFreeMap-იდან იტვირთება, ამიტომ OpenFreeMap ხედავს შენს IP მისამართს და რუკის ამ მონაკვეთს. შენს კონტაქტებზე წვდომა არ გვაქვს და სარეკლამო იდენტიფიკატორებს არ ვიყენებთ.",
      },
      {
        id: "use",
        title: "რისთვის ვიყენებთ",
        bullets: [
          "იმ სერვისის მისაწოდებლად, რომელზეც დარეგისტრირდი (ანგარიში, ჯავშნები, გადახდები, წაღება, გაუქმება და თანხის დაბრუნება).",
          "პლატფორმის უსაფრთხოებისა და სამართლიანობისთვის, რაც ჩვენი ლეგიტიმური ინტერესია: ტელეფონის ნომრის დადასტურება, ბიზნესების შემოწმება დამტკიცებამდე, წაღების კოდის მცდელობების შეზღუდვა და სანდოობის ქულა.",
          "სერვისული წერილებისთვის: ელფოსტის დადასტურება და პაროლის აღდგენა, შეკვეთის დადასტურება, წაღების შეხსენება, წაღების დასრულება, შეფასების თხოვნა, გაუქმება და თანხის დაბრუნება. ბიზნესები ასევე იღებენ წერილს განაცხადის შედეგის შესახებ.",
          "კანონით მოთხოვნილი საბუღალტრო ჩანაწერების შესანახად.",
          "შენი თანხმობით: მონაცემების საზღვარგარეთ მყოფი პროვაიდერებისთვის გადასაცემად და Push-შეტყობინებებისთვის.",
          "მხარდაჭერის მოთხოვნებზე საპასუხოდ.",
        ],
        note: "პერსონალურ მონაცემებს არ ვყიდით, რეკლამას არ ვაჩვენებთ და სხვა აპლიკაციებსა თუ ვებსაიტებზე თვალს არ გადევნებთ.",
      },
      {
        id: "reliability",
        title: "სანდოობის ავტომატური ქულა",
        paragraphs: [
          "ყოველი ანგარიში 100 ქულით იწყება. წაღება ამატებს 1 ქულას, გაუქმება აკლებს 2-ს, გამოტოვებული წაღება კი 15-ს. თუ ბიზნესმა გამოტოვებული შეკვეთა მაინც გადმოგცა, ეს 15 ქულა გიბრუნდება. ქულას ბიზნესები ხედავენ. 50 ქულაზე დაბლა სისტემა ახალ ჯავშნებს შენს ანგარიშზე ავტომატურად ზღუდავს.",
          `ეს ავტომატური გადაწყვეტილებაა. შეგიძლია მოითხოვო, რომ ის ადამიანმა გადახედოს: მოგვწერე ${SUPPORT_EMAIL}-ზე, აგვიხსენი, რატომ ფიქრობ, რომ ეს შეცდომაა, ჩვენ შევამოწმებთ შენს შეკვეთებს და შეგვიძლია წვდომა აღგიდგინოთ.`,
        ],
      },
      {
        id: "notifications",
        title: "შეტყობინებები",
        paragraphs: [
          "ელფოსტით შეტყობინებები ანგარიშისა და შეკვეთების შესახებ სერვისის ნაწილია. Push-შეტყობინებები ნებაყოფლობითია და პარამეტრებში ორი ცალკე ღილაკი აქვს: შეკვეთების განახლებები (დადასტურება, წაღების შეხსენება, გაუქმება და თანხის დაბრუნება) და ახალი ბოქსები შენახული ადგილებიდან. ორივე გამორთულია, სანამ თავად არ ჩართავ, და ტელეფონზე ყოველ ანგარიშს ცალკე ვეკითხებით. ისინი იგზავნება Apple Push Notification service-ისა (iPhone) და Firebase Cloud Messaging-ის (Android) მეშვეობით. მათი გამორთვა ნებისმიერ დროს შეგიძლია პარამეტრებში ან მოწყობილობის პარამეტრებში.",
        ],
      },
      {
        id: "visibility",
        title: "ვინ ხედავს შენს მონაცემებს",
        bullets: [
          "ბიზნესი, სადაც ლანჩ ბოქსი დაჯავშნე, ხედავს შენს ჯავშანს, ანგარიშის ელფოსტას (30 დღის განმავლობაში) და სანდოობის ქულას, რომ შეკვეთა გადმოგცეს.",
          "შეფასებები და კომენტარები ბიზნესის გვერდზე საჯაროდ ჩანს, შენი სახელისა და ელფოსტის გარეშე.",
          "დამტკიცებული ბიზნესის პროფილი საჯაროა: დასახელება, კატეგორია, მისამართი, ლოგო, ყდის ფოტო, აღწერა და სამუშაო საათები. მფლობელის პირადი ტელეფონის ნომერი, იურიდიული მონაცემები და IBAN არასდროს ჩანს საჯაროდ.",
          "სახელმწიფო ორგანოები, როცა ამას კანონი მოითხოვს.",
        ],
      },
      {
        id: "providers",
        title: "მომსახურების პროვაიდერები და მათი მდებარეობა",
        paragraphs: [
          "ეს პროვაიდერები მონაცემებს ჩვენი სახელით ამუშავებენ, მხოლოდ არ გადააგდოს მუშაობისთვის, და იღებენ მხოლოდ იმას, რაც მათ ამოცანას სჭირდება:",
        ],
        bullets: [
          "Supabase Inc. (აშშ): მონაცემთა ბაზა, ავტორიზაცია და ფაილების საცავი. სერვერები ფრანკფურტშია, გერმანია (ევროკავშირი).",
          "მონაცემთა ბაზის ძველი ასლი: 2026 წლის 27 ნოემბრამდე Supabase-ის სერვერებზე სიდნეიში, ავსტრალია, ინახება მონაცემთა ბაზის სარეზერვო ასლი 2026 წლის 6 ნოემბრის მდგომარეობით. ამ თარიღს ის წაიშლება.",
          "Vercel Inc. (აშშ): ვებსაიტისა და აპლიკაციის სერვერები ფრანკფურტში, გერმანია (ევროკავშირი); გვერდები Vercel-ის მსოფლიო ქსელით მიეწოდება.",
          "Resend Inc. (აშშ): ელფოსტის მიწოდება.",
          "Google LLC (აშშ): Android-ის Push-შეტყობინებების მიწოდება (Firebase Cloud Messaging) და ჩვენი მხარდაჭერის ელფოსტა (Gmail).",
          "Apple Inc. (აშშ): iPhone-ის Push-შეტყობინებების მიწოდება.",
          "TBC ბანკი (საქართველო): გადახდები და თანხის დაბრუნება.",
          "ubill.ge (საქართველო): SMS კოდების მიწოდება.",
          "Anthropic PBC (აშშ): AI (Claude), რომელიც დახმარების ჩატში პასუხობს. ის იღებს ჩატს და პასუხისთვის საჭირო ინფორმაციას და მათ თავისი მოდელების გასაწვრთნელად არ იყენებს.",
          "OpenFreeMap: რუკის გამოსახულებები, საქართველოს გარეთ მდებარე სერვერებიდან.",
          "OpenStreetMap Foundation (გაერთიანებული სამეფო): მისამართის ძიება (Nominatim), როცა ბიზნესი თავის მდებარეობას უთითებს. ჩვენი სერვერი მხოლოდ შეყვანილ მისამართს აგზავნის.",
        ],
      },
      {
        id: "transfers",
        title: "მონაცემების საზღვარგარეთ გადაცემა და შენი თანხმობა",
        paragraphs: [
          "ზოგიერთი ეს პროვაიდერი მონაცემებს საქართველოს გარეთ ამუშავებს: აშშ-ში, ევროკავშირში (გერმანია), გაერთიანებულ სამეფოსა და ავსტრალიაში. ყველა ეს ქვეყანა საქართველოს მიერ მონაცემთა დაცვის ადეკვატური დონის მქონედ აღიარებული არ არის.",
          "ამიტომ შენს მონაცემებს საზღვარგარეთ მხოლოდ შენი წერილობითი თანხმობით გადავცემთ, საქართველოს კანონის „პერსონალურ მონაცემთა დაცვის შესახებ“ 37-ე მუხლის შესაბამისად. თანხმობას ანგარიშის შექმნისას მონიშნული ველით იძლევი (ძველ ანგარიშებს ერთხელ ვეკითხებით შემდეგი შესვლისას) და მის თარიღსა და დროს ვინახავთ. თითოეულ პროვაიდერს მონაცემთა დამუშავების პირობები ავალდებულებს.",
          "არ გადააგდო ამ პროვაიდერების გარეშე ვერ იმუშავებს. თანხმობის გამოხმობა ნებისმიერ დროს შეგიძლია ანგარიშის წაშლით, რის შემდეგაც შენს მონაცემებს აღარ გადავცემთ.",
        ],
      },
      {
        id: "retention",
        title: "რამდენ ხანს ვინახავთ",
        bullets: [
          "ანგარიში, პროფილი, ტელეფონის ნომერი და თანხმობების ჩანაწერები: სანამ ანგარიში არსებობს.",
          "შეკვეთები და გადახდები: საბუღალტრო ჩანაწერებად ინახება 6 წელი, როგორც ამას საქართველოს საგადასახადო კანონმდებლობა მოითხოვს, ანგარიშის წაშლის შემდეგაც, თუმცა შენთან კავშირის გარეშე.",
          "ბიზნეს ანგარიშები: იხ. „ანგარიშის წაშლა“ ქვემოთ. უარყოფილი განაცხადები, რომლებიც ხელახლა არ გამოგზავნილა, 90 დღის შემდეგ იშლება.",
          "SMS-ების გაგზავნის ჟურნალი: მხოლოდ დაშიფრული (ჰეშირებული) ნომრები, რომლებიც 7 დღის შემდეგ იშლება.",
          "სერვერული ჩანაწერები: ჰოსტინგის პროვაიდერებთან შეზღუდული ვადით ინახება.",
        ],
      },
      {
        id: "device",
        title: "რას ვინახავთ შენს მოწყობილობაზე",
        paragraphs: [
          "სარეკლამო ან ანალიტიკურ ქუქი-ფაილებსა და ტრეკერებს არ ვიყენებთ. მოწყობილობაზე მხოლოდ ის ინახება, რაც სერვისის მუშაობას სჭირდება: ავტორიზაციის სესია, არჩეული ენა, მდებარეობის არჩევანი (ჩართულია თუ არა, და არა თავად მდებარეობა), Push-შეტყობინებების პარამეტრები (მათ შორის, უკვე გკითხეთ თუ არა), უკვე დაადასტურე თუ არა თანხმობა, ნახე თუ არა მისასალმებელი ეკრანი, ბიზნესის განაცხადის მონახაზი შევსების პროცესში და, აპლიკაციაში, შეთავაზებების სიის დროებითი ასლი, რომ სწრაფად გაიხსნას.",
        ],
      },
      {
        id: "security",
        title: "უსაფრთხოება",
        paragraphs: [
          "ყველა კავშირი დაშიფრულია (HTTPS). ბარათის მონაცემებს მხოლოდ TBC ბანკი ამუშავებს. მონაცემთა ბაზის წესები ზღუდავს, ვის რისი ნახვა შეუძლია: წაღების კოდს მხოლოდ მომხმარებელი ხედავს, საჯარო რეესტრის ამონაწერები კი დახურულ საცავში ინახება, რომელზეც წვდომა მხოლოდ ჩვენს ადმინისტრატორებს აქვთ. ადმინისტრატორის შესვლას მეორე ნაბიჯი სჭირდება (კოდი ავთენტიფიკატორის აპლიკაციიდან).",
        ],
      },
      {
        id: "rights",
        title: "შენი უფლებები",
        paragraphs: [
          "საქართველოს კანონის „პერსონალურ მონაცემთა დაცვის შესახებ“ თანახმად, გაქვს უფლება:",
        ],
        bullets: [
          "იცოდე, ვამუშავებთ თუ არა და როგორ ვამუშავებთ შენს მონაცემებს;",
          "მიიღო წვდომა შენს მონაცემებზე და მათი ასლი, მათ შორის გავრცელებულ, მანქანით წაკითხვად ფორმატში;",
          "მოითხოვო მათი გასწორება, განახლება ან შევსება;",
          "მოითხოვო მათი წაშლა;",
          "მოითხოვო დამუშავების შეზღუდვა (დაბლოკვა);",
          "გააპროტესტო ჩვენს ლეგიტიმურ ინტერესზე დაფუძნებული დამუშავება;",
          "ნებისმიერ დროს გამოიხმო მოცემული თანხმობა (ეს გავლენას არ ახდენს გამოხმობამდე განხორციელებულ დამუშავებაზე);",
          "მოითხოვო, რომ ავტომატური გადაწყვეტილება, მაგალითად სანდოობის ქულით ჯავშნების შეზღუდვა, ადამიანმა გადახედოს.",
        ],
        note: `მოგვწერე: ${SUPPORT_EMAIL}. გიპასუხებთ 10 სამუშაო დღეში. თუ ფიქრობ, რომ შენს მონაცემებს არასწორად ვამუშავებთ, შეგიძლია მიმართო საქართველოს სახელმწიფო აუდიტის სამსახურს, რომელიც 2026 წლის 2 მარტიდან პერსონალურ მონაცემთა დაცვას ზედამხედველობს, ან სასამართლოს.`,
      },
      {
        id: "delete-account",
        title: "ანგარიშის წაშლა",
        paragraphs: [
          "აპლიკაციაში: პროფილი → პარამეტრები → ანგარიშის წაშლა. ვებსაიტზე: პარამეტრები → ანგარიშის წაშლა. მანამდე აქტიური ჯავშანი წაიღე ან გააუქმე. ბიზნესმა ჯერ ყველა მიმდინარე ჯავშანი უნდა დაასრულოს ან მოაგვაროს.",
          `აპლიკაცია არ გაქვს? მოგვწერე ${SUPPORT_EMAIL} მისამართზე იმ ელფოსტიდან, რომელზეც ანგარიში გაქვს, თემით „ანგარიშის წაშლა“. ანგარიშს 10 სამუშაო დღეში წავშლით და ელფოსტით დაგიდასტურებთ.`,
        ],
        bullets: [
          "იშლება: ავტორიზაციის მონაცემები, ელფოსტა, პროფილი (მათ შორის სახელი, ფოტო და ტელეფონის ნომერი), თანხმობები, რჩეულები, Push-ტოკენები და შენი კომენტარები.",
          "6 წელი ინახება, მაგრამ შენთან აღარ არის დაკავშირებული: შეკვეთებისა და გადახდების ჩანაწერები (საბუღალტრო მიზნით) და ვარსკვლავებით შეფასებები (ბიზნესის საშუალო ქულაში).",
          "ბიზნეს ანგარიში: ბიზნესის პროფილი, ლოგო და ფოტოები, შაბლონები და შეთავაზებები აპლიკაციიდან იშლება; მფლობელის სახელი, ტელეფონის ნომერი, IBAN და რეესტრის ამონაწერი იშლება. კომპანიის იურიდიული დასახელება და საიდენტიფიკაციო კოდი საბუღალტრო მიზნით მისი შეკვეთების ჩანაწერებთან ერთად 6 წელი ინახება და შემდეგ იშლება.",
        ],
      },
      {
        id: "changes",
        title: "ცვლილებები",
        paragraphs: [
          "ამ პოლიტიკას ვაახლებთ, როცა ჩვენი პრაქტიკა იცვლება. მოქმედი ვერსიის თარიღი ზემოთაა მითითებული, არსებითი ცვლილებების შესახებ კი წინასწარ გაცნობებთ.",
        ],
      },
      {
        id: "contact",
        title: "კონტაქტი",
        paragraphs: [
          `კითხვები ან მოთხოვნები შენს მონაცემებთან დაკავშირებით: ${SUPPORT_EMAIL}. ვცდილობთ, 1–2 სამუშაო დღეში გიპასუხოთ, და ყოველთვის — 10 სამუშაო დღეში.`,
        ],
      },
    ],
    helpTitle: "გაქვს კითხვა კონფიდენ­ციალუ­რობაზე?",
    helpText:
      "მოგვწერე ანგარიშის, შეკვეთის ან ბიზნესის მონაცემების შესახებ. გიპასუხებთ მარტივად და გასაგებად.",
    contactLabel: "დაგვიკავშირდი",
  },
};
