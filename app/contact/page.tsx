"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { contactContent } from "@/lib/legal/contact";
import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function ContactPage() {
  const { language } = useLanguage();
  const content = contactContent[language];

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="premium-surface rounded-3xl p-5 sm:p-8 md:p-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {content.badge}
            </p>
            <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl md:text-6xl">
              {content.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-body sm:text-lg sm:leading-8">
              {content.intro}
            </p>
          </div>

          <section className="mt-6 rounded-3xl ui-card p-5 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-mint">
              {content.emailLabel}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-cream">
              {content.emailTitle}
            </h2>
            <p className="mt-4 leading-7 text-body">{content.emailText}</p>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-6 premium-button w-full break-all px-6 py-3 text-center sm:w-auto"
            >
              {SUPPORT_EMAIL}
            </a>

            <p className="mt-6 font-semibold text-cream">
              {content.includeTitle}
            </p>
            <ul className="mt-3 grid list-disc gap-2 pl-5 leading-7 text-body marker:text-mint">
              {content.includeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {content.topics.map((topic) => (
              <div
                key={topic.title}
                className="premium-card rounded-3xl p-5 sm:p-6"
              >
                <h2 className="text-xl font-semibold text-cream">
                  {topic.title}
                </h2>
                <p className="mt-3 leading-7 text-body">{topic.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {content.responseLabel}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-cream">
                {content.responseTitle}
              </h2>
              <p className="mt-3 leading-7 text-body">
                {content.responseText}
              </p>
            </section>

            <section className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {content.areaLabel}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-cream">
                {content.areaTitle}
              </h2>
              <p className="mt-3 leading-7 text-body">{content.areaText}</p>
            </section>
          </div>

          <div className="mt-6 rounded-3xl ui-card p-5 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-cream">
              {content.footerTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-body">
              {content.footerText}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/faq"
                className="premium-button-secondary px-6 py-3 text-center"
              >
                {content.faqLabel}
              </Link>
              <Link
                href="/support"
                className="premium-button px-6 py-3 text-center"
              >
                {content.helpCenterLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
