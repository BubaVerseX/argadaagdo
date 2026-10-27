"use client";

import { useLanguage } from "@/lib/useLanguage";

export type TimelineStepState = "done" | "current" | "pending" | "stopped";

export type TimelineStep = {
  label: string;
  state: TimelineStepState;
};

type TimelineStepsProps = {
  steps: TimelineStep[];
  columnsClassName?: string;
  ariaLabel: string;
};

export function TimelineSteps({
  steps,
  columnsClassName = "sm:grid-cols-4",
  ariaLabel,
}: TimelineStepsProps) {
  const { language } = useLanguage();
  const stateLabels: Record<TimelineStepState, string> =
    language === "ka"
      ? {
          done: "დასრულებული",
          current: "მიმდინარე ეტაპი",
          pending: "ჯერ არა",
          stopped: "შეჩერებული",
        }
      : {
          done: "done",
          current: "current step",
          pending: "not yet",
          stopped: "stopped",
        };
  const stepStyles: Record<TimelineStepState, string> = {
    done: "ui-well text-mint",
    current: "bg-warning-soft text-warning",
    pending: "bg-well text-body",
    stopped: "bg-danger-soft text-danger",
  };

  return (
    <ol className={`grid gap-2 ${columnsClassName}`} aria-label={ariaLabel}>
      {steps.map((step, index) => (
        <li
          key={`${step.label}-${index}`}
          aria-current={step.state === "current" ? "step" : undefined}
          className={`rounded-2xl px-3 py-3 text-center text-xs font-semibold sm:text-sm ${stepStyles[step.state]}`}
        >
          {step.label}
          {/* The state is otherwise shown by color only. */}
          <span className="sr-only">{` (${stateLabels[step.state]})`}</span>
        </li>
      ))}
    </ol>
  );
}
