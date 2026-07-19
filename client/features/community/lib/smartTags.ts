// File purpose: Infers and normalizes suggested discussion tags from post title/body content.
import type { DiscussionDraft } from "../types";

export type SmartTagKind = "type" | "topic" | "ticker";

export type SmartTagSuggestion = {
  label: string;
  kind: SmartTagKind;
  score: number;
  reason: string;
};

export const MAX_DISCUSSION_TAGS = 4;
const MAX_SUGGESTED_TAGS = 5;
const MAX_TAG_LABEL_CHARS = 24;

const FINANCE_ACRONYM_BLOCKLIST = new Set([
  "AI",
  "APR",
  "ATH",
  "ATM",
  "BPS",
  "CEO",
  "CFO",
  "CPI",
  "DCF",
  "EPS",
  "ETF",
  "EV",
  "FOMC",
  "GDP",
  "IPO",
  "IR",
  "IV",
  "LTM",
  "MACD",
  "MOM",
  "NAV",
  "OTM",
  "PE",
  "QE",
  "ROE",
  "ROI",
  "RSI",
  "SEC",
  "SMA",
  "TTM",
  "USD",
  "VWAP",
  "YOY",
  "YTD",
]);

const KNOWN_TICKERS = new Set([
  "AAPL",
  "ABBV",
  "ABNB",
  "ALL.AX",
  "ANZ.AX",
  "AMD",
  "AMZN",
  "AVGO",
  "BAC",
  "BHP.AX",
  "BRK.B",
  "CBA.AX",
  "COIN",
  "COST",
  "CRM",
  "CSL.AX",
  "DIS",
  "FMG.AX",
  "GOOG",
  "GOOGL",
  "INTC",
  "JPM",
  "KO",
  "LLY",
  "META",
  "MQG.AX",
  "MSFT",
  "NAB.AX",
  "NFLX",
  "NKE",
  "NVDA",
  "ORCL",
  "PEP",
  "PLTR",
  "QQQ",
  "SHOP",
  "SPY",
  "TSLA",
  "TLS.AX",
  "UNH",
  "V",
  "VOO",
  "WBC.AX",
  "WES.AX",
  "WOW.AX",
  "WMT",
  "XOM",
  "XRO.AX",
]);

const ASX_TICKER_ALIASES = new Map([
  ["ANZ", "ANZ.AX"],
  ["BHP", "BHP.AX"],
  ["CBA", "CBA.AX"],
  ["CSL", "CSL.AX"],
  ["FMG", "FMG.AX"],
  ["MQG", "MQG.AX"],
  ["NAB", "NAB.AX"],
  ["TLS", "TLS.AX"],
  ["WBC", "WBC.AX"],
  ["WES", "WES.AX"],
  ["WOW", "WOW.AX"],
  ["XRO", "XRO.AX"],
]);

const COMPANY_TO_TICKER: Array<{ ticker: string; terms: string[] }> = [
  { ticker: "AAPL", terms: ["apple"] },
  { ticker: "AMD", terms: ["advanced micro devices", "amd"] },
  { ticker: "AMZN", terms: ["amazon"] },
  { ticker: "AVGO", terms: ["broadcom"] },
  { ticker: "COIN", terms: ["coinbase"] },
  { ticker: "GOOGL", terms: ["alphabet", "google"] },
  { ticker: "META", terms: ["meta", "facebook"] },
  { ticker: "MSFT", terms: ["microsoft"] },
  { ticker: "NFLX", terms: ["netflix"] },
  { ticker: "NVDA", terms: ["nvidia"] },
  { ticker: "PLTR", terms: ["palantir"] },
  { ticker: "TSLA", terms: ["tesla"] },
  { ticker: "WMT", terms: ["walmart"] },
];

