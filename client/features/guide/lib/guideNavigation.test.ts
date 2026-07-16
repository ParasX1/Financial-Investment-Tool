import { describe, expect, it } from "@jest/globals";
import { guideSections } from "../data/guideContent";
import {
  defaultGuideSectionId,
  getGuideNavItems,
  guideSectionIds,
  resolveGuideSection,
} from "./guideNavigation";

describe("guideNavigation", () => {
  it("derives stable section ids from guide content", () => {
    expect(guideSectionIds).toEqual(guideSections.map((section) => section.id));
    expect(defaultGuideSectionId).toBe(guideSections[0].id);
    expect(new Set(guideSectionIds).size).toBe(guideSectionIds.length);
    expect(Object.isFrozen(guideSections)).toBe(true);
  });

  it("maps guide sections into learning navigation items", () => {
    expect(getGuideNavItems()[0]).toMatchObject({
      id: guideSections[0]!.id,
      label: guideSections[0]!.label,
      description: guideSections[0]!.description,
      icon: guideSections[0]!.icon,
    });
  });

  it("resolves unknown guide sections to the default section", () => {
    expect(resolveGuideSection("not-a-section")).toBe(guideSections[0]);
  });

  it("resolves against the content collection supplied by the caller", () => {
    const customSections = [
      { ...guideSections[1], id: "custom-first" },
      { ...guideSections[0], id: "custom-second" },
    ] as const;

    expect(resolveGuideSection("custom-second", customSections)).toBe(
      customSections[1],
    );
    expect(resolveGuideSection("unknown", customSections)).toBe(
      customSections[0],
    );
  });

  it("describes the metric definitions implemented by FIT", () => {
    const alpha = resolveGuideSection("alpha");
    const maxDrawdown = resolveGuideSection("max-drawdown");
    const sortino = resolveGuideSection("sortino-ratio");
    const valueAtRisk = resolveGuideSection("value-at-risk");
    const efficientFrontier = resolveGuideSection("efficient-frontier");

    expect(alpha.interpretation).toMatch(/0\.02.*2 percentage points/i);
    expect(maxDrawdown.formula).toMatch(/minimum drawdown/i);
    expect(maxDrawdown.interpretation).toMatch(/-0\.25.*-25%/i);
    expect(sortino.formula).toMatch(/risk-free rate/i);
    expect(valueAtRisk.formula).toMatch(/percentile/i);
    expect(valueAtRisk.formula).not.toMatch(/z-score/i);
    expect(valueAtRisk.interpretation).toMatch(/daily return/i);
    expect(efficientFrontier.description).toMatch(/random.*portfolio/i);
    expect(efficientFrontier.description).toMatch(/not.*filtered frontier/i);
  });
});
