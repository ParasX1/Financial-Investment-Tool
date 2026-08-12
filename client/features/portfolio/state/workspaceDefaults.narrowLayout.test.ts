import { createCard, createObserverLayout } from "./workspaceDefaults";

describe("createObserverLayout at narrow desktop widths", () => {
  it("keeps every initial window inside an 800px observation canvas", () => {
    const canvas = { width: 800, height: 620 };
    const cards = Array.from({ length: 6 }, (_, index) =>
      createCard("VolatilityAnalysis", index),
    );

    const layout = createObserverLayout(cards, canvas.width, canvas.height);

    Object.values(layout).forEach((windowState) => {
      expect(windowState.x).toBeGreaterThanOrEqual(0);
      expect(windowState.y).toBeGreaterThanOrEqual(0);
      expect(windowState.width).toBeGreaterThanOrEqual(300);
      expect(windowState.height).toBeGreaterThanOrEqual(220);
      expect(windowState.x + windowState.width).toBeLessThanOrEqual(
        canvas.width,
      );
      expect(windowState.y + windowState.height).toBeLessThanOrEqual(
        canvas.height,
      );
    });
  });
});
