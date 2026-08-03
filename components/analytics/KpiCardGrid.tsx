type KpiTone = "green" | "yellow" | "red" | "white";

export type KpiCard = {
  title: string;
  value: string | number;
  helper: string;
  tone?: KpiTone;
};

type KpiCardGridProps = {
  cards: KpiCard[];
};

const toneClasses: Record<KpiTone, string> = {
  green: "soft-raised text-[#2e2a22]",
  yellow: "bg-yellow-50 text-yellow-950",
  red: "bg-red-50 text-red-950",
  white: "soft-raised text-[#2e2a22]",
};

export function KpiCardGrid({ cards }: KpiCardGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.title}
          className={`rounded-3xl p-5 ${
            toneClasses[card.tone || "white"]
          }`}
        >
          <p className="text-sm font-black opacity-75">{card.title}</p>
          <p className="mt-2 text-3xl font-black sm:text-4xl">{card.value}</p>
          <p className="mt-3 text-sm font-semibold leading-6 opacity-75">
            {card.helper}
          </p>
        </article>
      ))}
    </div>
  );
}
