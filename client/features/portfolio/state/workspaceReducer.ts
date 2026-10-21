import type {
  PortfolioAnalysisInputs,
  PortfolioMetricCard,
  PortfolioMetricType,
  PortfolioObserverLayout,
  PortfolioObserverWindow,
  PortfolioView,
  PortfolioWorkspaceState,
} from "../types";
import {
  createObserverLayout,
  MAX_CARDS,
  normaliseSymbols,
} from "./workspaceDefaults";

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
  | { type: "syncCardDateOverridesToGlobal" }
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
    case "syncCardDateOverridesToGlobal":
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (
            card.overrides.startDate === undefined &&
            card.overrides.endDate === undefined
          ) {
            return card;
          }
          const { startDate, endDate, ...overrides } = card.overrides;
          return { ...card, overrides };
        }),
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
      const next = withCardsAndLayout(state, [...state.cards, duplicate]);
      return {
        ...next,
        observerLayout: {
          ...next.observerLayout,
          [duplicate.id]: {
            ...next.observerLayout[duplicate.id],
            visible: true,
          },
        },
      };
    }
    case "deleteCard": {
      if (
        state.cards.length <= 1 ||
        !state.cards.some((card) => card.id === action.cardId)
      ) {
        return state;
      }
      const cards = state.cards.filter((card) => card.id !== action.cardId);
      const next = withCardsAndLayout(state, cards);
      return state.view.mode === "focus" && state.view.cardId === action.cardId
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
            visible:
              state.observerLayout[card.id]?.visible ??
              arranged[card.id]?.visible ??
              true,
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
