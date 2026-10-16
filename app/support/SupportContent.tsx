"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FAQAccordion } from "@/components/help/FAQAccordion";
import { HelpCard } from "@/components/help/HelpCard";
import { InfoBanner } from "@/components/help/InfoBanner";
import { TrustBadge } from "@/components/help/TrustBadge";
import { MapPinIcon, ReceiptIcon, StoreIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const supportEmail = "support@argadaagdo.ge";

const customerQuestions = {
  en: [
    {
      question: "How do reservations work?",
      answer:
        "Choose an available surprise bag, review the pickup window, confirm the reservation, then find your pickup code in Orders.",
    },
    {
      question: "What is a surprise bag?",
      answer:
        "A surprise bag contains good surplus food from a local business. The exact contents may vary, but the business, price and pickup time are always shown before reservation.",
    },
    {
      question: "Can I cancel?",
      answer:
        "You can cancel from Orders up to 2 hours before pickup. After that, the cancellation window may be closed.",
    },
    {
      question: "What if I miss pickup?",
      answer:
        "If you do not collect during the pickup window, the order may be marked as missed pickup so businesses are protected from unreliable reservations.",
    },
  ],
  ka: [
    {
      question: "როგორ მუშაობს დაჯავშნა?",
      answer:
        "აირჩიე ხელმისაწვდომი სიურპრიზის ყუთი, გადაამოწმე წაღების ფანჯარა, დაადასტურე ჯავშანი და შემდეგ წაღების კოდი შეკვეთებში იპოვე.",
    },
    {
      question: "რა არის სიურპრიზის ყუთი?",
      answer:
        "სიურპრიზის ყუთში ადგილობრივი ბიზნესის კარგი, დარჩენილი საკვებია. ზუსტი შემადგენლობა შეიძლება განსხვავდებოდეს, მაგრამ ბიზნესი, ფასი და წაღების დრო დაჯავშნამდე ყოველთვის ჩანს.",
    },
    {
      question: "შემიძლია გაუქმება?",
      answer:
        "გაუქმება შეკვეთების გვერდიდან შეგიძლია წაღებამდე 2 საათით ადრე. ამის შემდეგ გაუქმების ფანჯარა შეიძლება დახურული იყოს.",
    },
    {
      question: "რა მოხდება, თუ წაღებას გამოვტოვებ?",
      answer:
        "თუ შეკვეთას წაღების ფანჯარაში არ წაიღებ, ის შეიძლება გამოტოვებულ წაღებად მოინიშნოს, რათა ბიზნესები არასანდო ჯავშნებისგან იყვნენ დაცული.",
    },
  ],
};

const businessQuestions = {
  en: [
    {
      question: "How do businesses join?",
      answer:
        "Create a business account, submit your business details, and wait for admin approval before publishing offers.",
    },
    {
      question: "How do pickups work for businesses?",
      answer:
        "Ask the customer for their pickup code, enter it in the dashboard, and complete the pickup only when the code matches.",
    },
    {
      question: "How do ratings work?",
      answer:
        "Customers can rate a business after a completed pickup. Ratings help future customers choose trusted local places.",
    },
  ],
  ka: [
    {
      question: "როგორ უერთდებიან ბიზნესები?",
      answer:
        "შექმენი ბიზნეს ანგარიში, გაგზავნე ბიზნესის მონაცემები და შეთავაზებების გამოქვეყნებამდე დაელოდე ადმინის დამტკიცებას.",
    },
    {
      question: "როგორ მუშაობს წაღება ბიზნესებისთვის?",
      answer:
        "ჰკითხე მომხმარებელს წაღების კოდი, შეიყვანე ის პანელში და წაღება მხოლოდ მაშინ დაასრულე, როცა კოდი ემთხვევა.",
    },
    {
      question: "როგორ მუშაობს შეფასებები?",
      answer:
        "მომხმარებლებს ბიზნესის შეფასება დასრულებული წაღების შემდეგ შეუძლიათ. შეფასებები მომავალ მომხმარებლებს სანდო ადგილობრივი ადგილების არჩევაში ეხმარება.",
    },
  ],
};

export default function SupportContent() {
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
              {isGeorgian ? "მხარდაჭერის ცენტრი" : "Support Center"}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {isGeorgian
                ? "დახმარება ჯავშნებში, წაღებასა და ბიზნესებისთვის."
                : "Help for reservations, pickups and businesses."}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#6b6152] sm:text-lg sm:leading-8">
              {isGeorgian
                ? "მკაფიო პასუხები მომხმარებლებისა და ბიზნესებისთვის, რომლებიც ArGadaagdo-ს თბილისის პილოტის დროს იყენებენ."
                : "Clear answers for customers and businesses using ArGadaagdo during the Tbilisi pilot."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <TrustBadge label={t("home.trustVerified")} />
              <TrustBadge label={t("home.trustPickupCodeVerification")} />
              <TrustBadge label={t("home.trustCustomerRatings")} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            <HelpCard
              icon={<ReceiptIcon className="h-5 w-5" strokeWidth={1.8} />}
              title={isGeorgian ? "დახმარება ჯავშნებში" : "Reservation help"}
              text={
                isGeorgian
                  ? "იპოვე წაღების კოდი, გაიგე გაუქმების ვადები და რა ხდება დაჯავშნის შემდეგ."
                  : "Find your pickup code, understand cancellation windows, and know what happens after you reserve."
              }
              href="/orders"
              actionLabel={isGeorgian ? "შეკვეთების ნახვა" : "View Orders"}
            />
            <HelpCard
              icon={<MapPinIcon className="h-5 w-5" strokeWidth={1.8} />}
              title={isGeorgian ? "დახმარება წაღებაში" : "Pickup help"}
              text={
                isGeorgian
                  ? "მიდი წაღების ფანჯარაში, აჩვენე წაღების კოდი და შეკვეთა პირდაპირ ბიზნესიდან წაიღე."
                  : "Arrive during the pickup window, show your pickup code, and collect directly from the business."
              }
              href="/faq"
              actionLabel={isGeorgian ? "FAQ-ის წაკითხვა" : "Read FAQ"}
            />
            <HelpCard
              icon={<StoreIcon className="h-5 w-5" strokeWidth={1.8} />}
              title={isGeorgian ? "დახმარება ბიზნესებისთვის" : "Business help"}
              text={
                isGeorgian
                  ? "გაიგე, როგორ მუშაობს დამტკიცება, შეთავაზებების შექმნა, წაღების შემოწმება და მომხმარებლის შეფასებები."
                  : "Learn how approval, offer creation, pickup verification and customer ratings work."
              }
              href="/business/register"
              actionLabel={t("home.joinBusiness")}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-[2rem] soft-raised p-5 sm:p-8">
              <h2 className="text-2xl font-black sm:text-3xl">
                {isGeorgian
                  ? "ხშირად დასმული კითხვები"
                  : "Frequently Asked Questions"}
              </h2>
              <p className="mt-3 font-semibold leading-7 text-[#6b6152]">
                {isGeorgian
                  ? "დაიწყე აქედან, თუ არ ხარ დარწმუნებული, როგორ მუშაობს სიურპრიზის ყუთები, ჯავშნები, წაღება, გაუქმება ან შეფასებები."
                  : "Start here if you are unsure how surprise bags, reservations, pickups, cancellations or ratings work."}
              </p>

              <div className="mt-6 grid gap-6">
                <div>
                  <h3 className="mb-3 text-lg font-black text-[#a67c52]">
                    {isGeorgian ? "მომხმარებლები" : "Customers"}
                  </h3>
                  <FAQAccordion items={customerQuestions[language]} />
                </div>
                <div>
                  <h3 className="mb-3 text-lg font-black text-[#a67c52]">
                    {t("nav.businesses")}
                  </h3>
                  <FAQAccordion items={businessQuestions[language]} />
                </div>
              </div>
            </section>

            <div className="grid gap-6">
              <InfoBanner
                title={t("contact.cta")}
                text={
                  isGeorgian
                    ? "გამოგვიგზავნე ანგარიშის ელფოსტა, შეკვეთის დეტალები და მოკლე განმარტება, რომ უფრო სწრაფად დაგეხმაროთ."
                    : "Send us the account email, order details and a short explanation so we can help faster."
                }
                tone="white"
              >
                <a
                  href={`mailto:${supportEmail}`}
                  className="premium-button w-full px-6 py-3 text-center sm:w-auto"
                >
                  {supportEmail}
                </a>
              </InfoBanner>

              <InfoBanner
                title={isGeorgian ? "სასწრაფო კონტაქტი" : "Emergency contact"}
                text={
                  isGeorgian
                    ? "პილოტის ეტაპზე სასწრაფო ოპერაციული საკითხები მხარდაჭერას გაუგზავნე და წერილის თემაში მიუთითე URGENT."
                    : "For the pilot phase, urgent operational issues should be sent to support with URGENT in the subject line."
                }
                tone="yellow"
              />

              <InfoBanner
                title={isGeorgian ? "მეტი დეტალი გჭირდება?" : "Need more detail?"}
                text={
                  isGeorgian
                    ? "FAQ-ისა და კონტაქტის გვერდებზე მომხმარებლებისა და ბიზნესების მხარდაჭერის სრული ინფორმაციაა."
                    : "The FAQ and Contact pages include the full customer and business support notes."
                }
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/faq"
                    className="premium-button min-h-11 px-5 py-2.5 text-center"
                  >
                    {isGeorgian ? "FAQ-ის გახსნა" : "Open FAQ"}
                  </Link>
                  <Link
                    href="/contact"
                    className="premium-button-secondary min-h-11 px-5 py-2.5 text-center"
                  >
                    {t("contact.title")}
                  </Link>
                </div>
              </InfoBanner>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
