import { METRIC_REGISTRY } from "../data/metricRegistry";
import type {
  PortfolioAnalysisInputs,
  PortfolioAnalysisSettings,
  PortfolioMetricCard,
  PortfolioMetricType,
  PortfolioObserverLayout,
  PortfolioObserverWindow,
  PortfolioView,
  PortfolioWorkspaceState,
} from "../types";

const MAX_CARDS = 6;
const DEFAULT_METRICS: PortfolioMetricType[] = [
  "CumulativeReturnComparison",
  "MaxDrawdownAnalysis",
  "VolatilityAnalysis",
  "SharpeRatioMatrix",
  "MarketCorrelationAnalysis",
  "EfficientFrontierVisualization",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const oneYearBefore = (today: string) => {
  const date = new Date(`${today}T12:00:00`);
  date.setFullYear(date.getFullYear() - 1);
  return localDate(date);
};

const normaliseSymbols = (value: unknown): string[] => {
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

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const validMetric = (
  value: unknown,
  fallback: PortfolioMetricType,
): PortfolioMetricType =>
  typeof value === "string" && value in METRIC_REGISTRY
    ? (value as PortfolioMetricType)
    : fallback;

const createCard = (
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

export const getEffectiveCardSettings = (
  card: PortfolioMetricCard,
  globalInputs: PortfolioAnalysisInputs,
): PortfolioAnalysisSettings => ({
  metricType: card.metricType,
  ...globalInputs,
  ...card.overrides,
});

const withCardsAndLayout = (
  state: PortfolioWorkspaceState,
  cards: PortfolioMetricCard[],
): PortfolioWorkspaceState => {
  const generated = createObserverLayout(cards);
  const observerLayout = cards.reduce<PortfolioObserverLayout>(
    (layout, card) => ({
      ...layout,
      [card.id]: state.observerLayout[card.id] ?? generated[card.id],
    }),
    {},
  );
  return { ...state, cards, observerLayout };
};

export type PortfolioWorkspaceAction =
  | { type: "setSymbols"; symbols: string[] }
  | {
      type: "updateGlobalInputs";
      patch: Partial<PortfolioAnalysisInputs>;
    }
  | {
      type: "setCardMetric";
      cardId: string;
      metricType: PortfolioMetricType;
    }
  | {
      type: "overrideCardInputs";
      cardId: string;
      patch: Partial<PortfolioAnalysisInputs>;
    }
  | { type: "resetCardInputs"; cardId: string }
  | { type: "setView"; view: PortfolioView }
  | { type: "promoteCard"; cardId: string }
  | { type: "duplicateCard"; cardId: string }
  | { type: "deleteCard"; cardId: string }
  | {
      type: "setObserverWindowVisibility";
      cardId: string;
      visible: boolean;
    }
  | {
      type: "updateObserverWindow";
      cardId: string;
      patch: Partial<PortfolioObserverWindow>;
    }
  | { type: "arrangeObserver"; width: number; height: number };

export const portfolioWorkspaceReducer = (
  state: PortfolioWorkspaceState,
  action: PortfolioWorkspaceAction,
): PortfolioWorkspaceState => {
  switch (action.type) {
    case "setSymbols":
      return { ...state, symbols: normaliseSymbols(action.symbols) };
    case "updateGlobalInputs":
      return {
        ...state,
        globalInputs: { ...state.globalInputs, ...action.patch },
      };
    case "setCardMetric":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.cardId
            ? { ...card, metricType: action.metricType }
            : card,
        ),
      };
    case "overrideCardInputs":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.cardId
            ? {
                ...card,
                overrides: { ...card.overrides, ...action.patch },
              }
            : card,
        ),
      };
    case "resetCardInputs":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.cardId ? { ...card, overrides: {} } : card,
        ),
      };
    case "setView":
      return { ...state, view: action.view };
    case "promoteCard": {
      const index = state.cards.findIndex((card) => card.id === action.cardId);
      if (index <= 0) return state;
      return {
        ...state,
        cards: [
          state.cards[index],
          ...state.cards.slice(0, index),
          ...state.cards.slice(index + 1),
        ],
      };
    }
    case "duplicateCard": {
      if (state.cards.length >= MAX_CARDS) return state;
      const source = state.cards.find((card) => card.id === action.cardId);
      if (!source) return state;
      const suffix = `${Date.now()}-${state.cards.length}`;
      const duplicate: PortfolioMetricCard = {
        ...source,
        id: `portfolio-card-${suffix}`,
        overrides: { ...source.overrides },
        hiddenSymbols: [...source.hiddenSymbols],
      };
      return withCardsAndLayout(state, [...state.cards, duplicate]);
    }
    case "deleteCard": {
      if (state.cards.length <= 1) return state;
      const cards = state.cards.filter((card) => card.id !== action.cardId);
      const next = withCardsAndLayout(state, cards);
      return state.view.mode === "focus" &&
        state.view.cardId === action.cardId
        ? { ...next, view: { mode: "board" } }
        : next;
    }
    case "setObserverWindowVisibility": {
      const current = state.observerLayout[action.cardId];
      if (!current) return state;
      return {
        ...state,
        observerLayout: {
          ...state.observerLayout,
          [action.cardId]: { ...current, visible: action.visible },
        },
      };
    }
    case "updateObserverWindow": {
      const current = state.observerLayout[action.cardId];
      if (!current) return state;
      return {
        ...state,
        observerLayout: {
          ...state.observerLayout,
          [action.cardId]: {
            ...current,
            ...action.patch,
            cardId: action.cardId,
          },
        },
      };
    }
    case "arrangeObserver": {
      const arranged = createObserverLayout(
        state.cards,
        action.width,
        action.height,
      );
      const observerLayout = state.cards.reduce<PortfolioObserverLayout>(
        (layout, card) => ({
          ...layout,
          [card.id]: {
            ...arranged[card.id],
            visible: state.observerLayout[card.id]?.visible ?? true,
          },
        }),
        {},
      );
      return { ...state, observerLayout };
    }
    default:
      return state;
  }
};

