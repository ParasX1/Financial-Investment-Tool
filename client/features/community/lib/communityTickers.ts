// File purpose: Normalizes and validates Community ticker collections consistently across draft, UI, and storage layers.

export const MAX_COMMUNITY_TICKERS = 4;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.\-^=]{0,23}$/;

export function normalizeCommunitySymbol(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^\$/, "").toUpperCase();
  return SYMBOL_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeCommunityTickers(
  values: unknown,
  limit = MAX_COMMUNITY_TICKERS,
) {
  const rawValues = Array.isArray(values) ? values : [];
  const unique = new Set<string>();

  for (const value of rawValues) {
    const normalized = normalizeCommunitySymbol(value);
    if (!normalized) continue;
    unique.add(normalized);
    if (unique.size >= limit) break;
  }

  return Array.from(unique);
}

export function parseCommunityTickerInput(value: string) {
  return normalizeCommunityTickers(value.split(/[\s,]+/).filter(Boolean));
}

export function validateCommunityTickers(values: unknown): string | null {
  if (!Array.isArray(values))
    return "Enter valid tickers, such as CBA.AX or NVDA.";
  const normalizedValues = values.map(normalizeCommunitySymbol);
  if (normalizedValues.some((value) => !value)) {
    return "Enter valid tickers, such as CBA.AX or NVDA.";
  }
  if (new Set(normalizedValues).size > MAX_COMMUNITY_TICKERS) {
    return "Add up to 4 tickers.";
  }
  return null;
}

export function mergeCommunityTickerSymbols(
  values: unknown,
  legacySymbol?: unknown,
  limit = MAX_COMMUNITY_TICKERS,
) {
  const merged = normalizeCommunityTickers(values, limit);
  const normalizedLegacySymbol = normalizeCommunitySymbol(legacySymbol);

  if (!normalizedLegacySymbol || merged.includes(normalizedLegacySymbol)) {
    return merged;
  }

  return normalizeCommunityTickers([normalizedLegacySymbol, ...merged], limit);
}

export function getPrimaryCommunityTicker(
  values: unknown,
  legacySymbol?: unknown,
) {
  return mergeCommunityTickerSymbols(values, legacySymbol, 1)[0] ?? null;
}
