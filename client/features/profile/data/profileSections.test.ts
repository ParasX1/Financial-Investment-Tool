import {
  PROFILE_PRIMARY_TABS,
  PROFILE_SECTION_NAV_ITEMS,
  PROFILE_SUPPORT_CARDS,
} from "./profileSections";

describe("profileSections", () => {
  it("keeps Profile navigation scoped to existing account features", () => {
    expect(PROFILE_PRIMARY_TABS.map((tab) => tab.id)).toEqual([
      "overview",
      "personal-settings",
      "security",
    ]);
    expect(PROFILE_SECTION_NAV_ITEMS.map((item) => item.id)).toEqual([
      "profile-card",
      "personal-details",
      "security",
    ]);
  });

  it("does not introduce Yahoo-only settings surfaces", () => {
    const joinedLabels = [
      ...PROFILE_PRIMARY_TABS.map((tab) => tab.label),
      ...PROFILE_SECTION_NAV_ITEMS.map((item) => item.label),
      ...PROFILE_SUPPORT_CARDS.map((card) => card.title),
    ].join(" ");

    expect(joinedLabels).not.toMatch(/wallet|subscription|passkey/i);
  });

  it("uses account-settings rows instead of a global edit mode", () => {
    const joinedCopy = [
      ...PROFILE_PRIMARY_TABS.map((tab) => tab.label),
      ...PROFILE_SECTION_NAV_ITEMS.map((item) => item.label),
      ...PROFILE_SECTION_NAV_ITEMS.map((item) => item.description),
      ...PROFILE_SUPPORT_CARDS.map((card) => card.title),
      ...PROFILE_SUPPORT_CARDS.map((card) => card.body),
    ].join(" ");

    expect(joinedCopy).not.toMatch(/unlock|global edit|edit mode/i);
    expect(joinedCopy).toMatch(/sign-in security/i);
  });

  it("keeps support guidance scoped to behavior Profile actually owns", () => {
    const supportCopy = PROFILE_SUPPORT_CARDS.map((card) => card.body).join(
      " ",
    );

    expect(supportCopy).not.toMatch(/community|posts|comments/i);
    expect(supportCopy).toMatch(/account details/i);
    expect(supportCopy).not.toMatch(/private/i);
  });
});
