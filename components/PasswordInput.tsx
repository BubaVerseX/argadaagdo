"use client";

import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * A password field with an eye button that shows or hides what was typed.
 * Drop-in for <input type="password">: same props and classes; the field
 * keeps its look and gets room on the right for the button.
 */
export default function PasswordInput({
  className = "",
  style,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { language } = useLanguage();
  const label = visible
    ? language === "ka"
      ? "პაროლის დამალვა"
      : "Hide password"
    : language === "ka"
    ? "პაროლის ჩვენება"
    : "Show password";

  return (
    <div className="relative w-full">
      <input
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={`${className} w-full`}
        style={{ ...style, paddingRight: "3rem" }}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        disabled={disabled}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-muted transition-colors hover:text-cream focus-visible:text-cream focus-visible:outline-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOffIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
