"use client";

import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navbar from "@/components/Navbar";
import { getEmailNotificationPlaceholders } from "@/lib/emailNotifications";

export default function SettingsPage() {
  const emailPlaceholders = getEmailNotificationPlaceholders();
  const settingCards = [
    {
      title: "Email notifications",
      text: "Choose which updates should be sent by email once a provider is connected.",
      status: "Prepared",
    },
    {
      title: "Dark mode",
      text: "A future display preference for customers and businesses.",
      status: "Future",
    },
    {
      title: "Profile",
      text: "Future account details and communication preferences.",
      status: "Future",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              Settings preparation
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">
              Communication settings
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-green-50 sm:text-lg">
              A lightweight foundation for future account, language and email
              notification controls.
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              Language
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Choose your language
            </h2>
            <p className="mt-2 font-semibold leading-7 text-gray-600">
              Language preference is stored on this device.
            </p>
            <div className="mt-5 inline-flex rounded-2xl bg-[#F7F6EF] p-3">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {settingCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-black text-gray-950">
                    {card.title}
                  </h2>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                    {card.status}
                  </span>
                </div>
                <p className="mt-3 font-semibold leading-7 text-gray-600">
                  {card.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              Email notification plan
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Prepared events
            </h2>
            <p className="mt-2 font-semibold leading-7 text-gray-600">
              Real email sending is not connected yet. These placeholders show
              the events that should be wired to a provider later.
            </p>

            <div className="mt-6 grid gap-3">
              {emailPlaceholders.map((placeholder) => (
                <div
                  key={placeholder.event}
                  className="rounded-2xl border border-green-100 bg-green-50/60 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-gray-950">
                        {placeholder.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        {placeholder.trigger}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-green-800">
                      {placeholder.recipient}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-gray-700">
                    {placeholder.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
