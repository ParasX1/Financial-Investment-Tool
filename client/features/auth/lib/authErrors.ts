import type { AuthMode } from "../types";

type AuthAction = AuthMode | "oauth";
type AuthErrorShape = { code?: unknown; name?: unknown; status?: unknown };

function asErrorShape(error: unknown): AuthErrorShape {
  return error && typeof error === "object" ? error : {};
}

export function getAuthErrorMessage(error: unknown, action: AuthAction) {
  const shape = asErrorShape(error);
  const code = typeof shape.code === "string" ? shape.code : "";
  const name = typeof shape.name === "string" ? shape.name : "";

  if (shape.status === 429 || code.includes("rate_limit")) {
    return "Too many attempts. Wait a moment, then try again.";
  }
  if (code === "email_not_confirmed") {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  if (code === "invalid_credentials") {
    return "We couldn't sign you in with those details. Check your email and password and try again.";
  }
  if (code === "weak_password") {
    return "Choose a stronger password and try again.";
  }
  if (name === "AuthRetryableFetchError") {
    return "We couldn't reach the sign-in service. Check your connection and try again.";
  }
  if (action === "sign-up") {
    return "We couldn't create your account. Please try again.";
  }
  if (action === "oauth") {
    return "Google sign-in couldn't start. Please try again.";
  }
  return "We couldn't sign you in. Please try again.";
}
