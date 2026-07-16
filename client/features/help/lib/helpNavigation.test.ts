import { describe, expect, it } from "@jest/globals";
import { helpSections } from "../data/helpContent";
import {
  defaultHelpSectionId,
  getHelpNavItems,
  helpSectionIds,
  resolveHelpSection,
} from "./helpNavigation";

describe("helpNavigation", () => {
  it("derives stable, unique section ids from immutable help content", () => {
    expect(helpSectionIds).toEqual(helpSections.map((section) => section.id));
    expect(defaultHelpSectionId).toBe(helpSections[0].id);
    expect(new Set(helpSectionIds).size).toBe(helpSectionIds.length);
    expect(Object.isFrozen(helpSections)).toBe(true);
  });

  it("maps help sections into learning navigation items", () => {
    expect(getHelpNavItems()[0]).toMatchObject({
      id: helpSections[0].id,
      label: helpSections[0].label,
      description: helpSections[0].subtitle,
      icon: helpSections[0].icon,
    });
  });

  it("resolves unknown help sections to the default section", () => {
    expect(resolveHelpSection("not-a-section")).toBe(helpSections[0]);
  });

  it("resolves against the content collection supplied by the caller", () => {
    const customSections = [
      { ...helpSections[1], id: "custom-first" },
      { ...helpSections[0], id: "custom-second" },
    ] as const;

    expect(resolveHelpSection("custom-second", customSections)).toBe(
      customSections[1],
    );
    expect(resolveHelpSection("unknown", customSections)).toBe(
      customSections[0],
    );
  });
});
