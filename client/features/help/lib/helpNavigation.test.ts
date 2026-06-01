import { helpSections } from "../data/helpContent";
import {
  defaultHelpSectionId,
  getHelpNavItems,
  helpSectionIds,
  resolveHelpSection,
} from "./helpNavigation";

describe("helpNavigation", () => {
  it("derives stable section ids from help content", () => {
    expect(helpSectionIds).toEqual(helpSections.map((section) => section.id));
    expect(defaultHelpSectionId).toBe(helpSections[0]!.id);
  });

  it("maps help sections into learning navigation items", () => {
    expect(getHelpNavItems()[0]).toMatchObject({
      id: helpSections[0]!.id,
      label: helpSections[0]!.label,
      description: helpSections[0]!.subtitle,
      icon: helpSections[0]!.icon,
    });
  });

  it("resolves unknown help sections to the default section", () => {
    expect(resolveHelpSection("not-a-section")).toBe(helpSections[0]);
  });
});
