export const OBSERVATION_WINDOW_GUTTER = 8;
export const OBSERVATION_WINDOW_MINIMUM_WIDTH = 300;
export const OBSERVATION_WINDOW_MINIMUM_HEIGHT = 220;

type ObservationWindowGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

type CanvasSize = {
  width: number;
  height: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(minimum, maximum), Math.max(minimum, value));

export const constrainObservationDrag = (
  origin: ObservationWindowGeometry,
  delta: Point,
  canvas: CanvasSize,
) => ({
  x: clamp(
    origin.x + delta.x,
    OBSERVATION_WINDOW_GUTTER,
    canvas.width - origin.width - OBSERVATION_WINDOW_GUTTER,
  ),
  y: clamp(
    origin.y + delta.y,
    OBSERVATION_WINDOW_GUTTER,
    canvas.height - origin.height - OBSERVATION_WINDOW_GUTTER,
  ),
});

export const constrainObservationResize = (
  origin: ObservationWindowGeometry,
  delta: Point,
  canvas: CanvasSize,
) => ({
  width: clamp(
    origin.width + delta.x,
    OBSERVATION_WINDOW_MINIMUM_WIDTH,
    canvas.width - origin.x - OBSERVATION_WINDOW_GUTTER,
  ),
  height: clamp(
    origin.height + delta.y,
    OBSERVATION_WINDOW_MINIMUM_HEIGHT,
    canvas.height - origin.y - OBSERVATION_WINDOW_GUTTER,
  ),
});

export const constrainObservationWindow = (
  origin: ObservationWindowGeometry,
  canvas: CanvasSize,
): ObservationWindowGeometry => {
  const availableWidth = Math.max(
    0,
    canvas.width - OBSERVATION_WINDOW_GUTTER * 2,
  );
  const availableHeight = Math.max(
    0,
    canvas.height - OBSERVATION_WINDOW_GUTTER * 2,
  );
  const width = clamp(
    origin.width,
    Math.min(OBSERVATION_WINDOW_MINIMUM_WIDTH, availableWidth),
    availableWidth,
  );
  const height = clamp(
    origin.height,
    Math.min(OBSERVATION_WINDOW_MINIMUM_HEIGHT, availableHeight),
    availableHeight,
  );

  return {
    x: clamp(
      origin.x,
      OBSERVATION_WINDOW_GUTTER,
      canvas.width - width - OBSERVATION_WINDOW_GUTTER,
    ),
    y: clamp(
      origin.y,
      OBSERVATION_WINDOW_GUTTER,
      canvas.height - height - OBSERVATION_WINDOW_GUTTER,
    ),
    width,
    height,
  };
};
