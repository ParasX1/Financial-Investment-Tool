import {
  buildFallbackHandle,
  sanitizeEmail,
  sanitizeHandle,
  sanitizeName,
  sanitizeNameInput,
  sanitizePhone,
  sanitizeProfileField,
  validateEmail,
  validateIdentity,
  validatePhoneDetails,
  validateProfileForm,
} from "./profileValidation";

describe("profileValidation", () => {
  it("sanitizes names, email, and phone using the Profile form rules", () => {
    expect(sanitizeNameInput("  Na<than>   LI  ")).toBe(" Nathan LI ");
    expect(sanitizeName("  Na<than>   LI  ")).toBe("Nathan LI");
    expect(sanitizeEmail("  Nathan@example.COM  ")).toBe("nathan@example.com");
    expect(sanitizeHandle("  @Nathan-LI!! ")).toBe("nathanli");
    expect(sanitizePhone("+61 abc (02) 5555-1234 ext 7")).toBe(
      "+61 (02) 5555-1234 7",
    );
  });

  it("accepts a complete valid profile form", () => {
    const result = validateProfileForm({
      email: "  Nathan@example.COM ",
      firstName: " Nathan ",
      handle: " nathan_li ",
      lastName: " Li ",
      phone: "+61 2 5555 1234",
    });

    expect(result.valid).toBe(true);
    expect(result.values).toEqual({
      email: "nathan@example.com",
      firstName: "Nathan",
      handle: "nathan_li",
      lastName: "Li",
      phone: "+61 2 5555 1234",
    });
    expect(result.errors).toEqual({});
  });

  it("returns field-level errors for invalid account details", () => {
    const result = validateProfileForm({
      email: "not-an-email",
      firstName: "123",
      handle: "123",
      lastName: "",
      phone: "123",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      email: "Enter a valid email address",
      firstName: "First name must include letters",
      handle: "Handle must start with a letter",
      lastName: "Last name is required",
      phone: "Phone number must contain 7 to 15 digits",
    });
  });

  it("routes field updates through the matching sanitizer", () => {
    expect(sanitizeProfileField("firstName", "  Na<than>  ")).toBe(" Nathan ");
    expect(sanitizeProfileField("lastName", "  L<i>  ")).toBe(" Li ");
    expect(sanitizeProfileField("email", " USER@EXAMPLE.COM ")).toBe(
      "user@example.com",
    );
    expect(sanitizeProfileField("handle", " @New-Handle ")).toBe("newhandle");
    expect(sanitizeProfileField("phone", "+61 abc 400 123 456")).toBe(
      "+61 400 123 456",
    );
  });

  it("builds deterministic, user-specific fallback handles", () => {
    const first = buildFallbackHandle(
      "123@example.com",
      "5b96223a-40bc-4e0f-a882-001122334455",
    );
    const second = buildFallbackHandle(
      "123@example.com",
      "5b96223a-40bc-4e0f-a882-998877665544",
    );

    expect(first).toBe("user_001122334455");
    expect(second).toBe("user_998877665544");
    expect(first).not.toBe(second);
    expect(first.length).toBeLessThanOrEqual(30);
  });

  it("validates identity, email, and phone as independent workflows", () => {
    expect(
      validateIdentity({
        firstName: " Ada ",
        handle: " ada_1 ",
        lastName: " Li ",
      }),
    ).toMatchObject({
      valid: true,
      values: { firstName: "Ada", handle: "ada_1", lastName: "Li" },
    });
    expect(validateEmail({ email: "invalid" }).errors).toEqual({
      email: "Enter a valid email address",
    });
    expect(validatePhoneDetails({ phone: "123" }).errors).toEqual({
      phone: "Phone number must contain 7 to 15 digits",
    });
  });
});
