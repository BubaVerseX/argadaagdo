"use client";

import {
  checkName,
  cleanName,
  formatTbilisiDate,
  isNameLocked,
  NAME_MAX_LENGTH,
  nextNameChangeAt,
} from "@/lib/profileFields";
import { saveMyDisplayName } from "@/lib/profileIdentity";
import { useId, useState } from "react";

type Props = {
  name: string;
  changedAt: string | null;
  isGeorgian: boolean;
  label?: string;
  inputClassName: string;
  buttonClassName: string;
  onSaved?: (name: string, changedAt: string) => void;
};

function lockUntil(next: Date | null) {
  return isNameLocked(next) ? next : null;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

// The name can be changed once every 30 days; while locked it's read-only
// with the date it opens again. Saves only through set_my_display_name().
export default function ProfileNameEditor({
  name,
  changedAt,
  isGeorgian,
  label,
  inputClassName,
  buttonClassName,
  onSaved,
}: Props) {
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const id = useId();
  const [saved, setSaved] = useState(name);
  const [value, setValue] = useState(name);
  const [lockedUntil, setLockedUntil] = useState(() => lockUntil(nextNameChangeAt(changedAt)));
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const check = checkName(value);
  const liveError =
    check === "invalid"
      ? L("მხოლოდ ასოები", "Letters only")
      : check === "too_long"
        ? L(`მაქსიმუმ ${NAME_MAX_LENGTH} სიმბოლო`, `Max ${NAME_MAX_LENGTH} characters`)
        : "";
  const error = liveError || serverError;
  const dirty = cleanName(value) !== saved;

  async function save() {
    if (busy || lockedUntil || check !== "ok" || !dirty) return;
    setBusy(true);
    setServerError("");
    const result = await saveMyDisplayName(value);
    setBusy(false);

    switch (result.status) {
      case "ok":
      case "unchanged": {
        const next = result.displayName ?? cleanName(value);
        setSaved(next);
        setValue(next);
        if (result.status === "ok") {
          setLockedUntil(lockUntil(parseDate(result.nextChangeAt)));
          onSaved?.(next, new Date().toISOString());
        }
        break;
      }
      case "too_soon":
        setValue(result.displayName ?? saved);
        setSaved(result.displayName ?? saved);
        setLockedUntil(lockUntil(parseDate(result.nextChangeAt)));
        break;
      case "too_long":
        setServerError(L(`მაქსიმუმ ${NAME_MAX_LENGTH} სიმბოლო`, `Max ${NAME_MAX_LENGTH} characters`));
        break;
      case "invalid":
        setServerError(L("მხოლოდ ასოები", "Letters only"));
        break;
      default:
        setServerError(L("ვერ შეინახა. სცადე ხელახლა.", "Couldn't save. Try again."));
    }
  }

  const date = lockedUntil ? formatTbilisiDate(lockedUntil) : "";
  const hint = lockedUntil
    ? L(`შეგიძლია შეცვალო ${date}-ის შემდეგ`, `You can change it after ${date}`)
    : L("სახელის შეცვლა — 30 დღეში ერთხელ", "Name can be changed once every 30 days");

  return (
    <div className="grid gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-body">
          {label}
        </label>
      )}
      <input
        id={id}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setServerError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
        }}
        readOnly={Boolean(lockedUntil)}
        aria-readonly={Boolean(lockedUntil)}
        aria-label={label ? undefined : L("სახელი", "Name")}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint`}
        maxLength={NAME_MAX_LENGTH}
        autoComplete="name"
        placeholder={L("შენი სახელი", "Your name")}
        className={`${inputClassName} ${lockedUntil ? "opacity-70" : ""}`}
      />
      <p
        id={`${id}-hint`}
        role={error ? "alert" : "status"}
        className={`px-1 text-xs ${error ? "font-medium text-danger" : "text-body"}`}
      >
        {error || hint}
      </p>
      {!lockedUntil && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || check !== "ok" || !dirty}
          className={buttonClassName}
        >
          {busy ? L("ინახება...", "Saving...") : L("შენახვა", "Save")}
        </button>
      )}
    </div>
  );
}
