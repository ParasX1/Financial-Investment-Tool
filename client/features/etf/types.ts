export const ETF_WINDOWS = ["1D", "1W", "1M", "1Y"] as const;

export type EtfWindow = (typeof ETF_WINDOWS)[number];

export type EtfRow = {
  rank: number;
  symbol: string;
  name: string;
  category: string;
  issuer: string;
  expenseRatio: number;
  aumUsd: number;
  priceReturn: number;
  volatility: number | null;
  sharpe: number | null;
  maxDrawdown: number | null;
};

export type EtfResponse = {
  rows: EtfRow[];
  total: number;
  metadata: {
    generatedAt?: string;
    source?: string;
    universeCount?: number;
    windowCode?: EtfWindow;
    sortKey?: "priceReturn" | "sharpe";
  };
  warnings: string[];
};
