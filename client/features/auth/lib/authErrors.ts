import type { AuthMode } from "../types";

type AuthAction = AuthMode | "oauth" | "password-update";
type AuthErrorShape = {
  cause?: unknown;
  code?: unknown;
  name?: unknown;
  status?: unknown;
};

const MAX_AUTH_ERROR_CAUSE_DEPTH = 4;

function asErrorShape(error: unknown): AuthErrorShape {
  return error && typeof error === "object" ? error : {};
}

function getErrorShapes(error: unknown, depth = 0): AuthErrorShape[] {
  if (!error || typeof error !== "object") return [];

  const shape = asErrorShape(error);
  if (depth >= MAX_AUTH_ERROR_CAUSE_DEPTH) return [shape];
  return [shape, ...getErrorShapes(shape.cause, depth + 1)];
}

export function getAuthErrorMessage(error: unknown, action: AuthAction) {
  const shapes =
    action === "password-update"
      ? getErrorShapes(error)
      : [asErrorShape(error)];
  const hasCode = (expected: string) =>
    shapes.some(({ code }) => code === expected);

  if (
    shapes.some(
      ({ code, status }) =>
        status === 429 ||
        (typeof code === "string" && code.includes("rate_limit")),
    )
  ) {
    return "Too many attempts. Wait a moment, then try again.";
  }
  if (hasCode("email_not_confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  if (hasCode("invalid_credentials")) {
    return "We couldn't sign you in with those details. Check your email and password and try again.";
  }
  if (hasCode("weak_password")) {
    return "Choose a stronger password and try again.";
  }
  if (shapes.some(({ name }) => name === "AuthRetryableFetchError")) {
    if (action === "password-update") {
      return "We couldn't reach the account service. Check your connection and try again.";
    }
    return "We couldn't reach the sign-in service. Check your connection and try again.";
  }
  if (action === "password-update") {
    return "Password update failed. Please try again.";
  }
  if (action === "sign-up") {
    return "We couldn't create your account. Please try again.";
  }
  if (action === "oauth") {
    return "Google sign-in couldn't start. Please try again.";
  }
  return "We couldn't sign you in. Please try again.";
}
