"use client";

import { useLanguage } from "@/lib/useLanguage";

type BusinessAlert = {
  title: string;
  text: string;
  className: string;
};

type BusinessAlertsSectionProps = {
  alerts: BusinessAlert[];
};

export function BusinessAlertsSection({ alerts }: BusinessAlertsSectionProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-3xl sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
            {isGeorgian ? "ბიზნესის შეტყობინებები" : "Business alerts"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {isGeorgian ? "რას სჭირდება ყურადღება?" : "What needs attention?"}
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-body sm:text-right">
          {isGeorgian
            ? "სწრაფი სიგნალები ჯავშნების, წაღების, მარაგის ამოწურვის რისკისა და ვადაგასული შეთავაზებების შესახებ."
            : "Quick signals for reservations, pickups, sold-out risk and expired offers."}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className={`rounded-2xl p-4 ${alert.className}`}
          >
            <p className="font-semibold">{alert.title}</p>
            <p className="mt-2 text-sm font-semibold leading-6">
              {alert.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
