import type { TranslationKey } from "@/lib/i18n";

type ChecklistItem = {
  step: number;
  label: string;
  completed: boolean;
};

type BusinessOnboardingSectionsProps = {
  t: (key: TranslationKey) => string;
  checklist: ChecklistItem[];
};

export function BusinessOnboardingSections({
  t,
  checklist,
}: BusinessOnboardingSectionsProps) {
  return (
    <>
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
          {t("businessOnboarding.badge")}
        </p>
        <h2 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl">
          {t("businessOnboarding.welcomeTitle")}
        </h2>
        <p className="mt-3 max-w-3xl font-semibold leading-7 text-gray-700">
          {t("businessOnboarding.welcomeText")}
        </p>
        <a
          href="#create-offer"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800 sm:w-auto"
        >
          {t("businessOnboarding.createFirstBag")}
        </a>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
          {t("businessOnboarding.checklistBadge")}
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
          {t("businessOnboarding.checklistTitle")}
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-2xl p-4 font-bold ${
                item.completed
                  ? "bg-green-50 text-green-800"
                  : "bg-[#F7F6EF] text-gray-700"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                  item.completed
                    ? "bg-green-700 text-white"
                    : "bg-white text-gray-500"
                }`}
              >
                {item.completed ? "✓" : item.step}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            t("businessOnboarding.tipPublishEarly"),
            t("businessOnboarding.tipClearNames"),
            t("businessOnboarding.tipAccurateTimes"),
          ].map((tip) => (
            <span
              key={tip}
              className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-800"
            >
              ✓ {tip}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
