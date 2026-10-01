import type { Language } from "@/lib/i18n";

type TextValidationOptions = {
  label: string;
  value: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  multiline?: boolean;
  // Language of the returned error message. Pass a label in the same
  // language. Defaults to English.
  language?: Language;
};

export type TextValidationResult = {
  value: string;
  error: string;
};

export function normalizeText(value: string, multiline = false) {
  const trimmedValue = value.trim();

  if (!multiline) {
    return trimmedValue.replace(/\s+/g, " ");
  }

  return trimmedValue
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function containsUnsafeMarkup(value: string) {
  return (
    /<\s*\/?\s*[a-z][^>]*>/i.test(value) ||
    /javascript\s*:/i.test(value) ||
    /\bon[a-z]+\s*=/i.test(value)
  );
}

function hasExcessiveRepeatedCharacters(value: string) {
  return /(.)\1{7,}/u.test(value);
}

function hasTooManyLinks(value: string) {
  const matches = value.match(/https?:\/\/|www\./gi) || [];
  return matches.length > 1;
}

export function validateTextField({
  label,
  value,
  minLength = 1,
  maxLength = 160,
  required = true,
  multiline = false,
  language = "en",
}: TextValidationOptions): TextValidationResult {
  const normalizedValue = normalizeText(value, multiline);
  const isGeorgian = language === "ka";

  if (required && normalizedValue.length === 0) {
    return {
      value: normalizedValue,
      error: isGeorgian ? `${label} სავალდებულოა.` : `${label} is required.`,
    };
  }

  if (normalizedValue.length > 0 && normalizedValue.length < minLength) {
    return {
      value: normalizedValue,
      error: isGeorgian
        ? `${label} უნდა შეიცავდეს მინიმუმ ${minLength} სიმბოლოს.`
        : `${label} must be at least ${minLength} characters.`,
    };
  }

  if (normalizedValue.length > maxLength) {
    return {
      value: normalizedValue,
      error: isGeorgian
        ? `${label} არ უნდა აღემატებოდეს ${maxLength} სიმბოლოს.`
        : `${label} must be ${maxLength} characters or fewer.`,
    };
  }

  if (containsUnsafeMarkup(normalizedValue)) {
    return {
      value: normalizedValue,
      error: isGeorgian
        ? `${label} არ შეიძლება შეიცავდეს HTML-ს ან სკრიპტებს.`
        : `${label} cannot include HTML or scripts.`,
    };
  }

  if (hasExcessiveRepeatedCharacters(normalizedValue)) {
    return {
      value: normalizedValue,
      error: isGeorgian
        ? `${label} განმეორებადი სიმბოლოების გამო სპამს ჰგავს. გთხოვ, გამოიყენე ჩვეულებრივი ტექსტი.`
        : `${label} looks like repeated-character spam. Please use normal text.`,
    };
  }

  if (hasTooManyLinks(normalizedValue)) {
    return {
      value: normalizedValue,
      error: isGeorgian
        ? `${label} ზედმეტად ბევრ ბმულს შეიცავს.`
        : `${label} contains too many links.`,
    };
  }

  return { value: normalizedValue, error: "" };
}

export function isWithinCooldown(
  lastActionAt: number,
  cooldownMs: number,
  currentActionAt: number
) {
  return currentActionAt - lastActionAt < cooldownMs;
}
