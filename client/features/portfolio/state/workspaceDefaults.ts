import type {
  PortfolioMetricCard,
  PortfolioMetricType,
  PortfolioObserverLayout,
  PortfolioWorkspaceState,
} from "../types";

export const MAX_CARDS = 6;
export const DEFAULT_METRICS: readonly PortfolioMetricType[] = [
  "CumulativeReturnComparison",
  "MaxDrawdownAnalysis",
  "VolatilityAnalysis",
  "SharpeRatioMatrix",
  "MarketCorrelationAnalysis",
  "EfficientFrontierVisualization",
];

export const toLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const oneYearBefore = (today: string) => {
  const date = new Date(`${today}T12:00:00`);
  date.setFullYear(date.getFullYear() - 1);
  return toLocalDate(date);
};

export const normaliseSymbols = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map(String)
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => /^[A-Z0-9.^=-]{1,15}$/.test(symbol)),
    ),
  ).slice(0, 5);
};

export const createCard = (
  metricType: PortfolioMetricType,
  index: number,
): PortfolioMetricCard => ({
  id: `portfolio-card-${index + 1}`,
  metricType,
  overrides: {},
  hiddenSymbols: [],
});

export const createObserverLayout = (
  cards: PortfolioMetricCard[],
  viewportWidth = 1440,
  viewportHeight = 844,
): PortfolioObserverLayout => {
  const padding = 16;
  const gap = 12;
  const availableWidth = Math.max(900, viewportWidth) - padding * 2;
  const availableHeight = Math.max(660, viewportHeight) - padding * 2;
  const thirdWidth = (availableWidth - gap * 2) / 3;
  const halfHeight = (availableHeight - gap) / 2;
  const positions = [
    {
      x: padding,
      y: padding,
      width: thirdWidth * 2 + gap,
      height: halfHeight,
    },
    {
      x: padding + (thirdWidth + gap) * 2,
      y: padding,
      width: thirdWidth,
      height: (halfHeight - gap) / 2,
    },
    {
      x: padding + (thirdWidth + gap) * 2,
      y: padding + (halfHeight + gap) / 2,
      width: thirdWidth,
      height: (halfHeight - gap) / 2,
    },
    {
      x: padding,
      y: padding + halfHeight + gap,
      width: thirdWidth,
      height: halfHeight,
    },
    {
      x: padding + thirdWidth + gap,
      y: padding + halfHeight + gap,
      width: thirdWidth,
      height: halfHeight,
    },
    {
      x: padding + (thirdWidth + gap) * 2,
      y: padding + halfHeight + gap,
      width: thirdWidth,
      height: halfHeight,
    },
  ];

  return cards.reduce<PortfolioObserverLayout>((layout, card, index) => {
    const position = positions[index] ?? positions[positions.length - 1];
    return {
      ...layout,
      [card.id]: {
        cardId: card.id,
        x: Math.round(position.x),
        y: Math.round(position.y),
        width: Math.max(300, Math.round(position.width)),
        height: Math.max(220, Math.round(position.height)),
        z: 10 + index,
        visible: true,
      },
    };
  }, {});
};

export const createDefaultWorkspace = (
  today: string,
  symbols: string[] = [],
): PortfolioWorkspaceState => {
  const cards = DEFAULT_METRICS.map(createCard);
  return {
    version: 3,
    symbols: normaliseSymbols(symbols),
    globalInputs: {
      startDate: oneYearBefore(today),
      endDate: today,
      benchmark: "SPY",
      riskFreeRate: 0.01,
      confidenceLevel: 0.05,
    },
    cards,
    view: { mode: "board" },
    observerLayout: createObserverLayout(cards),
  };
};
