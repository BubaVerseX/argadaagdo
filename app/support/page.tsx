import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FAQAccordion } from "@/components/help/FAQAccordion";
import { HelpCard } from "@/components/help/HelpCard";
import { InfoBanner } from "@/components/help/InfoBanner";
import { TrustBadge } from "@/components/help/TrustBadge";
import { MapPinIcon, ReceiptIcon, StoreIcon } from "@/components/icons";
import Link from "next/link";

const supportEmail = "support@argadaagdo.ge";

const customerQuestions = [
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
];

const businessQuestions = [
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
];

export default function SupportPage() {
  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
              Support Center
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              Help for reservations, pickups and businesses.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#6b6152] sm:text-lg sm:leading-8">
              Clear answers for customers and businesses using ArGadaagdo during
              the Tbilisi pilot.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <TrustBadge label="Verified businesses" />
              <TrustBadge label="Pickup code verification" />
              <TrustBadge label="Customer ratings" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            <HelpCard
              icon={<ReceiptIcon className="h-5 w-5" strokeWidth={1.8} />}
              title="Reservation help"
              text="Find your pickup code, understand cancellation windows, and know what happens after you reserve."
              href="/orders"
              actionLabel="View Orders"
            />
            <HelpCard
              icon={<MapPinIcon className="h-5 w-5" strokeWidth={1.8} />}
              title="Pickup help"
              text="Arrive during the pickup window, show your pickup code, and collect directly from the business."
              href="/faq"
              actionLabel="Read FAQ"
            />
            <HelpCard
              icon={<StoreIcon className="h-5 w-5" strokeWidth={1.8} />}
              title="Business help"
              text="Learn how approval, offer creation, pickup verification and customer ratings work."
              href="/business/register"
              actionLabel="For Businesses"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-[2rem] soft-raised p-5 sm:p-8">
              <h2 className="text-2xl font-black sm:text-3xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 font-semibold leading-7 text-[#6b6152]">
                Start here if you are unsure how surprise bags, reservations,
                pickups, cancellations or ratings work.
              </p>

              <div className="mt-6 grid gap-6">
                <div>
                  <h3 className="mb-3 text-lg font-black text-[#a67c52]">
                    Customers
                  </h3>
                  <FAQAccordion items={customerQuestions} />
                </div>
                <div>
                  <h3 className="mb-3 text-lg font-black text-[#a67c52]">
                    Businesses
                  </h3>
                  <FAQAccordion items={businessQuestions} />
                </div>
              </div>
            </section>

            <div className="grid gap-6">
              <InfoBanner
                title="Contact support"
                text="Send us the account email, order details and a short explanation so we can help faster."
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
                title="Emergency contact"
                text="For the pilot phase, urgent operational issues should be sent to support with URGENT in the subject line."
                tone="yellow"
              />

              <InfoBanner
                title="Need more detail?"
                text="The FAQ and Contact pages include the full customer and business support notes."
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/faq"
                    className="premium-button min-h-11 px-5 py-2.5 text-center"
                  >
                    Open FAQ
                  </Link>
                  <Link
                    href="/contact"
                    className="premium-button-secondary min-h-11 px-5 py-2.5 text-center"
                  >
                    Contact Us
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
