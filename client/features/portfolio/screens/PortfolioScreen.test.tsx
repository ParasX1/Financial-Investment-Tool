import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useAuth } from "@/features/auth";
import { PortfolioMetricCard } from "../components/PortfolioMetricCard";
import { PortfolioObservation } from "../components/PortfolioObservation";
import { usePortfolioWorkspaceController } from "../hooks/usePortfolioWorkspaceController";
import { PortfolioScreen } from "./PortfolioScreen";

jest.mock("@/features/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../hooks/usePortfolioWorkspaceController", () => ({
  usePortfolioWorkspaceController: jest.fn(),
}));

jest.mock("../components/PortfolioMetricCard", () => ({
  PortfolioMetricCard: function MockPortfolioMetricCard() {
    return null;
  },
}));

jest.mock("../components/PortfolioObservation", () => ({
  PortfolioObservation: function MockPortfolioObservation() {
    return null;
  },
}));

type TestElement = ReactElement<{
  "aria-current"?: boolean;
  "aria-pressed"?: boolean;
  card?: { id: string };
  children?: ReactNode;
  onClick?: () => void;
  variant?: string;
}>;

const collectElements = (node: ReactNode): TestElement[] => {
  if (!isValidElement(node)) return [];
  const element = node as TestElement;
  return [
    element,
    ...Children.toArray(element.props.children).flatMap(collectElements),
  ];
};

const collectText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!isValidElement(node)) return "";
  return Children.toArray((node as TestElement).props.children)
    .map(collectText)
    .join("");
};

const cards = [
  { id: "alpha", metricType: "AlphaComparison", overrides: {}, hiddenSymbols: [] },
  {
    id: "sharpe",
    metricType: "SharpeRatioMatrix",
    overrides: { riskFreeRate: 0.05 },
    hiddenSymbols: [],
  },
  { id: "drawdown", metricType: "MaxDrawdownAnalysis", overrides: {}, hiddenSymbols: [] },
  { id: "beta", metricType: "BetaAnalysis", overrides: {}, hiddenSymbols: [] },
];

const globalInputs = {
  startDate: "2025-07-31",
  endDate: "2026-07-31",
  benchmark: "^AXJO",
  riskFreeRate: 0.0435,
  confidenceLevel: 0.05,
};

const actions = {
  showBoard: jest.fn(),
  showFocus: jest.fn(),
  showObservation: jest.fn(),
  applyDraft: jest.fn(),
  focusCard: jest.fn(),
  arrangeObserver: jest.fn(),
  updateObserverWindow: jest.fn(),
  setObserverWindowVisibility: jest.fn(),
  updateCardMetric: jest.fn(),
  overrideCard: jest.fn(),
  resetCardInputs: jest.fn(),
  promoteCard: jest.fn(),
  duplicateCard: jest.fn(),
  deleteCard: jest.fn(),
};

const mockController = (
  mode: "board" | "focus" | "observation",
  overrides: Record<string, unknown> = {},
) => {
  const workspace = {
    cards,
    symbols: ["AAPL", "MSFT"],
    globalInputs,
    observerLayout: {
      alpha: { x: 0, y: 0, width: 400, height: 300, z: 10, visible: true },
    },
    view: { mode, focusedCardId: "sharpe" },
  };
  const value = {
    workspace,
    draftSymbols: workspace.symbols,
    setDraftSymbols: jest.fn(),
    draftInputs: globalInputs,
    setDraftInputs: jest.fn(),
    today: "2026-07-31",
    announcement: "Analysis ready",
    symbolOptions: ["AAPL", "MSFT", "NVDA"],
    pending: false,
    rangeError: null,
    focusedCard: mode === "focus" ? cards[1] : null,
    getCardProps: jest.fn((cardId: string) => ({
      symbols: workspace.symbols,
      globalInputs,
      today: "2026-07-31",
      cardCount: cards.length,
      onMetricChange: jest.fn(),
      onOverride: jest.fn(),
      onResetInputs: jest.fn(),
      onFocus: () => actions.focusCard(cardId),
      onPromote: jest.fn(),
      onDuplicate: jest.fn(),
      onDelete: jest.fn(),
    })),
    actions,
    ...overrides,
  };
  (usePortfolioWorkspaceController as jest.Mock).mockReturnValue(value);
  return value;
};

