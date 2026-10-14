import { API_BASE } from "@/lib/apiBase";
import type { EtfResponse, EtfRow, EtfWindow } from "../types";
import { ETF_WINDOWS } from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const requiredNumber = (value: unknown) => {
  const number = finiteNumber(value);
  if (number === undefined) throw new Error("Invalid ETF row.");
  return number;
};

const stringOrEmpty = (value: unknown) =>
  typeof value === "string" ? value : "";

const normalizeRow = (value: unknown): EtfRow => {
  if (!isRecord(value)) throw new Error("Invalid ETF row.");
  return {
    rank: requiredNumber(value.rank),
    symbol: stringOrEmpty(value.symbol),
    name: stringOrEmpty(value.name),
    category: stringOrEmpty(value.category),
    issuer: stringOrEmpty(value.issuer),
    expenseRatio: requiredNumber(value.expenseRatio),
    aumUsd: requiredNumber(value.aumUsd),
    priceReturn: requiredNumber(value.priceReturn),
    volatility:
      typeof value.volatility === "number" && Number.isFinite(value.volatility)
        ? value.volatility
        : null,
    sharpe:
      typeof value.sharpe === "number" && Number.isFinite(value.sharpe)
        ? value.sharpe
        : null,
    maxDrawdown:
      typeof value.maxDrawdown === "number" &&
      Number.isFinite(value.maxDrawdown)
        ? value.maxDrawdown
        : null,
  };
};

const normalizeResponse = (value: unknown, window: EtfWindow): EtfResponse => {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    !Array.isArray(value.data.rows)
  ) {
    throw new Error("Unable to load ETF preview.");
  }
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  if (
    !ETF_WINDOWS.includes(metadata.windowCode as EtfWindow) ||
    metadata.windowCode !== window
  ) {
    throw new Error("ETF preview window does not match the request.");
  }
  const rows = value.data.rows.map(normalizeRow);
  return {
    rows,
    total: finiteNumber(value.data.total) ?? rows.length,
    metadata: {
      generatedAt:
        typeof metadata.generatedAt === "string" &&
        Number.isFinite(Date.parse(metadata.generatedAt))
          ? metadata.generatedAt
          : undefined,
      source: typeof metadata.source === "string" ? metadata.source : undefined,
      universeCount: finiteNumber(metadata.universeCount),
      windowCode: window,
      sortKey:
        metadata.sortKey === "priceReturn" || metadata.sortKey === "sharpe"
          ? metadata.sortKey
          : undefined,
    },
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter(
          (warning): warning is string => typeof warning === "string",
        )
      : [],
  };
};

export async function fetchEtfs(
  window: EtfWindow = "1Y",
  signal?: AbortSignal,
): Promise<EtfResponse> {
  const params = new URLSearchParams({ window });
  const response = await fetch(`${API_BASE}/api/etfs?${params}`, { signal });
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Unable to load ETF preview.");
  return normalizeResponse(json, window);
}
