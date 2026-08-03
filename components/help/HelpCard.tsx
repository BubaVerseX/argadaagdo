import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon } from "@/components/icons";

type HelpCardProps = {
  title: string;
  text: string;
  icon?: ReactNode;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
};

export function HelpCard({
  title,
  text,
  icon = <CheckIcon className="h-5 w-5" strokeWidth={1.8} />,
  href,
  actionLabel,
  children,
}: HelpCardProps) {
  return (
    <article className="soft-raised rounded-[1.75rem] p-5">
      <div className="flex items-start gap-3">
        <span className="soft-pressed flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#a67c52]">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-bold text-[#2e2a22]">{title}</h3>
          <p className="mt-2 leading-[1.55] text-[#6b6152]">{text}</p>
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