describe("PortfolioScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: "researcher-1" },
      loading: false,
    });
  });

  it("renders the full board hierarchy and switches workspace modes", () => {
    const controller = mockController("board");
    const tree = PortfolioScreen();
    const elements = collectElements(tree);
    const metricCards = elements.filter(
      (element) => element.type === PortfolioMetricCard,
    );

    expect(usePortfolioWorkspaceController).toHaveBeenCalledWith({
      userId: "researcher-1",
      authLoading: false,
    });
    expect(metricCards.map((element) => element.props.variant)).toEqual([
      "hero",
      "standard",
      "standard",
      "compact",
    ]);
    expect(controller.getCardProps).toHaveBeenCalledTimes(4);
    expect(collectText(tree)).toContain("AAPL · MSFT");
    expect(collectText(tree)).toContain("4 / 6 active");

    elements
      .find((element) => collectText(element) === "Focus")
      ?.props.onClick?.();
    elements
      .find((element) => collectText(element) === "Observation")
      ?.props.onClick?.();
    expect(actions.showFocus).toHaveBeenCalledTimes(1);
    expect(actions.showObservation).toHaveBeenCalledTimes(1);
  });

  it("keeps Focus context linked to the selected card and filmstrip", () => {
    mockController("focus");
    const tree = PortfolioScreen();
    const elements = collectElements(tree);
    const focusCard = elements.find(
      (element) =>
        element.type === PortfolioMetricCard && element.props.variant === "focus",
    );
    const filmstripButtons = elements.filter(
      (element) =>
        typeof element.props["aria-current"] === "boolean",
    );

    expect(focusCard?.props.card?.id).toBe("sharpe");
    expect(filmstripButtons).toHaveLength(4);
    expect(filmstripButtons.map((button) => button.props["aria-current"])).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(collectText(tree)).toContain("Custom");
    expect(collectText(tree)).toContain("Linked");

    filmstripButtons[2].props.onClick?.();
    elements
      .find((element) => collectText(element) === "← Back to Board")
      ?.props.onClick?.();
    expect(actions.focusCard).toHaveBeenCalledWith("drawdown");
    expect(actions.showBoard).toHaveBeenCalledTimes(1);
  });

  it("mounts Observation mode with every window action wired through", () => {
    mockController("observation");
    const tree = PortfolioScreen();
    const elements = collectElements(tree);
    const observation = elements.find(
      (element) => element.type === PortfolioObservation,
    );

    expect(observation).toBeDefined();
    expect(observation?.props).toMatchObject({
      cards,
      symbols: ["AAPL", "MSFT"],
      globalInputs,
      today: "2026-07-31",
      onDone: actions.showBoard,
      onArrange: actions.arrangeObserver,
      onWindowChange: actions.updateObserverWindow,
      onWindowVisibility: actions.setObserverWindowVisibility,
      onMetricChange: actions.updateCardMetric,
      onOverride: actions.overrideCard,
      onResetInputs: actions.resetCardInputs,
      onFocus: actions.focusCard,
      onPromote: actions.promoteCard,
      onDuplicate: actions.duplicateCard,
      onDelete: actions.deleteCard,
    });
    expect(collectText(tree)).toContain("Analysis ready");
  });

  it("shows a safe empty-universe summary and omits a missing focus card", () => {
    mockController("focus", {
      workspace: {
        cards,
        symbols: [],
        globalInputs,
        observerLayout: {},
        view: { mode: "focus", focusedCardId: null },
      },
      draftSymbols: [],
      focusedCard: null,
    });
    const tree = PortfolioScreen();

    expect(collectText(tree)).toContain("Waiting for symbols");
    expect(
      collectElements(tree).some(
        (element) =>
          element.type === PortfolioMetricCard && element.props.variant === "focus",
      ),
    ).toBe(false);
  });
});
