"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <main className="app-shell">
      <Navbar />

      <section className="flex min-h-[70vh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="premium-card w-full max-w-xl rounded-3xl p-6 text-center sm:rounded-[2rem] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1e8] text-2xl font-black text-gray-950 sm:h-20 sm:w-20">
            404
          </div>

          <h1 className="mt-5 text-3xl font-black sm:mt-6 sm:text-5xl">
            {t("notFound.title")}
          </h1>

          <p className="mt-4 font-semibold text-gray-600">
            {t("notFound.text")}
          </p>

          <Link
            href="/offers"
            className="premium-button mt-7 inline-block min-h-12 w-full px-8 py-3 sm:mt-8 sm:w-auto sm:py-4"
          >
            {t("common.browseOffers")}
          </Link>
        </div>
      </section>
    </main>
  );
}
