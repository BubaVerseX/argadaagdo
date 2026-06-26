type TextValidationOptions = {
  label: string;
  value: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  multiline?: boolean;
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
}: TextValidationOptions): TextValidationResult {
  const normalizedValue = normalizeText(value, multiline);

  if (required && normalizedValue.length === 0) {
    return { value: normalizedValue, error: `${label} is required.` };
  }

  if (normalizedValue.length > 0 && normalizedValue.length < minLength) {
    return {
      value: normalizedValue,
      error: `${label} must be at least ${minLength} characters.`,
    };
  }

  if (normalizedValue.length > maxLength) {
    return {
      value: normalizedValue,
      error: `${label} must be ${maxLength} characters or fewer.`,
    };
  }

  if (containsUnsafeMarkup(normalizedValue)) {
    return {
      value: normalizedValue,
      error: `${label} cannot include HTML or scripts.`,
    };
  }

  if (hasExcessiveRepeatedCharacters(normalizedValue)) {
    return {
      value: normalizedValue,
      error: `${label} looks like repeated-character spam. Please use normal text.`,
    };
  }

  if (hasTooManyLinks(normalizedValue)) {
    return {
      value: normalizedValue,
      error: `${label} contains too many links.`,
    };
  }

  return { value: normalizedValue, error: "" };
}

export function isWithinCooldown(lastActionAt: number, cooldownMs: number) {
  return Date.now() - lastActionAt < cooldownMs;
}
