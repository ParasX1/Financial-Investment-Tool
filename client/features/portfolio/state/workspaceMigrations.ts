import { METRIC_REGISTRY } from "../data/metricRegistry";
import type {
  PortfolioAnalysisInputs,
  PortfolioMetricCard,
  PortfolioMetricType,
  PortfolioObserverLayout,
  PortfolioWorkspaceState,
} from "../types";
import {
  createCard,
  createDefaultWorkspace,
  createObserverLayout,
  DEFAULT_METRICS,
  MAX_CARDS,
  normaliseSymbols,
} from "./workspaceDefaults";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const validMetric = (
  value: unknown,
  fallback: PortfolioMetricType,
): PortfolioMetricType =>
  typeof value === "string" && value in METRIC_REGISTRY
    ? (value as PortfolioMetricType)
    : fallback;

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
