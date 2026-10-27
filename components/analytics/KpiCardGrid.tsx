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
  green: "ui-card text-cream",
  yellow: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  white: "ui-card text-cream",
};

export function KpiCardGrid({ cards }: KpiCardGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.title}
          className={`rounded-3xl p-5 ${ toneClasses[card.tone || "white"]
          }`}
        >
          <p className="text-sm font-semibold opacity-75">{card.title}</p>
          <p className="mt-2 text-3xl font-semibold sm:text-4xl">{card.value}</p>
          <p className="mt-3 text-sm font-semibold leading-6 opacity-75">
            {card.helper}
          </p>
        </article>
      ))}
    </div>
  );
}
