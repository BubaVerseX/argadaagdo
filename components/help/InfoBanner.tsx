import type { ReactNode } from "react";

type InfoBannerTone = "green" | "yellow" | "white";

type InfoBannerProps = {
  title: string;
  text: string;
  tone?: InfoBannerTone;
  children?: ReactNode;
};

const toneClasses: Record<InfoBannerTone, string> = {
  green: "border-green-100 bg-green-50 text-green-950",
  yellow: "border-yellow-100 bg-yellow-50 text-yellow-950",
  white: "border-gray-100 bg-white text-gray-950",
};

export function InfoBanner({
  title,
  text,
  tone = "green",
  children,
}: InfoBannerProps) {
  return (
    <section className={`rounded-3xl border p-5 ${toneClasses[tone]}`}>
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-2 font-semibold leading-7 opacity-85">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
