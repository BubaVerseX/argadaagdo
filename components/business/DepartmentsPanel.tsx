"use client";

import { CheckIcon, LockIcon, PlusIcon, TrashIcon } from "@/components/icons";
import type { Language } from "@/lib/i18n";
import {
  getDepartmentDisplayName,
  getStaffPageUrl,
  isSalesPausedToday,
} from "@/lib/greenBag";
import type { Business, Department } from "@/lib/types";
import { useState } from "react";

type DepartmentsPanelProps = {
  language: Language;
  business: Business;
  departments: Department[];
  templateCountByDepartment: Record<number, number>;
  busy: boolean;
  onToggleStorePause: (paused: boolean) => void;
  onToggleDepartmentPause: (department: Department, paused: boolean) => void;
  onAddDepartment: (name: string) => Promise<boolean>;
  onDeleteDepartment: (department: Department) => void;
  onSetStaffPin: (department: Department, pin: string | null) => Promise<boolean>;
  onResetStaffLockouts: (department: Department) => void;
};

export function DepartmentsPanel({
  language,
  business,
  departments,
  templateCountByDepartment,
  busy,
  onToggleStorePause,
  onToggleDepartmentPause,
  onAddDepartment,
  onDeleteDepartment,
  onSetStaffPin,
  onResetStaffLockouts,
}: DepartmentsPanelProps) {
  const isGeorgian = language === "ka";
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [pinDrafts, setPinDrafts] = useState<Record<number, string>>({});
  const [pinEditingId, setPinEditingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const storePaused = isSalesPausedToday(business.sales_paused_on);
  const hasMultipleDepartments = departments.length > 1;

  async function submitNewDepartment() {
    const name = newDepartmentName.trim();
    if (!name || addingDepartment) return;
    setAddingDepartment(true);
    const ok = await onAddDepartment(name);
    if (ok) setNewDepartmentName("");
    setAddingDepartment(false);
  }

  async function copyStaffLink(department: Department) {
    const url = getStaffPageUrl(department.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(department.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      window.prompt(isGeorgian ? "დააკოპირე ბმული" : "Copy this link", url);
    }
  }

  return (
    <div
      id="business-departments"
      className="premium-card mt-6 scroll-mt-24 rounded-3xl p-5 sm:mt-8 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
        {isGeorgian ? "დღევანდელი გაყიდვები" : "Today's sales"}
      </p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {storePaused
              ? isGeorgian
                ? "დღეს ჩანთები არ იყიდება"
                : "No bags today"
              : isGeorgian
              ? "მწვანე ჩანთები იყიდება"
              : "Green Bags on sale"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-body">
            {isGeorgian
              ? "„დღეს ჩანთები არ არის“ აჩერებს ახალ გაყიდვებს დღევანდელი დღისთვის. უკვე გაყიდული ჩანთები რჩება და უნდა გაიცეს ან გაუქმდეს თანხის დაბრუნებით. ერთი შეხებით ისევ ჩართავ."
              : "“Today: no bags” stops new sales for today. Bags already sold stay reserved and must be handed over or cancelled with a refund. One tap turns sales back on."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleStorePause(!storePaused)}
          className={`${
            storePaused ? "premium-button" : "premium-button-danger"
          } min-h-12 shrink-0 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {storePaused
            ? isGeorgian
              ? "გაყიდვების ჩართვა"
              : "Turn sales back on"
            : isGeorgian
            ? "დღეს ჩანთები არ არის"
            : "Today: no bags"}
        </button>
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">
              {isGeorgian ? "დეპარტამენტები" : "Departments"}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-body">
              {hasMultipleDepartments
                ? isGeorgian
                  ? "თითოეულ დეპარტამენტს თავისი შაბლონები, გრაფიკი და სურვილისამებრ თანამშრომლის PIN აქვს."
                  : "Each department has its own bag templates, schedule and an optional staff PIN."
                : isGeorgian
                ? "პატარა მაღაზიას ერთი დეპარტამენტი ჰყოფნის. დაამატე დეპარტამენტები, თუ ცომეულს, ბოსტნეულსა და კულინარიას სხვადასხვა გუნდი გასცემს."
                : "A small shop needs just this one. Add departments if different teams hand over bakery, produce or deli bags."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {departments.map((department) => {
            const paused = isSalesPausedToday(department.sales_paused_on);
            const templateCount = templateCountByDepartment[department.id] || 0;
            const editingPin = pinEditingId === department.id;

            return (
              <div
                key={department.id}
                className="ui-card grid gap-4 rounded-2xl p-4 md:grid-cols-[1fr_auto] md:items-start"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-cream">
                      {getDepartmentDisplayName(department, language)}
                    </p>
                    {department.is_default && (
                      <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold text-body">
                        {isGeorgian ? "ნაგულისხმევი" : "Default"}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        paused || storePaused
                          ? "bg-danger-soft text-danger"
                          : "bg-well text-mint"
                      }`}
                    >
                      {paused || storePaused
                        ? isGeorgian
                          ? "დღეს გაჩერებულია"
                          : "Paused today"
                        : isGeorgian
                        ? "იყიდება"
                        : "Selling"}
                    </span>
                    {department.has_staff_pin && (
                      <span className="flex items-center gap-1 rounded-full bg-well px-3 py-1 text-xs font-semibold text-body">
                        <LockIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                        PIN
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-body">
                    {templateCount}{" "}
                    {isGeorgian
                      ? templateCount === 1
                        ? "შაბლონი"
                        : "შაბლონი"
                      : templateCount === 1
                      ? "bag template"
                      : "bag templates"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void copyStaffLink(department)}
                      className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {copiedId === department.id ? (
                        <span className="flex items-center gap-1.5">
                          <CheckIcon className="h-4 w-4" strokeWidth={2} />
                          {isGeorgian ? "დაკოპირდა" : "Copied"}
                        </span>
                      ) : isGeorgian ? (
                        "თანამშრომლის ბმულის კოპირება"
                      ) : (
                        "Copy staff link"
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setPinEditingId(editingPin ? null : department.id);
                        setPinDrafts((drafts) => ({ ...drafts, [department.id]: "" }));
                      }}
                      className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {department.has_staff_pin
                        ? isGeorgian
                          ? "PIN-ის შეცვლა"
                          : "Change staff PIN"
                        : isGeorgian
                        ? "თანამშრომლის PIN-ის დაყენება"
                        : "Set staff PIN"}
                    </button>
                    {!department.is_default && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDeleteDepartment(department)}
                        aria-label={
                          isGeorgian
                            ? `${department.name} დეპარტამენტის წაშლა`
                            : `Delete department ${department.name}`
                        }
                        className="premium-button-danger min-h-11 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        <TrashIcon className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    )}
                  </div>

                  {editingPin && (
                    <div className="mt-3 grid gap-2 rounded-2xl bg-well p-3 sm:grid-cols-[1fr_auto_auto]">
                      <input
                        value={pinDrafts[department.id] || ""}
                        onChange={(event) =>
                          setPinDrafts((drafts) => ({
                            ...drafts,
                            [department.id]: event.target.value.replace(/\D/g, "").slice(0, 8),
                          }))
                        }
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder={isGeorgian ? "4–8 ციფრი" : "4–8 digits"}
                        aria-label={isGeorgian ? "თანამშრომლის PIN" : "Staff PIN"}
                        className="premium-input p-3 font-semibold"
                      />
                      <button
                        type="button"
                        disabled={busy || (pinDrafts[department.id] || "").length < 4}
                        onClick={async () => {
                          const ok = await onSetStaffPin(department, pinDrafts[department.id] || "");
                          if (ok) setPinEditingId(null);
                        }}
                        className="premium-button min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGeorgian ? "შენახვა" : "Save PIN"}
                      </button>
                      {department.has_staff_pin && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            const ok = await onSetStaffPin(department, null);
                            if (ok) setPinEditingId(null);
                          }}
                          className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:opacity-60"
                        >
                          {isGeorgian ? "PIN-ის მოხსნა" : "Remove PIN"}
                        </button>
                      )}
                      {department.has_staff_pin && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onResetStaffLockouts(department)}
                          className="premium-button-secondary min-h-11 px-4 py-2 text-sm disabled:opacity-60 sm:col-span-3 sm:justify-self-start"
                        >
                          {isGeorgian ? "დაბლოკილი მოწყობილობების განბლოკვა" : "Unlock locked devices"}
                        </button>
                      )}
                      <p className="text-xs leading-5 text-body sm:col-span-3">
                        {isGeorgian
                          ? "თანამშრომლები ხსნიან ბმულს, შეჰყავთ PIN და მომხმარებლის კოდით ასრულებენ წაღებას მფლობელის შესვლის გარეშე. 5 არასწორი ცდა მხოლოდ იმ მოწყობილობას ბლოკავს 15 წუთით; აქედან შეგიძლია განბლოკო ან ახალი PIN დააყენო."
                          : "Staff open the link, enter the PIN and complete pickups with the customer's code, without the owner login. 5 wrong tries lock only that device for 15 minutes; unlock it here or set a new PIN."}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busy || storePaused}
                  onClick={() => onToggleDepartmentPause(department, !paused)}
                  className={`${
                    paused ? "premium-button" : "premium-button-secondary"
                  } min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {paused
                    ? isGeorgian
                      ? "ისევ ჩართვა"
                      : "Turn back on"
                    : isGeorgian
                    ? "დღეს ჩანთები არ არის"
                    : "Today: no bags"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newDepartmentName}
            onChange={(event) => setNewDepartmentName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitNewDepartment();
            }}
            maxLength={60}
            placeholder={
              isGeorgian ? "მაგ. საცხობი, ბოსტნეული, კულინარია" : "e.g. Bakery, Produce, Deli"
            }
            aria-label={isGeorgian ? "ახალი დეპარტამენტის სახელი" : "New department name"}
            className="premium-input flex-1 p-3 font-semibold"
          />
          <button
            type="button"
            disabled={busy || addingDepartment || !newDepartmentName.trim()}
            onClick={() => void submitNewDepartment()}
            className="premium-button-secondary flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2} />
            {isGeorgian ? "დეპარტამენტის დამატება" : "Add department"}
          </button>
        </div>
      </div>
    </div>
  );
}
