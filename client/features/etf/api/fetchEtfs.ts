import { API_BASE } from "@/lib/apiBase";
import type { EtfResponse, EtfRow, EtfWindow } from "../types";
import { ETF_WINDOWS } from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const numberOrZero = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const stringOrEmpty = (value: unknown) =>
  typeof value === "string" ? value : "";

const normalizeRow = (value: unknown): EtfRow => {
  if (!isRecord(value)) throw new Error("Invalid ETF row.");
  return {
    rank: numberOrZero(value.rank),
    symbol: stringOrEmpty(value.symbol),
    name: stringOrEmpty(value.name),
    category: stringOrEmpty(value.category),
    issuer: stringOrEmpty(value.issuer),
    expenseRatio: numberOrZero(value.expenseRatio),
    aumUsd: numberOrZero(value.aumUsd),
    priceReturn: numberOrZero(value.priceReturn),
    volatility:
      typeof value.volatility === "number" && Number.isFinite(value.volatility)
        ? value.volatility
        : null,
    sharpe:
      typeof value.sharpe === "number" && Number.isFinite(value.sharpe)
        ? value.sharpe
        : null,
    maxDrawdown:
      typeof value.maxDrawdown === "number"
      && Number.isFinite(value.maxDrawdown)
        ? value.maxDrawdown
        : null,
  };
};

const normalizeResponse = (value: unknown): EtfResponse => {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("Unable to load ETF preview.");
  }
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  return {
    rows: Array.isArray(value.data.rows)
      ? value.data.rows.map(normalizeRow)
      : [],
    total: numberOrZero(value.data.total),
    metadata: {
      generatedAt:
        typeof metadata.generatedAt === "string"
          ? metadata.generatedAt
          : undefined,
      source: typeof metadata.source === "string" ? metadata.source : undefined,
      universeCount: numberOrZero(metadata.universeCount),
      windowCode: ETF_WINDOWS.includes(metadata.windowCode as EtfWindow)
        ? (metadata.windowCode as EtfWindow)
        : undefined,
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
  return normalizeResponse(json);
}
