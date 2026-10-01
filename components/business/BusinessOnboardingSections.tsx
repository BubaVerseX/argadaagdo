"use client";

import { HelpCard } from "@/components/help/HelpCard";
import { CheckIcon, LockIcon, ReceiptIcon, StarIcon, TagIcon } from "@/components/icons";
import type { TranslationKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

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
  const { language } = useLanguage();
  const isGeorgian = language === "ka";

  return (
    <>
      <div className="premium-card mt-6 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
          {t("businessOnboarding.badge")}
        </p>
        <h2 className="mt-3 text-3xl font-black text-[#2e2a22] sm:text-4xl">
          {t("businessOnboarding.welcomeTitle")}
        </h2>
        <p className="mt-3 max-w-3xl font-semibold leading-7 text-[#6b6152]">
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
        <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
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
                  ? "soft-raised text-[#2e2a22]"
                  : "bg-[#f4efe4] text-[#6b6152]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                  item.completed
                    ? "bg-[#a67c52] text-white"
                    : "soft-pressed text-[#6b6152]"
                }`}
              >
                {item.completed ? <CheckIcon className="h-4 w-4" strokeWidth={2.2} /> : item.step}
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
              className="soft-raised flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black text-[#a67c52]"
            >
              <CheckIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              {tip}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <HelpCard
            icon={<TagIcon className="h-5 w-5" strokeWidth={1.8} />}
            title={isGeorgian ? "შექმენი შეთავაზებები" : "Create offers"}
            text={
              isGeorgian
                ? "გამოაქვეყნე ერთი მკაფიო სიურპრიზის ყუთი ფასით, რაოდენობითა და წაღების დროით."
                : "Publish one clear surprise bag with price, quantity and pickup time."
            }
          />
          <HelpCard
            icon={<ReceiptIcon className="h-5 w-5" strokeWidth={1.8} />}
            title={isGeorgian ? "მიიღე ჯავშნები" : "Receive reservations"}
            text={
              isGeorgian
                ? "მომხმარებლები ხელმისაწვდომ ყუთებს ჯავშნიან და შენს პანელში ჩნდებიან."
                : "Customers reserve available bags and appear in your dashboard."
            }
          />
          <HelpCard
            icon={<LockIcon className="h-5 w-5" strokeWidth={1.8} />}
            title={isGeorgian ? "შეამოწმე წაღების კოდები" : "Verify pickup codes"}
            text={
              isGeorgian
                ? "საკვების გადაცემამდე მომხმარებელს კოდი ჰკითხე."
                : "Ask the customer for their code before handing over food."
            }
          />
          <HelpCard
            icon={<StarIcon className="h-5 w-5" strokeWidth={1.8} filled />}
            title={isGeorgian ? "მიიღე შეფასებები" : "Receive ratings"}
            text={
              isGeorgian
                ? "დასრულებული წაღების შემდეგ მომხმარებლებს გამოცდილების შეფასება შეუძლიათ."
                : "After completed pickups, customers can rate the experience."
            }
          />
          <HelpCard
            title={isGeorgian ? "საუკეთესო პრაქტიკა" : "Best practice"}
            text={
              isGeorgian
                ? "გამოიყენე რეალისტური სათაურები, მაგალითად „საცხობის სიურპრიზის ყუთი“, და წაღების ფანჯრები ზუსტად მიუთითე."
                : "Use realistic titles like Bakery Surprise Bag and keep pickup windows accurate."
            }
          />
        </div>
      </div>
    </>
  );
}
