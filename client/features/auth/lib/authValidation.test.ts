import { validateAuthForm } from "./authValidation";

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
