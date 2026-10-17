function normalizedSymbols(symbols: readonly string[]) {
  const result: string[] = [];

  for (const value of symbols) {
    const symbol = value.trim().toUpperCase();
    if (!symbol || result.includes(symbol)) continue;
    result.push(symbol);
  }

  return result;
}

export function toggleWatchlistComparisonSymbol(
  current: readonly string[],
  value: string,
  limit: number,
): string[] {
  const symbols = normalizedSymbols(current);
  const symbol = value.trim().toUpperCase();
  if (!symbol) return symbols;

  if (symbols.includes(symbol)) {
    return symbols.filter((candidate) => candidate !== symbol);
  }

  if (symbols.length >= limit) return symbols;
  return [...symbols, symbol];
}

export function reconcileWatchlistComparisonSymbols(
  current: readonly string[],
  available: readonly string[],
  limit = Number.POSITIVE_INFINITY,
): string[] {
  const availableSymbols = normalizedSymbols(available);
  if (!availableSymbols.length) return [];

  const availableSet = new Set(availableSymbols);
  const retained = normalizedSymbols(current)
    .filter((symbol) => availableSet.has(symbol))
    .slice(0, limit);

  return retained.length ? retained : [availableSymbols[0]!];
}
