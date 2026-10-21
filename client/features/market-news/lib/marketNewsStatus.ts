export function formatMarketNewsShownStatus({
  displayedCount,
  pageStart,
  topicFeedMode,
}: {
  displayedCount: number;
  pageStart: number;
  topicFeedMode: boolean;
}) {
  if (!displayedCount) return "0 shown";

  if (topicFeedMode) {
    return `${pageStart + 1}-${pageStart + displayedCount} shown`;
  }

  return `${displayedCount} shown`;
}
