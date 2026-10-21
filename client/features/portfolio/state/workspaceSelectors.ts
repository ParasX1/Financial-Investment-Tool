import type {
  PortfolioAnalysisInputs,
  PortfolioAnalysisSettings,
  PortfolioMetricCard,
  PortfolioWorkspaceState,
} from "../types";

export const getEffectiveCardSettings = (
  card: PortfolioMetricCard,
  globalInputs: PortfolioAnalysisInputs,
): PortfolioAnalysisSettings => ({
  metricType: card.metricType,
  ...globalInputs,
  ...card.overrides,
});

export const selectActiveFocusId = (workspace: PortfolioWorkspaceState) =>
  workspace.view.mode === "focus"
    ? workspace.view.cardId
    : workspace.cards[0]?.id;

export const selectFocusedCard = (workspace: PortfolioWorkspaceState) => {
  const activeFocusId = selectActiveFocusId(workspace);
  return (
    workspace.cards.find((card) => card.id === activeFocusId) ??
    workspace.cards[0]
  );
};

export const isBoardVisibleCardIndex = (index: number) => index !== 2;

export const selectBoardVisibleCards = (cards: PortfolioMetricCard[]) =>
  cards.filter((_, index) => isBoardVisibleCardIndex(index));

export const hasPendingWorkspaceDraft = (
  workspace: PortfolioWorkspaceState,
  draftSymbols: string[],
  draftInputs: PortfolioAnalysisInputs,
) =>
  JSON.stringify(draftSymbols) !== JSON.stringify(workspace.symbols) ||
  JSON.stringify(draftInputs) !== JSON.stringify(workspace.globalInputs);

export const mergePortfolioSymbolOptions = (
  draftSymbols: string[],
  symbolOptions: readonly string[],
) => Array.from(new Set([...draftSymbols, ...symbolOptions]));

export const formatPortfolioDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
};
