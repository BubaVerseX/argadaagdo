"use client";

import { ChevronRightIcon, UserIcon } from "@/components/icons";
import { loadMyIdentity, type MyIdentity } from "@/lib/profileIdentity";
import { useEffect, useState } from "react";
import ProfileNameEditor from "./ProfileNameEditor";

type Props = {
  userId: string;
  fallbackName: string;
  isGeorgian: boolean;
  rowClass: string;
  fieldClass: string;
};

// The "Name" row of the app's Settings → Account card: shows the name and
// opens the editor (once every 30 days) below it.
export default function NativeNameSetting({
  userId,
  fallbackName,
  isGeorgian,
  rowClass,
  fieldClass,
}: Props) {
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [identity, setIdentity] = useState<MyIdentity | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void loadMyIdentity(userId).then(
      (loaded) =>
        active &&
        setIdentity(loaded || { displayName: "", displayNameChangedAt: null, avatarPath: null })
    );
    return () => {
      active = false;
    };
  }, [userId]);

  const shown = identity?.displayName || fallbackName;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        disabled={!identity}
        className={`${rowClass} border-t border-line`}
      >
        <UserIcon className="h-[18px] w-[18px] shrink-0 text-sage" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate">
          {shown || L("სახელი", "Name")}
        </span>
        <ChevronRightIcon
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          strokeWidth={2}
        />
      </button>
      {open && identity && (
        <div className="border-t border-line p-4">
          <ProfileNameEditor
            name={identity.displayName}
            changedAt={identity.displayNameChangedAt}
            isGeorgian={isGeorgian}
            inputClassName={fieldClass}
            buttonClassName="native-press mt-1.5 min-h-11 rounded-2xl bg-brand-forest text-sm font-semibold text-brand-ground disabled:opacity-60"
            onSaved={(displayName, displayNameChangedAt) =>
              setIdentity((current) =>
                current ? { ...current, displayName, displayNameChangedAt } : current
              )
            }
          />
        </div>
      )}
    </>
  );
}
