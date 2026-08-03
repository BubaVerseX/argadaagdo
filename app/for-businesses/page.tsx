"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function ForBusinessesPage() {
  const { t } = useLanguage();

  const solutions = [
    {
      title: t("forBusinesses.solutionListTitle"),
      text: t("forBusinesses.solutionListText"),
    },
    {
      title: t("forBusinesses.solutionReachTitle"),
      text: t("forBusinesses.solutionReachText"),
    },
    {
      title: t("forBusinesses.solutionRecoverTitle"),
      text: t("forBusinesses.solutionRecoverText"),
    },
  ];

  const howSteps = [
    {
      label: "01",
      title: t("forBusinesses.howStep1Title"),
      text: t("forBusinesses.howStep1Text"),
    },
    {
      label: "02",
      title: t("forBusinesses.howStep2Title"),
      text: t("forBusinesses.howStep2Text"),
    },
    {
      label: "03",
      title: t("forBusinesses.howStep3Title"),
      text: t("forBusinesses.howStep3Text"),
    },
    {
      label: "04",
      title: t("forBusinesses.howStep4Title"),
      text: t("forBusinesses.howStep4Text"),
    },
  ];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-12 lg:pt-20">
        <div className="premium-container">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0 max-w-2xl">
              <p className="soft-raised inline-flex rounded-full px-4 py-2 text-sm font-semibold text-[#6b6152]">
                {t("forBusinesses.metaBadge")}
              </p>

              <h1 className="mt-7 text-balance text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#2e2a22] sm:text-[3.25rem] lg:text-[3.5rem]">
                {t("forBusinesses.heroTitle")}
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-[1.55] text-[#6b6152] sm:text-lg">
                {t("forBusinesses.heroSubtitle")}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/business/register" className="premium-button px-8 py-3.5">
                  {t("forBusinesses.heroCtaRegister")}
                </Link>
                <Link
                  href="/contact"
                  className="premium-button-secondary px-8 py-3.5"
                >
                  {t("forBusinesses.heroCtaContact")}
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-[#2e2a22] p-8 text-white shadow-[var(--shadow-hero)] sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a880]">
                {t("forBusinesses.commissionBadge")}
              </p>
              <div className="mt-6 flex items-end gap-8">
                <div>
                  <p className="text-6xl font-extrabold tracking-tight">
                    {t("forBusinesses.commissionYouKeepValue")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/70">
                    {t("forBusinesses.commissionYouKeep")}
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-white/50">
                    {t("forBusinesses.commissionPlatformFeeValue")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/50">
                    {t("forBusinesses.commissionPlatformFee")}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-[1.55] text-white/70">
                {t("forBusinesses.commissionNoSaleText")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container">
          <div className="soft-raised rounded-[1.75rem] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a67c52]">
              {t("forBusinesses.problemBadge")}
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-[-0.03em] text-[#2e2a22] sm:text-4xl">
              {t("forBusinesses.problemTitle")}
            </h2>
            <p className="mt-4 max-w-2xl leading-[1.55] text-[#6b6152]">
              {t("forBusinesses.problemText")}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b6152]">
            {t("forBusinesses.solutionBadge")}
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-[-0.03em] text-[#2e2a22] sm:text-5xl">
            {t("forBusinesses.solutionTitle")}
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {solutions.map((item) => (
              <div
                key={item.title}
                className="soft-raised rounded-[1.75rem] p-7"
              >
                <h3 className="text-xl font-bold tracking-tight text-[#2e2a22]">
                  {item.title}
                </h3>
                <p className="mt-3 leading-[1.55] text-[#6b6152]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b6152]">
            {t("forBusinesses.howBadge")}
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-[-0.03em] text-[#2e2a22] sm:text-5xl">
            {t("forBusinesses.howTitle")}
          </h2>

          <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
            {howSteps.map((step) => (
              <div key={step.label}>
                <p className="text-sm font-semibold tracking-[0.1em] text-[#6b6152]">
                  {step.label}
                </p>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-[#2e2a22]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-[1.55] text-[#6b6152]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container">
          <div className="rounded-[1.75rem] bg-[#2e2a22] p-8 text-white shadow-[var(--shadow-soft)] sm:p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a880]">
                  {t("forBusinesses.commissionBadge")}
                </p>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
                  {t("forBusinesses.commissionTitle")}
                </h2>
                <p className="mt-5 max-w-lg leading-[1.55] text-white/70">
                  {t("forBusinesses.commissionText")}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-white/10 p-6">
                  <p className="text-4xl font-extrabold tracking-tight">
                    {t("forBusinesses.commissionYouKeepValue")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/70">
                    {t("forBusinesses.commissionYouKeep")}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-white/10 p-6">
                  <p className="text-4xl font-extrabold tracking-tight">
                    {t("forBusinesses.commissionPlatformFeeValue")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/70">
                    {t("forBusinesses.commissionPlatformFee")}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-white/10 p-6 sm:col-span-2">
                  <p className="text-lg font-bold">
                    {t("forBusinesses.commissionNoSale")}
                  </p>
                  <p className="mt-2 text-sm leading-[1.55] text-white/70">
                    {t("forBusinesses.commissionNoSaleText")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="soft-raised rounded-[1.75rem] p-10 text-center sm:p-14">
            <h2 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-[-0.03em] text-[#2e2a22] sm:text-5xl">
              {t("forBusinesses.ctaTitle")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-[1.55] text-[#6b6152]">
              {t("forBusinesses.ctaText")}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/business/register" className="premium-button px-8 py-3.5">
                {t("forBusinesses.ctaRegister")}
              </Link>
              <span className="text-sm font-semibold text-[#6b6152]">
                {t("forBusinesses.ctaQuestions")}{" "}
                <Link
                  href="/contact"
                  className="text-[#a67c52] underline-offset-2 hover:underline"
                >
                  {t("forBusinesses.ctaContact")}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
