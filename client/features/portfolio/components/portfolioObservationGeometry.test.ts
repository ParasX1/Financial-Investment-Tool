import {
  constrainObservationDrag,
  constrainObservationResize,
  constrainObservationWindow,
} from "./portfolioObservationGeometry";

const canvasSize = { width: 800, height: 600 };
const origin = { x: 40, y: 30, width: 400, height: 300 };

describe("portfolio observation geometry", () => {
  it("keeps a dragged window inside every canvas edge", () => {
    expect(
      constrainObservationDrag(origin, { x: -1_000, y: -1_000 }, canvasSize),
    ).toEqual({ x: 8, y: 8 });
    expect(
      constrainObservationDrag(origin, { x: 1_000, y: 1_000 }, canvasSize),
    ).toEqual({ x: 392, y: 292 });
  });

  it("keeps a resized window above its minimum size", () => {
    expect(
      constrainObservationResize(origin, { x: -1_000, y: -1_000 }, canvasSize),
    ).toEqual({ width: 300, height: 220 });
  });

  it("keeps a resized window inside the canvas right and bottom edges", () => {
    expect(
      constrainObservationResize(origin, { x: 1_000, y: 1_000 }, canvasSize),
    ).toEqual({ width: 752, height: 562 });
  });

  it("returns new geometry without mutating the persisted origin", () => {
    const persistedOrigin = { ...origin };

    const dragged = constrainObservationDrag(
      persistedOrigin,
      { x: 25, y: 35 },
      canvasSize,
    );
    const resized = constrainObservationResize(
      persistedOrigin,
      { x: 25, y: 35 },
      canvasSize,
    );

    expect(persistedOrigin).toEqual(origin);
    expect(dragged).not.toBe(persistedOrigin);
    expect(resized).not.toBe(persistedOrigin);
  });

  it("repositions a complete persisted window inside the current canvas", () => {
    expect(
      constrainObservationWindow(
        { x: 700, y: 500, width: 400, height: 300 },
        canvasSize,
      ),
    ).toEqual({ x: 392, y: 292, width: 400, height: 300 });
  });

  it("shrinks oversized persisted geometry before clamping its position", () => {
    expect(
      constrainObservationWindow(
        { x: 300, y: 250, width: 1_200, height: 900 },
        canvasSize,
      ),
    ).toEqual({ x: 8, y: 8, width: 784, height: 584 });
  });

  it("fits a complete window when the canvas is smaller than desktop minimums", () => {
    expect(
      constrainObservationWindow(
        { x: 40, y: 30, width: 400, height: 300 },
        { width: 280, height: 200 },
      ),
    ).toEqual({ x: 8, y: 8, width: 264, height: 184 });
  });

  it("returns an equal copy when persisted geometry already fits", () => {
    const constrained = constrainObservationWindow(origin, canvasSize);

    expect(constrained).toEqual(origin);
    expect(constrained).not.toBe(origin);
  });
});
