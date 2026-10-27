import type { ReactNode } from "react";

type InfoBannerTone = "green" | "yellow" | "white";

type InfoBannerProps = {
  title: string;
  text: string;
  tone?: InfoBannerTone;
  children?: ReactNode;
};

const toneClasses: Record<InfoBannerTone, string> = {
  green: "ui-card text-cream",
  yellow: "border border-warning-line bg-warning-soft text-warning",
  white: "ui-card text-cream",
};

export function InfoBanner({
  title,
  text,
  tone = "green",
  children,
}: InfoBannerProps) {
  return (
    <section className={`rounded-[1.5rem] p-5 ${toneClasses[tone]}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 leading-[1.55] opacity-85">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
