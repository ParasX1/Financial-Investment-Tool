import {
  buildDisplayName,
  buildInitials,
  formatUserIdPreview,
  hasProfileChanges,
} from "./profileView";

describe("profileView", () => {
  it("builds a readable display name and avatar initials", () => {
    expect(
      buildDisplayName({
        email: "nathan@example.com",
        firstName: "Nathan",
        lastName: "Li",
      }),
    ).toBe("Nathan Li");

    expect(
      buildInitials({
        email: "nathan@example.com",
        firstName: "Nathan",
        lastName: "Li",
      }),
    ).toBe("NL");
  });

  it("falls back to email identity when names are empty", () => {
    expect(
      buildDisplayName({
        email: "nathan@example.com",
        firstName: "",
        lastName: "",
      }),
    ).toBe("nathan");

    expect(
      buildInitials({
        email: "nathan@example.com",
        firstName: "",
        lastName: "",
      }),
    ).toBe("N");
  });

  it("formats compact user id previews", () => {
    expect(formatUserIdPreview("12345678-90ab-cdef-1234-567890abcdef")).toBe(
      "12345678-90ab-cdef...",
    );
    expect(formatUserIdPreview(undefined)).toBe("Not signed in");
  });

  it("detects immutable profile changes against a saved snapshot", () => {
    const current = {
      avatarUrl: "https://cdn.example.com/avatar.png",
      email: "nathan@example.com",
      firstName: "Nathan",
      lastName: "Li",
      phone: "+61 2 5555 1234",
    };

    expect(hasProfileChanges(current, current)).toBe(false);
    expect(
      hasProfileChanges({ ...current, phone: "+61 2 5555 9999" }, current),
    ).toBe(true);
  });
});
