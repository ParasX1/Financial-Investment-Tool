export interface PortfolioPoint {
  readonly risk: number;
  readonly return: number;
  readonly sharpe?: number;
  readonly [key: string]: unknown;
}

export interface FrontierView<Point extends PortfolioPoint> {
  readonly displayPoints: readonly Point[];
  readonly frontier: readonly Point[];
  readonly minimumRisk: Point | null;
  readonly maximumSharpe: Point | null;
  readonly sourcePointCount: number;
}

interface IndexedPoint<Point extends PortfolioPoint> {
  readonly index: number;
  readonly point: Point;
}

const DEFAULT_DOMAIN: readonly [number, number] = [0, 1];
const DEFAULT_PADDING_RATIO = 0.06;
const MINIMUM_CONSTANT_PADDING = 0.01;

function isFinitePoint<Point extends PortfolioPoint>(point: Point): boolean {
  return Number.isFinite(point.risk) && Number.isFinite(point.return);
}

function sampleEvenly<Item>(items: readonly Item[], count: number): Item[] {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return [...items];
  if (count === 1) return [items[0]];

  return Array.from({ length: count }, (_, sampleIndex) => {
    const sourceIndex = Math.round(
      (sampleIndex * (items.length - 1)) / (count - 1),
    );
    return items[sourceIndex];
  });
}

function addUniquePoints<Point extends PortfolioPoint>(
  selected: readonly IndexedPoint<Point>[],
  candidates: readonly IndexedPoint<Point>[],
  limit: number,
): IndexedPoint<Point>[] {
  const selectedIndexes = new Set(selected.map(({ index }) => index));
  const additions = candidates.filter(
    ({ index }) => !selectedIndexes.has(index),
  );
  return [
    ...selected,
    ...additions.slice(0, Math.max(0, limit - selected.length)),
  ];
}

function buildUpperEnvelope<Point extends PortfolioPoint>(
  points: readonly IndexedPoint<Point>[],
): IndexedPoint<Point>[] {
  const pointsByRisk = [...points].sort((left, right) => {
    const riskDifference = left.point.risk - right.point.risk;
    if (riskDifference !== 0) return riskDifference;

    const returnDifference = right.point.return - left.point.return;
    return returnDifference !== 0 ? returnDifference : left.index - right.index;
  });

  let highestReturn = Number.NEGATIVE_INFINITY;
  return pointsByRisk.filter((indexedPoint) => {
    if (indexedPoint.point.return <= highestReturn) return false;

    highestReturn = indexedPoint.point.return;
    return true;
  });
}

/**
 * Creates a finite domain around the observed values without forcing zero into
 * view. Non-finite observations are ignored.
 */
export function getPaddedDomain(
  values: readonly number[],
  paddingRatio = DEFAULT_PADDING_RATIO,
): [number, number] {
  if (!Number.isFinite(paddingRatio) || paddingRatio <= 0) {
    throw new RangeError("paddingRatio must be a positive finite number.");
  }

  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return [...DEFAULT_DOMAIN];

  const minimum = finiteValues.reduce(
    (currentMinimum, value) => Math.min(currentMinimum, value),
    Number.POSITIVE_INFINITY,
  );
  const maximum = finiteValues.reduce(
    (currentMaximum, value) => Math.max(currentMaximum, value),
    Number.NEGATIVE_INFINITY,
  );
  const span = maximum - minimum;
  const padding =
    span > 0 && Number.isFinite(span)
      ? span * paddingRatio
      : Math.max(Math.abs(minimum) * paddingRatio, MINIMUM_CONSTANT_PADDING);

  const lowerBound = Math.max(-Number.MAX_VALUE, minimum - padding);
  const upperBound = Math.min(Number.MAX_VALUE, maximum + padding);

  if (lowerBound < upperBound) return [lowerBound, upperBound];

  const fallbackPadding = Math.max(
    Math.abs(minimum) * Number.EPSILON * 4,
    MINIMUM_CONSTANT_PADDING,
  );
  return [
    Math.max(-Number.MAX_VALUE, minimum - fallbackPadding),
    Math.min(Number.MAX_VALUE, maximum + fallbackPadding),
  ];
}

