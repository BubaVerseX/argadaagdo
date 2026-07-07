import { HelpCard } from "@/components/help/HelpCard";
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
      <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
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
          className="premium-button mt-6 w-full px-6 py-3 text-center sm:w-auto"
        >
          {t("businessOnboarding.createFirstBag")}
        </a>
      </div>

      <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <HelpCard
            icon="🥡"
            title="Create offers"
            text="Publish one clear surprise bag with price, quantity and pickup time."
          />
          <HelpCard
            icon="🧾"
            title="Receive reservations"
            text="Customers reserve available bags and appear in your dashboard."
          />
          <HelpCard
            icon="🔐"
            title="Verify pickup codes"
            text="Ask the customer for their code before handing over food."
          />
          <HelpCard
            icon="⭐"
            title="Receive ratings"
            text="After completed pickups, customers can rate the experience."
          />
          <HelpCard
            icon="✓"
            title="Best practice"
            text="Use realistic titles like Bakery Surprise Bag and keep pickup windows accurate."
          />
        </div>
      </div>
    </>
  );
}
