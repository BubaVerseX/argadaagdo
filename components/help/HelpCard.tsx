import Link from "next/link";
import type { ReactNode } from "react";

type HelpCardProps = {
  title: string;
  text: string;
  icon?: string;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
};

export function HelpCard({
  title,
  text,
  icon = "✓",
  href,
  actionLabel,
  children,
}: HelpCardProps) {
  return (
    <article className="rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ece7da] text-lg font-bold text-[#5c7a5c]">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-bold text-[#1a1815]">{title}</h3>
          <p className="mt-2 leading-[1.55] text-[#6b6558]">{text}</p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
      {href && actionLabel && (
        <Link href={href} className="premium-button mt-5 w-full sm:w-auto">
          {actionLabel}
        </Link>
      )}
    </article>
  );
}
