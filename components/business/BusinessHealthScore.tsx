"use client";

import { CheckIcon } from "@/components/icons";

type HealthCheck = {
  label: string;
  complete: boolean;
};

/** Setup checklist: one short line per item. */
export function BusinessHealthScore({ checks }: { checks: HealthCheck[] }) {
  return (
    <ul className="grid gap-1">
      {checks.map((check) => (
        <li
          key={check.label}
          className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
            check.complete ? "text-body" : "bg-well text-cream"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              check.complete ? "bg-mint text-ink" : "border border-line"
            }`}
          >
            {check.complete && <CheckIcon className="h-4 w-4" strokeWidth={2.2} />}
          </span>
          {check.label}
        </li>
      ))}
    </ul>
  );
}

export function countCompleteChecks(checks: HealthCheck[]) {
  return checks.filter((check) => check.complete).length;
}