const TYPE_RULES = [
  {
    label: "Question",
    terms: ["?", "can i", "should i", "what do", "how do", "is it worth"],
    reason: "question wording",
  },
  {
    label: "Analysis",
    terms: [
      "analysis",
      "analyze",
      "comparing",
      "valuation",
      "deep dive",
      "thesis",
    ],
    reason: "analysis language",
  },
  {
    label: "Strategy",
    terms: ["strategy", "allocation", "rebalance", "entry", "exit", "setup"],
    reason: "strategy language",
  },
  {
    label: "News",
    terms: [
      "news",
      "announced",
      "reported",
      "breaking",
      "fed",
      "rate decision",
    ],
    reason: "news or catalyst language",
  },
  {
    label: "Portfolio",
    terms: ["portfolio", "position", "holdings", "watchlist", "allocation"],
    reason: "portfolio language",
  },
];

const TOPIC_RULES = [
  {
    label: "Backtesting",
    terms: ["backtest", "backtesting", "sharpe", "drawdown", "walk-forward"],
    reason: "backtest metrics",
  },
  {
    label: "Earnings",
    terms: ["earnings", "guidance", "revenue", "margin", "eps"],
    reason: "earnings terms",
  },
  {
    label: "Risk",
    terms: ["risk", "drawdown", "hedge", "downside", "volatility", "stop loss"],
    reason: "risk terms",
  },
  {
    label: "Options",
    terms: ["options", "iv", "implied volatility", "calls", "puts", "straddle"],
    reason: "options terms",
  },
  {
    label: "Technical",
    terms: ["rsi", "macd", "support", "resistance", "breakout", "trendline"],
    reason: "technical indicators",
  },
  {
    label: "Fundamental",
    terms: ["dcf", "cash flow", "balance sheet", "moat", "p/e", "pe ratio"],
    reason: "fundamental metrics",
  },
  {
    label: "Momentum",
    terms: ["momentum", "relative strength", "trend", "moving average"],
    reason: "momentum terms",
  },
  {
    label: "Macro",
    terms: ["cpi", "gdp", "fomc", "inflation", "rates", "yield", "dollar"],
    reason: "macro terms",
  },
  {
    label: "AI",
    terms: ["artificial intelligence", "ai demand", "gpu", "data center"],
    reason: "AI industry terms",
  },
];

function normalizeInput(input: string | DiscussionDraft) {
  if (typeof input === "string") return input.trim();
  return `${input.title} ${input.body}`.trim();
}

function scoreInputTerms(input: string | DiscussionDraft, terms: string[]) {
  if (typeof input === "string") return scoreTerms(input, terms);

  return terms.reduce((score, term) => {
    const titleScore = wordRegex(term).test(input.title) ? 3 : 0;
    const bodyScore = wordRegex(term).test(input.body) ? 1 : 0;
    return score + titleScore + bodyScore;
  }, 0);
}

function wordRegex(term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (/^[a-z0-9 ]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  }

  return new RegExp(escaped, "i");
}

function scoreTerms(text: string, terms: string[]) {
  return terms.reduce((score, term) => {
    if (!wordRegex(term).test(text)) return score;
    return score + (term.length > 3 ? 2 : 1);
  }, 0);
}

function addTicker(
  items: Map<string, { ticker: string; index: number }>,
  ticker: string,
  index: number,
) {
  const normalizedInput = ticker.toUpperCase();
  const normalized = ASX_TICKER_ALIASES.get(normalizedInput) ?? normalizedInput;
  if (FINANCE_ACRONYM_BLOCKLIST.has(normalized)) return;
  if (!KNOWN_TICKERS.has(normalized)) return;

  const existing = items.get(normalized);
  if (!existing || index < existing.index) {
    items.set(normalized, { ticker: normalized, index });
  }
}

function getTagKind(label: string): SmartTagKind {
  return label.startsWith("$") ? "ticker" : "topic";
}

export function normalizeTagLabel(value: unknown) {
  if (typeof value !== "string") return null;

  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > MAX_TAG_LABEL_CHARS) return null;

  if (clean.startsWith("$")) {
    const tickerInput = clean.slice(1).toUpperCase();
    const ticker = ASX_TICKER_ALIASES.get(tickerInput) ?? tickerInput;
    return KNOWN_TICKERS.has(ticker) ? `$${ticker}` : null;
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9 .&/-]{0,23}$/.test(clean)) return null;
  return clean;
}

