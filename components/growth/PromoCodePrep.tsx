const promoCodes = [
  {
    code: "WELCOME10",
    purpose: "Future welcome campaign for new customers.",
  },
  {
    code: "FIRSTORDER",
    purpose: "Future first-reservation campaign.",
  },
  {
    code: "BUSINESS PROMO",
    purpose: "Future business-specific customer campaign.",
  },
  {
    code: "SEASONAL",
    purpose: "Future seasonal marketplace promotion.",
  },
] as const;

export function PromoCodePrep() {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Promo codes
      </p>
      <h2 className="mt-2 text-2xl font-black text-gray-950">
        Campaigns prepared for later
      </h2>
      <p className="mt-3 font-semibold leading-7 text-gray-600">
        Promo-code UI is ready, but discounts are not applied until real payment
        and campaign rules are connected.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {promoCodes.map((promo) => (
          <div key={promo.code} className="rounded-2xl bg-[#F7F6EF] p-4">
            <p className="font-mono text-lg font-black text-green-800">
              {promo.code}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
              {promo.purpose}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
