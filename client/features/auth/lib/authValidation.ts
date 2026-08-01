import type { AuthFieldErrors, AuthMode } from "../types";

const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 80;
const NEW_PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NEW_PASSWORD_HELPER_TEXT = "Use 8 to 128 characters.";

type AuthFormDraft = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type SignInValues = { email: string; password: string };
type SignUpValues = SignInValues & { firstName: string; lastName: string };

export type AuthValidationResult = {
  errors: AuthFieldErrors;
  values: SignInValues | SignUpValues;
};

function validateEmail(email: string) {
  if (!email) return "Enter your email address.";
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

function validateName(name: string) {
  if (!name) return "Enter your name.";
  if (name.length > NAME_MAX_LENGTH) return "Use 80 characters or fewer.";
  return undefined;
}

export function validateNewPassword(password: string) {
  if (!password) return "Enter your password.";
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Use 128 characters or fewer.";
  }
  if (password.length < NEW_PASSWORD_MIN_LENGTH) {
    return "Use at least 8 characters.";
  }
  return undefined;
}

function validatePassword(password: string, mode: AuthMode) {
  if (mode === "sign-up") return validateNewPassword(password);
  if (!password) return "Enter your password.";
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Use 128 characters or fewer.";
  }
  return undefined;
}

export function validateAuthForm(
  mode: AuthMode,
  draft: AuthFormDraft,
): AuthValidationResult {
  const email = draft.email.trim().toLowerCase();
  const password = draft.password;
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password, mode);

  if (emailError) errors.email = emailError;

  if (mode === "sign-up") {
    const firstName = (draft.firstName ?? "").trim();
    const lastName = (draft.lastName ?? "").trim();
    const firstNameError = validateName(firstName);
    const lastNameError = validateName(lastName);

    if (firstNameError) {
      errors.firstName = firstName ? firstNameError : "Enter your first name.";
    }
    if (lastNameError) {
      errors.lastName = lastName ? lastNameError : "Enter your last name.";
    }
    if (passwordError) errors.password = passwordError;
    return { errors, values: { email, firstName, lastName, password } };
  }

  if (passwordError) errors.password = passwordError;
  return { errors, values: { email, password } };
}
