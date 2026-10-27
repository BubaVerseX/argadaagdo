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
  yellow: "border border-warning-line bg-warning-soft text-cream",
  red: "border border-danger-line bg-danger-soft text-cream",
  white: "ui-card text-cream",
};

// Title colour carries the tone; the value stays cream for contrast.
const labelClasses: Record<KpiTone, string> = {
  green: "text-mint",
  yellow: "text-warning",
  red: "text-danger",
  white: "text-body",
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
          <p className={`text-sm font-semibold ${labelClasses[card.tone || "white"]}`}>
            {card.title}
          </p>
          <p className="mt-2 text-3xl font-semibold sm:text-4xl">{card.value}</p>
          <p className="mt-3 text-sm leading-6 text-body">{card.helper}</p>
        </article>
      ))}
    </div>
  );
}
