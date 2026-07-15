export function getVisibleSearchResults<T>(
  resultQuery: string,
  currentQuery: string,
  results: readonly T[],
): readonly T[] {
  return resultQuery === currentQuery ? results : [];
}

export function getSelectedSearchSymbol(
  results: readonly { symbol: string }[],
  activeIndex: number,
): string | null {
  if (activeIndex < 0 || activeIndex >= results.length) return null;
  return results[activeIndex]?.symbol ?? null;
}
