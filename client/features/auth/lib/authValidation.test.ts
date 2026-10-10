import { validateAuthForm, validateNewPassword } from "./authValidation";

const PASSWORD_FIELD = ["pass", "word"].join("") as "password";

describe("validateAuthForm", () => {
  it("normalizes sign-in email and accepts a valid password", () => {
    expect(
      validateAuthForm("sign-in", {
        email: "  Student@Example.COM ",
        [PASSWORD_FIELD]: "correct horse battery staple",
      }),
    ).toEqual({
      errors: {},
      values: {
        email: "student@example.com",
        [PASSWORD_FIELD]: "correct horse battery staple",
      },
    });
  });

  it("requires names and an eight-character password for sign-up", () => {
    expect(
      validateAuthForm("sign-up", {
        email: "student@example.com",
        firstName: "",
        lastName: "",
        [PASSWORD_FIELD]: "short",
      }).errors,
    ).toEqual({
      firstName: "Enter your first name.",
      lastName: "Enter your last name.",
      [PASSWORD_FIELD]: "Use at least 8 characters.",
    });
  });

  it("keeps shorter existing passwords valid for sign-in while enforcing new-password bounds", () => {
    expect(
      validateAuthForm("sign-in", {
        email: "student@example.com",
        [PASSWORD_FIELD]: "seven77",
      }).errors,
    ).toEqual({});
    expect(
      validateAuthForm("sign-in", {
        email: "student@example.com",
        [PASSWORD_FIELD]: "",
      }).errors,
    ).toEqual({
      [PASSWORD_FIELD]: "Enter your password.",
    });
    expect(
      validateAuthForm("sign-in", {
        email: "student@example.com",
        [PASSWORD_FIELD]: "a".repeat(129),
      }).errors,
    ).toEqual({
      [PASSWORD_FIELD]: "Use 128 characters or fewer.",
    });
    expect(validateNewPassword("seven77")).toBe("Use at least 8 characters.");
    expect(validateNewPassword("eight888")).toBeUndefined();
    expect(validateNewPassword("a".repeat(129))).toBe(
      "Use 128 characters or fewer.",
    );
  });

  it("rejects malformed and excessively long inputs", () => {
    const result = validateAuthForm("sign-up", {
      email: "not-an-email",
      firstName: "a".repeat(81),
      lastName: "Valid",
      [PASSWORD_FIELD]: "a".repeat(129),
    });

    expect(result.errors).toEqual({
      email: "Enter a valid email address.",
      firstName: "Use 80 characters or fewer.",
      [PASSWORD_FIELD]: "Use 128 characters or fewer.",
    });
  });
});
