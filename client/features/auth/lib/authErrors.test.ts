import { getAuthErrorMessage } from "./authErrors";

describe("getAuthErrorMessage", () => {
  it("uses a generic message for invalid credentials", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials" }, "sign-in")).toBe(
      "We couldn't sign you in with those details. Check your email and password and try again.",
    );
  });

  it("explains email confirmation without exposing raw provider messages", () => {
    expect(
      getAuthErrorMessage(
        { code: "email_not_confirmed", message: "sensitive provider text" },
        "sign-in",
      ),
    ).toBe("Confirm your email before signing in. Check your inbox for the confirmation link.");
  });

  it("maps throttling to a useful retry message", () => {
    expect(getAuthErrorMessage({ status: 429 }, "sign-up")).toBe(
      "Too many attempts. Wait a moment, then try again.",
    );
  });

  it("does not display unknown raw Supabase errors", () => {
    expect(
      getAuthErrorMessage(
        { message: "Database host and internal details" },
        "sign-up",
      ),
    ).toBe("We couldn't create your account. Please try again.");
  });
});