export function normalizeSelectedTags(
  values: unknown,
  limit = MAX_DISCUSSION_TAGS,
) {
  const rawTags = Array.isArray(values) ? values : [];
  const unique = new Set<string>();

  for (const value of rawTags) {
    const tag = normalizeTagLabel(value);
    if (tag) unique.add(tag);
    if (unique.size >= limit) break;
  }

  return Array.from(unique);
}

export function getDefaultSelectedTags(input: string | DiscussionDraft) {
  return getSmartTagSuggestions(input, MAX_DISCUSSION_TAGS)
    .filter((suggestion) => suggestion.kind !== "ticker")
    .map((suggestion) => suggestion.label);
}

export function mergeSelectedTagSuggestions(
  selectedTags: string[],
  suggestions: SmartTagSuggestion[],
) {
  const merged = new Map<string, SmartTagSuggestion>();

  for (const label of normalizeSelectedTags(selectedTags)) {
    merged.set(label, {
      label,
      kind: getTagKind(label),
      score: 10,
      reason: "selected tag",
    });
  }

  for (const suggestion of suggestions) {
    if (!merged.has(suggestion.label)) merged.set(suggestion.label, suggestion);
  }

  return Array.from(merged.values());
}

export function detectTickerTags(input: string | DiscussionDraft) {
  const text = normalizeInput(input);
  const detected = new Map<string, { ticker: string; index: number }>();
  const cashtagPattern = /\$([A-Za-z][A-Za-z.]{0,8})\b/g;
  const uppercasePattern = /\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g;
  let match: RegExpExecArray | null;

  while ((match = cashtagPattern.exec(text)) !== null) {
    addTicker(detected, match[1], match.index ?? 0);
  }

  while ((match = uppercasePattern.exec(text)) !== null) {
    addTicker(detected, match[0], match.index ?? 0);
  }

  const lower = text.toLowerCase();
  for (const company of COMPANY_TO_TICKER) {
    const indexes = company.terms
      .map((term) => {
        const match = lower.match(wordRegex(term));
        return match?.index ?? -1;
      })
      .filter((index) => index >= 0);

    if (indexes.length) {
      addTicker(detected, company.ticker, Math.min(...indexes));
    }
  }

  return Array.from(detected.values())
    .sort((a, b) => a.index - b.index)
    .map((item) => `$${item.ticker}`);
}

function buildScoredSuggestions(
  input: string | DiscussionDraft,
  rules: Array<{ label: string; terms: string[]; reason: string }>,
  kind: SmartTagKind,
) {
  return rules
    .map((rule) => ({
      label: rule.label,
      kind,
      score: scoreInputTerms(input, rule.terms),
      reason: rule.reason,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

export function getSmartTagSuggestions(
  input: string | DiscussionDraft,
  limit = MAX_SUGGESTED_TAGS,
): SmartTagSuggestion[] {
  const text = normalizeInput(input);
  if (text.length < 8) return [];

  const type = buildScoredSuggestions(input, TYPE_RULES, "type")[0];
  const tickers = detectTickerTags(text).map<SmartTagSuggestion>((label) => ({
    label,
    kind: "ticker",
    score: 6,
    reason: label.startsWith("$") ? "ticker symbol or company name" : "ticker",
  }));
  const topics = buildScoredSuggestions(input, TOPIC_RULES, "topic");

  const selected: SmartTagSuggestion[] = [];
  if (type) selected.push(type);

  for (const topic of topics) {
    if (selected.length >= Math.max(2, limit - Math.min(tickers.length, 1)))
      break;
    selected.push(topic);
  }

  for (const ticker of tickers) {
    if (selected.length >= limit) break;
    selected.push(ticker);
  }

  for (const topic of topics) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.label === topic.label))
      selected.push(topic);
  }

  return selected.slice(0, limit);
}

export function inferTags(input: string | DiscussionDraft) {
  const suggestions = getSmartTagSuggestions(input, MAX_DISCUSSION_TAGS);
  return suggestions.length
    ? suggestions.map((suggestion) => suggestion.label)
    : ["Discussion", "Market View"];
}
