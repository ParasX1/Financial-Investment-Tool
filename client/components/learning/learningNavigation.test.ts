import {
  getLearningNavItems,
  getLearningSectionIds,
  resolveLearningItem,
} from "./learningNavigation";

describe("learningNavigation", () => {
  const sections = [
    {
      id: "one",
      label: "One",
      description: "First section",
      icon: (() => null) as never,
    },
    {
      id: "two",
      label: "Two",
      description: "Second section",
      icon: (() => null) as never,
    },
  ];

  it("derives section ids from ordered content", () => {
    expect(getLearningSectionIds(sections)).toEqual(["one", "two"]);
  });

  it("maps content into learning nav items with caller-owned descriptions", () => {
    expect(getLearningNavItems(sections, (section) => section.description)).toEqual(
      sections.map((section) => ({
        id: section.id,
        label: section.label,
        description: section.description,
        icon: section.icon,
      })),
    );
  });

  it("falls back to the first item for unknown active ids", () => {
    expect(resolveLearningItem(sections, "missing")).toBe(sections[0]);
  });

  it("returns undefined when there is no safe fallback section", () => {
    expect(resolveLearningItem([], "missing")).toBeUndefined();
  });
});
