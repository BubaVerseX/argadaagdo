const promotionTypes = [
  {
    title: "Featured Offer",
    text: "Highlight a strong offer in a future featured marketplace slot.",
  },
  {
    title: "Happy Hour",
    text: "Prepare time-limited pickup messaging for quiet hours.",
  },
  {
    title: "Limited Quantity",
    text: "Create urgency around a small number of surprise bags.",
  },
  {
    title: "Weekend Offer",
    text: "Prepare campaign copy for Friday, Saturday or Sunday pickup windows.",
  },
  {
    title: "Flash Sale",
    text: "Future short-running campaign option after scheduling exists.",
  },
] as const;

export function BusinessPromotionToolkit() {
  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:mt-8 sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Business promotions
          </p>
          <h2 className="mt-2 text-2xl font-black text-gray-950">
            Campaign ideas for future growth
          </h2>
          <p className="mt-3 max-w-3xl font-semibold leading-7 text-gray-600">
            These promotion types are prepared as UI guidance only. Scheduling
            and paid promotion logic can be added later.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {promotionTypes.map((promotion) => (
          <article
            key={promotion.title}
            className="rounded-2xl bg-[#F7F6EF] p-4"
          >
            <p className="font-black text-gray-950">{promotion.title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
              {promotion.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
