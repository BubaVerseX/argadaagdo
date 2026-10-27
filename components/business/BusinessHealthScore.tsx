"use client";

import { AlertTriangleIcon, CheckIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";

type HealthCheck = {
  label: string;
  helper: string;
  complete: boolean;
};

type ChecklistItem = {
  label: string;
  helper: string;
  complete: boolean;
  anchor?: string;
};

type BusinessHealthScoreProps = {
  checks: HealthCheck[];
  checklist: ChecklistItem[];
};

export function BusinessHealthScore({
  checks,
  checklist,
}: BusinessHealthScoreProps) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const completedChecks = checks.filter((check) => check.complete).length;
  const score =
    checks.length > 0 ? Math.round((completedChecks / checks.length) * 100) : 0;

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="premium-card rounded-3xl p-5 sm:rounded-3xl sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {isGeorgian ? "ბიზნესის მდგომარეობა" : "Business health"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-cream sm:text-3xl">
              {score}% {isGeorgian ? "მზადაა" : "ready"}
            </h2>
            <p className="mt-2 font-semibold leading-7 text-body">
              {isGeorgian
                ? "მარტივი ოპერაციული ქულა პროფილის ხარისხის, აქტიური შეთავაზებებისა და წაღების ისტორიის მიხედვით."
                : "A simple operations score for profile quality, active offers and pickup history."}
            </p>
          </div>

          <span className="ui-card rounded-full px-4 py-2 text-sm font-semibold text-mint">
            {completedChecks}/{checks.length}{" "}
            {isGeorgian ? "შესრულებულია" : "complete"}
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-well">
          <div
            className="h-full rounded-full bg-mint transition-all"
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`rounded-2xl p-4 ${ check.complete
                  ? "ui-card text-cream"
                  : "bg-well text-body"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ check.complete
                      ? "bg-moss text-cream"
                      : "ui-well text-body"
                  }`}
                >
                  {check.complete ? (
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  ) : (
                    <AlertTriangleIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </span>
                <div>
                  <p className="font-semibold">{check.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                    {check.helper}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-card rounded-3xl p-5 sm:rounded-3xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
          {isGeorgian ? "ოპერაციების სია" : "Operations checklist"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-cream sm:text-3xl">
          {isGeorgian
            ? "ბიზნესის პირველი ეტაპები"
            : "First business milestones"}
        </h2>
        <p className="mt-2 font-semibold leading-7 text-body">
          {isGeorgian
            ? "პილოტი მარტივად წარმართე: გამოაქვეყნე ერთი ძლიერი შეთავაზება, შეამოწმე წაღებები და შეფასებებით მოიპოვე ნდობა."
            : "Keep the pilot simple: publish one strong offer, verify pickups and build trust through ratings."}
        </p>

        <div className="mt-5 grid gap-3">
          {checklist.map((item, index) => {
            const content = (
              <div
                className={`rounded-2xl p-4 transition ${ item.complete
                    ? "ui-card text-cream"
                    : "bg-well text-body hover:bg-well"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${ item.complete
                        ? "bg-moss text-cream"
                        : "ui-well text-body"
                    }`}
                  >
                    {item.complete ? (
                      <CheckIcon className="h-4 w-4" strokeWidth={2.2} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                      {item.helper}
                    </p>
                  </div>
                </div>
              </div>
            );

            if (!item.anchor) return <div key={item.label}>{content}</div>;

            return (
              <a key={item.label} href={item.anchor} className="block">
                {content}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
