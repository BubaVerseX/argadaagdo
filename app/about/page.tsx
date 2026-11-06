"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { aboutContent } from "@/lib/legal/about";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function AboutPage() {
  const { language } = useLanguage();
  const content = aboutContent[language];

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

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {content.sections.map((section) => (
              <section
                key={section.title}
                className="rounded-3xl ui-card p-5 sm:p-8"
              >
                <h2 className="text-2xl font-semibold text-cream">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 leading-8 text-body">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-3xl ui-card p-5 sm:p-8">
            <h2 className="text-3xl font-semibold text-cream">
              {content.howTitle}
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {content.howSteps.map((step, index) => (
                <li key={step.title} className="rounded-3xl bg-well p-5">
                  <p className="text-sm font-semibold text-mint">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-cream">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-7 text-body">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6 rounded-3xl ui-card p-5 sm:p-8">
            <h2 className="text-3xl font-semibold text-cream">
              {content.valuesTitle}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {content.values.map((value) => (
                <div
                  key={value}
                  className="rounded-3xl bg-well p-5 text-center"
                >
                  <p className="text-2xl font-semibold text-mint">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="premium-card mt-6 rounded-3xl p-5 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-cream sm:text-3xl">
              {content.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-body">
              {content.ctaText}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/discover"
                className="premium-button-secondary px-6 py-3 text-center"
              >
                {content.browseLabel}
              </Link>
              <Link
                href="/contact"
                className="premium-button px-6 py-3 text-center"
              >
                {content.contactLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
