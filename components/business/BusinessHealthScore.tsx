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
  const completedChecks = checks.filter((check) => check.complete).length;
  const score =
    checks.length > 0 ? Math.round((completedChecks / checks.length) * 100) : 0;

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="premium-card rounded-3xl p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c] sm:text-sm">
              Business health
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#1a1815] sm:text-3xl">
              {score}% ready
            </h2>
            <p className="mt-2 font-semibold leading-7 text-[#6b6558]">
              A simple operations score for profile quality, active offers and
              pickup history.
            </p>
          </div>

          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#5c7a5c] shadow-[var(--shadow-soft)]">
            {completedChecks}/{checks.length} complete
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#ece7da]">
          <div
            className="h-full rounded-full bg-[#5c7a5c] transition-all"
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`rounded-2xl p-4 ${
                check.complete
                  ? "bg-white text-[#1a1815]"
                  : "bg-[#ece7da] text-[#6b6558]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    check.complete
                      ? "bg-[#5c7a5c] text-white"
                      : "bg-white text-[#6b6558]"
                  }`}
                >
                  {check.complete ? "✓" : "!"}
                </span>
                <div>
                  <p className="font-black">{check.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
                    {check.helper}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-card rounded-3xl p-5 sm:rounded-[2rem] sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c] sm:text-sm">
          Operations checklist
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#1a1815] sm:text-3xl">
          First business milestones
        </h2>
        <p className="mt-2 font-semibold leading-7 text-[#6b6558]">
          Keep the pilot simple: publish one strong offer, verify pickups and
          build trust through ratings.
        </p>

        <div className="mt-5 grid gap-3">
          {checklist.map((item, index) => {
            const content = (
              <div
                className={`rounded-2xl p-4 transition ${
                  item.complete
                    ? "bg-white text-[#1a1815]"
                    : "bg-[#ece7da] text-[#6b6558] hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      item.complete
                        ? "bg-[#5c7a5c] text-white"
                        : "bg-white text-[#6b6558]"
                    }`}
                  >
                    {item.complete ? "✓" : index + 1}
                  </span>
                  <div>
                    <p className="font-black">{item.label}</p>
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
