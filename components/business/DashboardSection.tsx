import { ChevronDownIcon } from "@/components/icons";
import type { ReactNode } from "react";

/**
 * A closed-by-default dashboard section: one row with a short title and an
 * optional count; the content opens on tap. Content stays mounted, so
 * half-filled forms survive closing it. The id lets #hash links open it.
 */
export function DashboardSection({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details id={id} className="group mt-3 scroll-mt-24">
      <summary className="ui-card flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 text-lg font-semibold text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-mint [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-body">
          {meta}
          <ChevronDownIcon className="h-5 w-5 transition-transform group-open:rotate-180" strokeWidth={1.8} />
        </span>
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );
}
