import {
  PROFILE_PRIMARY_TABS,
  PROFILE_SECTION_NAV_ITEMS,
  PROFILE_SUPPORT_CARDS,
} from "./profileSections";

describe("profileSections", () => {
  it("keeps Profile navigation scoped to existing account features", () => {
    expect(PROFILE_PRIMARY_TABS.map((tab) => tab.id)).toEqual([
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
});
