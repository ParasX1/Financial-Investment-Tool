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
    expect(defaultGuideSectionId).toBe(guideSections[0]!.id);
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
});
