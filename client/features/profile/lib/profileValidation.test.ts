import {
  sanitizeEmail,
  sanitizeName,
  sanitizeNameInput,
  sanitizePhone,
  validateProfileForm,
} from "./profileValidation";

describe("profileValidation", () => {
  it("sanitizes names, email, and phone using the Profile form rules", () => {
    expect(sanitizeNameInput("  Na<than>   LI  ")).toBe(" Nathan LI ");
    expect(sanitizeName("  Na<than>   LI  ")).toBe("Nathan LI");
    expect(sanitizeEmail("  Nathan@example.COM  ")).toBe("nathan@example.com");
    expect(sanitizePhone("+61 abc (02) 5555-1234 ext 7")).toBe(
      "+61 (02) 5555-1234 7",
    );
  });

  it("accepts a complete valid profile form", () => {
    const result = validateProfileForm({
      email: "  Nathan@example.COM ",
      firstName: " Nathan ",
      lastName: " Li ",
      phone: "+61 2 5555 1234",
    });

    expect(result.valid).toBe(true);
    expect(result.values).toEqual({
      email: "nathan@example.com",
      firstName: "Nathan",
      lastName: "Li",
      phone: "+61 2 5555 1234",
    });
    expect(result.errors).toEqual({});
  });

  it("returns field-level errors for invalid account details", () => {
    const result = validateProfileForm({
      email: "not-an-email",
      firstName: "123",
      lastName: "",
      phone: "123",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      email: "Enter a valid email address",
      firstName: "First name must include letters",
      lastName: "Last name is required",
      phone: "Phone number must contain 7 to 15 digits",
    });
  });
});