const migrateV3 = (
  value: Record<string, unknown>,
  fallback: PortfolioWorkspaceState,
): PortfolioWorkspaceState | null => {
  if (value.version !== 3 || !Array.isArray(value.cards)) return null;
  const cards = value.cards
    .slice(0, MAX_CARDS)
    .map((candidate, index) => {
      if (!isRecord(candidate)) return null;
      const metricType = validMetric(
        candidate.metricType,
        DEFAULT_METRICS[index] ?? DEFAULT_METRICS[0],
      );
      const rawOverrides = isRecord(candidate.overrides)
        ? candidate.overrides
        : {};
      const overrides: Partial<PortfolioAnalysisInputs> = {};
      if (typeof rawOverrides.startDate === "string")
        overrides.startDate = rawOverrides.startDate;
      if (typeof rawOverrides.endDate === "string")
        overrides.endDate = rawOverrides.endDate;
      if (typeof rawOverrides.benchmark === "string")
        overrides.benchmark = rawOverrides.benchmark.toUpperCase();
      if (
        typeof rawOverrides.riskFreeRate === "number" &&
        Number.isFinite(rawOverrides.riskFreeRate)
      )
        overrides.riskFreeRate = rawOverrides.riskFreeRate;
      if (
        typeof rawOverrides.confidenceLevel === "number" &&
        Number.isFinite(rawOverrides.confidenceLevel)
      )
        overrides.confidenceLevel = rawOverrides.confidenceLevel;
      return {
        id:
          typeof candidate.id === "string" && candidate.id
            ? candidate.id
            : `portfolio-card-${index + 1}`,
        metricType,
        overrides,
        hiddenSymbols: normaliseSymbols(candidate.hiddenSymbols),
      };
    })
    .filter((card): card is PortfolioMetricCard => card !== null);
  if (!cards.length) return null;

  const rawInputs = isRecord(value.globalInputs) ? value.globalInputs : {};
  const globalInputs: PortfolioAnalysisInputs = {
    startDate:
      typeof rawInputs.startDate === "string"
        ? rawInputs.startDate
        : fallback.globalInputs.startDate,
    endDate:
      typeof rawInputs.endDate === "string"
        ? rawInputs.endDate
        : fallback.globalInputs.endDate,
    benchmark:
      typeof rawInputs.benchmark === "string"
        ? rawInputs.benchmark.toUpperCase()
        : fallback.globalInputs.benchmark,
    riskFreeRate: finiteNumber(
      rawInputs.riskFreeRate,
      fallback.globalInputs.riskFreeRate,
    ),
    confidenceLevel: finiteNumber(
      rawInputs.confidenceLevel,
      fallback.globalInputs.confidenceLevel,
    ),
  };
  const generated = createObserverLayout(cards);
  const restoredLayout = isRecord(value.observerLayout)
    ? Object.values(value.observerLayout).reduce<PortfolioObserverLayout>(
        (layout, candidate) => {
          if (!isRecord(candidate) || typeof candidate.cardId !== "string")
            return layout;
          const card = cards.find((item) => item.id === candidate.cardId);
          if (!card) return layout;
          const fallbackWindow = generated[card.id];
          return {
            ...layout,
            [card.id]: {
              cardId: card.id,
              x: finiteNumber(candidate.x, fallbackWindow.x),
              y: finiteNumber(candidate.y, fallbackWindow.y),
              width: Math.max(
                300,
                finiteNumber(candidate.width, fallbackWindow.width),
              ),
              height: Math.max(
                220,
                finiteNumber(candidate.height, fallbackWindow.height),
              ),
              z: finiteNumber(candidate.z, fallbackWindow.z),
              visible:
                typeof candidate.visible === "boolean"
                  ? candidate.visible
                  : true,
            },
          };
        },
        {},
      )
    : {};
  const observerLayout = cards.reduce<PortfolioObserverLayout>(
    (layout, card) => ({
      ...layout,
      [card.id]: restoredLayout[card.id] ?? generated[card.id],
    }),
    {},
  );

  return {
    version: 3,
    symbols: normaliseSymbols(value.symbols),
    globalInputs,
    cards,
    view: { mode: "board" },
    observerLayout,
  };
};

