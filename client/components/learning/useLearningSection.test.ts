import { resolveLearningSection } from "./useLearningSection";

describe("resolveLearningSection", () => {
  const sections = ["overview", "community", "security"];

  it("uses a valid section query when present", () => {
    expect(resolveLearningSection("community", sections, "overview")).toEqual({
      activeId: "community",
      shouldClearQuery: false,
    });
  });

  it("falls back to the default section when the query is missing", () => {
    expect(resolveLearningSection(null, sections, "overview")).toEqual({
      activeId: "overview",
      shouldClearQuery: false,
    });
  });

  it("falls back and marks invalid section queries for cleanup", () => {
    expect(resolveLearningSection("unknown", sections, "overview")).toEqual({
      activeId: "overview",
      shouldClearQuery: true,
    });
  });
});
