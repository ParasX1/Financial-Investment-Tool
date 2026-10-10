import { PROFILE_SETTINGS_GROUPS } from "./profileSections";

describe("profileSections", () => {
  it("keeps Profile settings scoped to existing account features", () => {
    expect(PROFILE_SETTINGS_GROUPS.map((item) => item.id)).toEqual([
      "profile",
      "contact",
      "security",
    ]);
  });

  it("does not introduce Yahoo-only settings surfaces", () => {
    const joinedLabels = PROFILE_SETTINGS_GROUPS.map(
      (item) => `${item.label} ${item.description}`,
    ).join(" ");

    expect(joinedLabels).not.toMatch(/wallet|subscription|passkey/i);
  });

  it("keeps settings compact instead of navigation-heavy", () => {
    const joinedCopy = PROFILE_SETTINGS_GROUPS.map(
      (item) => `${item.label} ${item.description}`,
    ).join(" ");

    expect(joinedCopy).not.toMatch(/overview|sidebar|global edit|edit mode/i);
    expect(joinedCopy).toMatch(/password/i);
    expect(joinedCopy).not.toMatch(/signed-out login/i);
  });
});
