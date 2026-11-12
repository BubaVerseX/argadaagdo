"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  LeafIcon,
  PackageIcon,
  ShieldIcon,
  StoreIcon,
  TrendingUpIcon,
  UsersIcon,
} from "@/components/icons";
import { HeroDemo } from "@/components/business/landing/HeroDemo";
import { CountUp, Reveal } from "@/components/business/landing/Motion";
import { businessAreaUrl } from "@/lib/businessArea";
import { forBusinessesContent } from "@/lib/legal/forBusinesses";
import { isNativeApp } from "@/lib/native";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useSyncExternalStore } from "react";

// Registration lives in the business area (business.argadaagdo.ge once
// NEXT_PUBLIC_BUSINESS_SITE_URL is set; same host until then). The apps keep
// it on this host: another host would open the browser and leave the app.
const registerHref = businessAreaUrl("/business/register");
const subscribe = () => () => {};
const serverFalse = () => false;

export default function ForBusinessesPage() {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const content = forBusinessesContent[language];
  const inApp = useSyncExternalStore(subscribe, isNativeApp, serverFalse);
  const register = inApp ? "/business/register" : registerHref;

  // The hero title with its last word picked out.
  const titleWords = content.heroTitle.trim().split(" ");
  const titleEnd = titleWords.pop() ?? "";
  const titleStart = titleWords.join(" ");

  const steps = [
    {
      Icon: StoreIcon,
      title: L("დარეგისტრირდი", "Register"),
      text: L(
        "კომპანია, ტელეფონი, ანგარიში და პირველი ბოქსი. განაცხადს ვამოწმებთ და გიდასტურებთ.",
        "Company, phone, payout account and your first box. We check your application and approve it."
      ),
    },
    {
      Icon: PackageIcon,
      title: L("შექმენი ბოქსი ერთხელ", "Set up your box once"),
      text: L(
        "ფოტო, ფასი, რაოდენობა და წაღების დრო. აპში ყოველდღე თავად გამოჩნდება.",
        "Photo, price, quantity and pickup time. It appears in the app every day by itself."
      ),
    },
    {
      Icon: CheckIcon,
      title: L("გაეცი კოდით", "Hand over with a code"),
      text: L(
        "მყიდველი უკვე გადახდილია: აჩვენებს 6-ნიშნა კოდს და ბოქსი მისია. თანამშრომლები PIN-ით შედიან.",
        "The buyer has already paid: they show a 6-digit code and the box is theirs. Staff sign in with a PIN."
      ),
    },
  ];

  const benefitIcons = [TrendingUpIcon, UsersIcon, ClockIcon];

  const faqs = [
    {
      question: L("რა ღირს?", "What does it cost?"),
      items: [content.pricingText, content.pricingNote],
    },
    {
      question: L("რა დაგჭირდება რეგისტრაციისთვის?", "What do I need to register?"),
      items: content.needItems,
    },
    {
      question: L("როგორ იღებ თანხას?", "How do I get paid?"),
      items: [content.paidItems[0], content.paidItems[1], content.paidItems[5]],
    },
    {
      question: L("რა ხდება, თუ მყიდველი გააუქმებს ან არ მოვა?", "What if a buyer cancels or doesn't come?"),
      items: [content.paidItems[2], content.paidItems[3], content.paidItems[4]],
    },
  ];

  const primaryButton =
    "inline-flex min-h-14 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-brand-mint px-7 text-base font-bold text-brand-forest shadow-[0_14px_34px_-14px_rgba(184,230,196,0.9)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ground";
  const secondaryButton =
    "inline-flex min-h-14 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-white/25 px-7 text-base font-semibold text-brand-ground transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint";

  return (
    <main className="app-shell">
      <Navbar variant="web" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-forest text-brand-ground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_85%_15%,rgba(184,230,196,0.18),transparent_60%),radial-gradient(700px_380px_at_0%_100%,rgba(244,193,93,0.12),transparent_60%)]"
        />
        <svg
          aria-hidden="true"
          viewBox="30 30 140 140"
          className="pointer-events-none absolute -bottom-24 -left-24 h-[420px] w-[420px] text-white/[0.04]"
        >
          <path d="M44 156 C44 96, 88 50, 158 42 C162 112, 118 158, 50 160 Z" fill="currentColor" />
        </svg>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-mint sm:text-sm">
              <LeafIcon className="h-4 w-4" strokeWidth={2} />
              {L("ბიზნესებისთვის · თბილისი", "For businesses · Tbilisi")}
            </p>
            <h1 className="mt-5 text-balance break-words text-[2.1rem] font-bold leading-[1.15] min-[400px]:text-[2.5rem] sm:text-5xl lg:text-[3rem]">
              {titleStart} <span className="text-brand-mint">{titleEnd}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#c3ddcb]">
              {L(
                "დღის ბოლოს დარჩენილი საკვები ლანჩ ბოქსად გაყიდე. მყიდველი აპში წინასწარ იხდის და შენგან თავად იღებს.",
                "Sell end-of-day food as Lunch Boxes. Buyers pay in the app in advance and collect from you."
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={register} className={primaryButton}>
                {content.registerLabel}
                <ChevronRightIcon className="h-5 w-5" strokeWidth={2.4} />
              </Link>
              <Link href="/contact" className={secondaryButton}>
                {content.talkLabel}
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#c3ddcb]">
              {[
                L("რეგისტრაცია უფასოა", "Free to sign up"),
                L("თვიური გადასახადი არ არის", "No monthly fee"),
                L("საკომისიო მხოლოდ გაყიდულზე", "Commission only on sales"),
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-brand-mint" strokeWidth={2.6} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroDemo isGeorgian={isGeorgian} />
        </div>
      </section>

      {/* Why: the numbers */}
      <section className="px-4 pt-16 sm:px-6 sm:pt-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold text-cream sm:text-4xl">
              {L("კარგი საკვები იყრება — ფულიც მასთან ერთად", "Good food is thrown away — and money with it")}
            </h2>
            <p className="mt-3 text-body">
              {L(
                "მაღაზიებსა და კაფეებში ყოველ საღამოს რჩება კარგი საკვები. „არ გადააგდო“ მას შემოსავლად აქცევს.",
                "Every evening shops and cafés are left with good food. ArGadaagdo turns it into revenue."
              )}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Reveal className="ui-card rounded-3xl p-6 sm:p-7">
              <p className="text-5xl font-extrabold text-cream sm:text-6xl">
                <CountUp value={101} />
                <span className="ml-1 text-3xl text-mint sm:text-4xl">{L("კგ", "kg")}</span>
              </p>
              <p className="mt-3 text-body">
                {L(
                  "საკვებს ყრის საქართველოში ერთი ადამიანი წელიწადში",
                  "of food thrown away per person per year in Georgia"
                )}
              </p>
              <p className="mt-2 text-xs text-muted">UNEP Food Waste Index 2021</p>
            </Reveal>
            <Reveal className="ui-card rounded-3xl p-6 sm:p-7" delay={120}>
              <p className="text-5xl font-extrabold text-cream sm:text-6xl">
                <CountUp value={400000} />+
                <span className="ml-1 text-3xl text-mint sm:text-4xl">{L("ტ", "t")}</span>
              </p>
              <p className="mt-3 text-body">
                {L("საკვები იყრება საქართველოში ყოველ წელს", "of food thrown away in Georgia every year")}
              </p>
              <p className="mt-2 text-xs text-muted">UNEP Food Waste Index 2021</p>
            </Reveal>
            <Reveal className="theme-forest rounded-3xl bg-page p-6 sm:p-7" delay={240}>
              <p className="text-5xl font-extrabold text-cream sm:text-6xl">
                0<span className="ml-1 text-3xl text-mint sm:text-4xl">₾</span>
              </p>
              <p className="mt-3 text-body">
                {L(
                  "რეგისტრაცია და თვიური გადასახადი. იხდი მხოლოდ საკომისიოს გაყიდულ ბოქსზე.",
                  "to sign up, and no monthly fee. You pay a commission only on boxes sold."
                )}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pt-20 sm:px-6 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-mint">{content.howBadge}</p>
            <h2 className="mt-2 text-balance text-3xl font-bold text-cream sm:text-4xl">
              {L("სამი ნაბიჯი — და საკვები აღარ იყრება", "Three steps, and food stops going to waste")}
            </h2>
          </Reveal>

          <ol className="relative mt-10 grid gap-4 md:grid-cols-3">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[16%] right-[16%] top-11 hidden border-t-2 border-dashed border-line md:block"
            />
            {steps.map(({ Icon, title, text }, index) => (
              <li key={title} className="relative">
                <Reveal className="ui-card h-full rounded-3xl p-6 sm:p-7" delay={index * 140}>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-forest text-brand-mint">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-honey text-sm font-extrabold text-brand-ink">
                        {index + 1}
                      </span>
                    </span>
                    <h3 className="text-xl font-bold text-cream">{title}</h3>
                  </div>
                  <p className="mt-4 leading-relaxed text-body">{text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 pt-20 sm:px-6 lg:px-12">
        <Reveal className="theme-forest relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-page px-5 py-10 sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_100%_0%,rgba(184,230,196,0.16),transparent_60%)]"
          />
          <div className="relative">
            <h2 className="max-w-2xl text-balance text-3xl font-bold text-cream sm:text-4xl">{content.benefitsTitle}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {content.benefits.map((benefit, index) => {
                const Icon = benefitIcons[index] ?? ShieldIcon;
                return (
                  <div key={benefit.title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-mint text-brand-forest">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-cream">{benefit.title}</h3>
                    <p className="mt-2 leading-relaxed text-body">{benefit.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Questions */}
      <section className="px-4 pt-20 sm:px-6 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold text-cream sm:text-4xl">{L("ხშირი კითხვები", "Questions")}</h2>
          </Reveal>
          <div className="mt-8 grid gap-3">
            {faqs.map((faq, index) => (
              <Reveal key={faq.question} delay={index * 80}>
                <details className="group ui-card rounded-2xl">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 text-left text-lg font-semibold text-cream [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDownIcon
                      className="h-5 w-5 shrink-0 text-mint transition group-open:rotate-180"
                      strokeWidth={2.2}
                    />
                  </summary>
                  <ul className="grid gap-2 px-5 pb-5 text-body">
                    {faq.items.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-mint" strokeWidth={2.4} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final call */}
      <section className="px-4 pb-4 pt-20 sm:px-6 lg:px-12">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-brand-forest px-6 py-12 text-center text-brand-ground sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_260px_at_50%_0%,rgba(184,230,196,0.22),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance text-3xl font-bold sm:text-4xl">{content.ctaTitle}</h2>
            <p className="mt-4 text-[#c3ddcb]">{content.ctaText}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={register} className={primaryButton}>
                {content.registerLabel}
                <ChevronRightIcon className="h-5 w-5" strokeWidth={2.4} />
              </Link>
              <Link href="/contact" className={secondaryButton}>
                {content.ctaContact}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
