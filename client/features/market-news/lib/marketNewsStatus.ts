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

export function formatMarketNewsSourceStatus({
  hasVisibleArticles,
  loading,
  providerLabel,
}: {
  hasVisibleArticles: boolean;
  loading: boolean;
  providerLabel?: string | null;
}) {
  if (loading && hasVisibleArticles) return "Updating";

  return providerLabel ?? "Pending";
}

export function formatMarketNewsMatchStatus(strictCategory?: boolean | null) {
  return strictCategory === false ? "Broad headlines" : "Topic matched";
}
