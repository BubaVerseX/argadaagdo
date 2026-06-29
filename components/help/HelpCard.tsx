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
    <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-lg font-black text-green-800">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-black text-gray-950">{title}</h3>
          <p className="mt-2 font-semibold leading-7 text-gray-700">{text}</p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
      {href && actionLabel && (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-green-700 px-5 py-2.5 text-center font-black text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 sm:w-auto"
        >
          {actionLabel}
        </Link>
      )}
    </article>
  );
}
