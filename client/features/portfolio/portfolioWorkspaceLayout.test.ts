import {
  bringPortfolioPanelToFront,
  createDefaultPortfolioPanelLayout,
  normalisePortfolioPanelLayouts,
  patchPortfolioPanelLayout,
} from "./portfolioWorkspaceLayout";

describe("portfolio workspace layout", () => {
  it("creates six visible default panels", () => {
    const layouts = createDefaultPortfolioPanelLayout(1180);

    expect(layouts).toHaveLength(6);
    expect(layouts.every((layout) => layout.visible)).toBe(true);
    expect(new Set(layouts.map((layout) => layout.id)).size).toBe(6);
  });

  it("normalises missing and invalid stored panel geometry", () => {
    const layouts = normalisePortfolioPanelLayouts(
      [
        {
          id: "portfolio-panel-0",
          x: -200,
          y: -10,
          width: 10000,
          height: 20,
          visible: false,
          zIndex: -4,
        },
      ],
      640,
    );

    expect(layouts).toHaveLength(6);
    expect(layouts[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 640,
      height: 260,
      visible: false,
      zIndex: 1,
    });
    expect(layouts[1].visible).toBe(true);
  });

  it("patches one panel without mutating other layouts", () => {
    const layouts = createDefaultPortfolioPanelLayout(1180);
    const next = patchPortfolioPanelLayout(
      layouts,
      "portfolio-panel-2",
      { visible: false, x: 120 },
      1180,
    );

    expect(next).not.toBe(layouts);
    expect(next[2]).toMatchObject({ visible: false, x: 120 });
    expect(next[1]).toEqual(layouts[1]);
  });

  it("brings a panel above the current z-index stack", () => {
    const layouts = createDefaultPortfolioPanelLayout(1180);
    const next = bringPortfolioPanelToFront(layouts, "portfolio-panel-1");

    expect(next[1].zIndex).toBeGreaterThan(
      Math.max(...layouts.map((layout) => layout.zIndex)),
    );
  });
});