/**
 * Builds the chart view without mutating the source array. The display cloud is
 * deterministic and bounded while the full upper envelope remains available
 * for the frontier line.
 */
export function buildFrontierView<Point extends PortfolioPoint>(
  points: readonly Point[],
  maxDisplayPoints = 900,
): FrontierView<Point> {
  if (!Number.isFinite(maxDisplayPoints) || maxDisplayPoints < 2) {
    throw new RangeError(
      "maxDisplayPoints must be a finite number of at least 2.",
    );
  }

  const displayLimit = Math.floor(maxDisplayPoints);
  const finitePoints = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => isFinitePoint(point));

  if (finitePoints.length === 0) {
    return {
      displayPoints: [],
      frontier: [],
      minimumRisk: null,
      maximumSharpe: null,
      sourcePointCount: points.length,
    };
  }

  const minimumRisk = finitePoints.reduce((currentMinimum, candidate) =>
    candidate.point.risk < currentMinimum.point.risk
      ? candidate
      : currentMinimum,
  );
  const pointsWithSharpe = finitePoints.filter(({ point }) =>
    Number.isFinite(point.sharpe),
  );
  const maximumSharpe =
    pointsWithSharpe.length === 0
      ? null
      : pointsWithSharpe.reduce((currentMaximum, candidate) =>
          (candidate.point.sharpe as number) >
          (currentMaximum.point.sharpe as number)
            ? candidate
            : currentMaximum,
        );
  const frontier = buildUpperEnvelope(finitePoints);

  const highlighted = addUniquePoints(
    [],
    [minimumRisk, ...(maximumSharpe ? [maximumSharpe] : [])],
    displayLimit,
  );
  const nonFrontierCount = finitePoints.length - frontier.length;
  const reservedCloudSlots = Math.min(
    nonFrontierCount,
    Math.floor(displayLimit * 0.6),
  );
  const frontierBudget = Math.max(
    0,
    displayLimit - highlighted.length - reservedCloudSlots,
  );
  const selectedWithFrontier = addUniquePoints(
    highlighted,
    sampleEvenly(frontier, frontierBudget),
    displayLimit,
  );
  const selectedIndexes = new Set(
    selectedWithFrontier.map((selected) => selected.index),
  );
  const remainingCandidates = finitePoints.filter(
    ({ index }) => !selectedIndexes.has(index),
  );
  const displayPoints = addUniquePoints(
    selectedWithFrontier,
    sampleEvenly(
      remainingCandidates,
      displayLimit - selectedWithFrontier.length,
    ),
    displayLimit,
  )
    .sort((left, right) => left.index - right.index)
    .map(({ point }) => point);

  return {
    displayPoints,
    frontier: frontier.map(({ point }) => point),
    minimumRisk: minimumRisk.point,
    maximumSharpe: maximumSharpe?.point ?? null,
    sourcePointCount: points.length,
  };
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const parsedDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  return (
    parsedDate.getUTCFullYear() === Number(year) &&
    parsedDate.getUTCMonth() === Number(month) - 1 &&
    parsedDate.getUTCDate() === Number(day)
  );
}

/**
 * Validates inclusive UI date inputs for an analysis request.
 */
export function validateAnalysisRange(
  startDate: string,
  endDate: string,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (
    !isValidIsoDate(startDate) ||
    !isValidIsoDate(endDate) ||
    !isValidIsoDate(today)
  ) {
    return "Enter valid dates in YYYY-MM-DD format.";
  }

  if (startDate >= endDate) {
    return "The start date must be before the end date.";
  }

  if (endDate > today) {
    return "The end date cannot be in the future.";
  }

  return null;
}
