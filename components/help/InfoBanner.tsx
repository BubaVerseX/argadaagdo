import type { ReactNode } from "react";

type InfoBannerTone = "green" | "yellow" | "white";

type InfoBannerProps = {
  title: string;
  text: string;
  tone?: InfoBannerTone;
  children?: ReactNode;
};

const toneClasses: Record<InfoBannerTone, string> = {
  green: "soft-raised text-[#2e2a22]",
  yellow: "border border-yellow-100 bg-yellow-50 text-yellow-950",
  white: "soft-raised text-[#2e2a22]",
};

export function InfoBanner({
  title,
  text,
  tone = "green",
  children,
}: InfoBannerProps) {
  return (
    <section className={`rounded-[1.5rem] p-5 ${toneClasses[tone]}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 leading-[1.55] opacity-85">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
