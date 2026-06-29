type LoyaltyProgressProps = {
  completedPickups: number;
  reservations: number;
  ratingsGiven: number;
};

const loyaltyBadges = [
  {
    title: "First Reservation",
    target: 1,
    getValue: ({ reservations }: LoyaltyProgressProps) => reservations,
  },
  {
    title: "5 Pickups",
    target: 5,
    getValue: ({ completedPickups }: LoyaltyProgressProps) => completedPickups,
  },
  {
    title: "10 Pickups",
    target: 10,
    getValue: ({ completedPickups }: LoyaltyProgressProps) => completedPickups,
  },
  {
    title: "Food Saver",
    target: 3,
    getValue: ({ completedPickups }: LoyaltyProgressProps) => completedPickups,
  },
  {
    title: "Local Hero",
    target: 10,
    getValue: ({ completedPickups }: LoyaltyProgressProps) => completedPickups,
  },
  {
    title: "Top Supporter",
    target: 5,
    getValue: ({ ratingsGiven }: LoyaltyProgressProps) => ratingsGiven,
  },
] as const;

export function LoyaltyProgress(props: LoyaltyProgressProps) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Loyalty program
      </p>
      <h2 className="mt-2 text-2xl font-black text-gray-950">
        Food saver progress
      </h2>
      <p className="mt-3 font-semibold leading-7 text-gray-600">
        Badges are prepared for future loyalty campaigns. Progress uses your
        current reservations, completed pickups and ratings.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loyaltyBadges.map((badge) => {
          const value = badge.getValue(props);
          const progress = Math.min(100, Math.round((value / badge.target) * 100));
          const complete = value >= badge.target;

          return (
            <article
              key={badge.title}
              className={`rounded-2xl p-4 ${
                complete ? "bg-green-50 text-green-950" : "bg-[#F7F6EF] text-gray-950"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{badge.title}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                  {complete ? "Ready" : `${value}/${badge.target}`}
                </span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-green-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
