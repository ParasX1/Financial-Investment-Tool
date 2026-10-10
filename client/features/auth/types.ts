export type AuthMode = "sign-in" | "sign-up";

export type SignUpResult = "confirmed" | "verify-email";

export type AuthFieldErrors = Partial<
  Record<"email" | "password" | "firstName" | "lastName", string>
>;