export const migrateWorkspaceState = (
  value: unknown,
  today: string,
): PortfolioWorkspaceState => {
  const fallback = createDefaultWorkspace(today);
  if (!isRecord(value)) return fallback;

  const current = migrateV3(value, fallback);
  if (current) return current;

  if (isRecord(value.settings)) {
    const settings = value.settings;
    const metricType = validMetric(
      settings.metricType,
      fallback.cards[0].metricType,
    );
    const cards = [
      { ...fallback.cards[0], metricType },
      ...fallback.cards.slice(1),
    ];
    return {
      ...fallback,
      symbols: normaliseSymbols(value.symbols),
      globalInputs: {
        startDate:
          typeof settings.startDate === "string"
            ? settings.startDate
            : fallback.globalInputs.startDate,
        endDate:
          typeof settings.endDate === "string"
            ? settings.endDate
            : fallback.globalInputs.endDate,
        benchmark:
          typeof settings.benchmark === "string"
            ? settings.benchmark.toUpperCase()
            : fallback.globalInputs.benchmark,
        riskFreeRate: finiteNumber(
          settings.riskFreeRate,
          fallback.globalInputs.riskFreeRate,
        ),
        confidenceLevel: finiteNumber(
          settings.confidenceLevel,
          fallback.globalInputs.confidenceLevel,
        ),
      },
      cards,
      observerLayout: createObserverLayout(cards),
    };
  }

  const rawSettings = Array.isArray(value.cardSettings)
    ? value.cardSettings
    : [];
  const active = Array.isArray(value.activeCards) ? value.activeCards : [];
  if (rawSettings.length) {
    const migratedCards = rawSettings
      .slice(0, MAX_CARDS)
      .map((candidate, index) => {
        if (!isRecord(candidate) || active[index] === false) return null;
        const card = createCard(
          validMetric(
            candidate.metricType,
            DEFAULT_METRICS[index] ?? DEFAULT_METRICS[0],
          ),
          index,
        );
        const overrides: Partial<PortfolioAnalysisInputs> = {};
        if (typeof candidate.marketTicker === "string")
          overrides.benchmark = candidate.marketTicker.toUpperCase();
        if (
          typeof candidate.riskRate === "number" &&
          Number.isFinite(candidate.riskRate)
        )
          overrides.riskFreeRate = candidate.riskRate;
        if (
          typeof candidate.confidenceLevel === "number" &&
          Number.isFinite(candidate.confidenceLevel)
        )
          overrides.confidenceLevel = candidate.confidenceLevel;
        if (isRecord(candidate.dateRange)) {
          if (typeof candidate.dateRange.start === "string")
            overrides.startDate = candidate.dateRange.start;
          if (typeof candidate.dateRange.end === "string")
            overrides.endDate = candidate.dateRange.end;
        }
        return { ...card, overrides };
      })
      .filter((card): card is PortfolioMetricCard => card !== null);
    const cards = migratedCards.length ? migratedCards : fallback.cards;
    return {
      ...fallback,
      symbols: normaliseSymbols(
        value.selectedStocks ?? value.searchTags ?? value.symbols,
      ),
      globalInputs: {
        ...fallback.globalInputs,
        startDate:
          typeof value.globalStart === "string"
            ? value.globalStart
            : fallback.globalInputs.startDate,
        endDate:
          typeof value.globalEnd === "string"
            ? value.globalEnd
            : fallback.globalInputs.endDate,
      },
      cards,
      observerLayout: createObserverLayout(cards),
    };
  }

  return fallback;
};
