import type { ProfileErrors, ProfileFormValues } from "../types";

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export function sanitizeNameInput(value: string) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 50);
}

export function sanitizeName(value: string) {
  return sanitizeNameInput(value).trim();
}

export function sanitizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254);
}

export function sanitizeHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}

export function sanitizePhone(value: string) {
  return value
    .replace(/[^\d+\-().\s]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 24)
    .trim();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function hasLetter(value: string) {
  return Array.from(value).some(
    (char) => char.toLocaleLowerCase() !== char.toLocaleUpperCase(),
  );
}

export function validateName(label: string, value: string) {
  if (!value) return `${label} is required`;
  if (!hasLetter(value)) return `${label} must include letters`;
  if (/^\d+$/.test(value.replace(/\s/g, ""))) {
    return `${label} cannot be only numbers`;
  }

  return "";
}

export function validateHandle(value: string) {
  if (!value) return "Handle is required";
  if (value.length < 3) return "Handle must be at least 3 characters";
  if (!/^[a-z]/.test(value)) return "Handle must start with a letter";
  if (!/^[a-z][a-z0-9_]{2,29}$/.test(value)) {
    return "Use 3 to 30 lowercase letters, numbers, or underscores";
  }

  return "";
}

export function validatePhone(value: string) {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Phone number must contain 7 to 15 digits";
  }

  if (!/^\+?[\d\s().-]+$/.test(value)) {
    return "Phone number contains unsupported characters";
  }

  return "";
}

export function validateProfileForm(values: ProfileFormValues) {
  const nextValues: ProfileFormValues = {
    email: sanitizeEmail(values.email),
    firstName: sanitizeName(values.firstName),
    handle: sanitizeHandle(values.handle),
    lastName: sanitizeName(values.lastName),
    phone: sanitizePhone(values.phone),
  };
  const errors: ProfileErrors = {};

  const firstNameError = validateName("First name", nextValues.firstName);
  const handleError = validateHandle(nextValues.handle);
  const lastNameError = validateName("Last name", nextValues.lastName);
  const phoneError = validatePhone(nextValues.phone);

  if (firstNameError) errors.firstName = firstNameError;
  if (handleError) errors.handle = handleError;
  if (lastNameError) errors.lastName = lastNameError;
  if (!nextValues.email) errors.email = "Email is required";
  else if (!isValidEmail(nextValues.email)) {
    errors.email = "Enter a valid email address";
  }
  if (phoneError) errors.phone = phoneError;

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    values: nextValues,
  };
}
