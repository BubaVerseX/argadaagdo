import type { ReactNode } from "react";

type InfoBannerTone = "green" | "yellow" | "white";

type InfoBannerProps = {
  title: string;
  text: string;
  tone?: InfoBannerTone;
  children?: ReactNode;
};

const toneClasses: Record<InfoBannerTone, string> = {
  green: "bg-[#ece7da] text-[#1a1815]",
  yellow: "border border-yellow-100 bg-yellow-50 text-yellow-950",
  white: "bg-white text-[#1a1815]",
};

export function InfoBanner({
  title,
  text,
  tone = "green",
  children,
}: InfoBannerProps) {
  return (
    <section className={`rounded-[1.5rem] p-5 shadow-[var(--shadow-soft)] ${toneClasses[tone]}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 leading-[1.55] opacity-85">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
