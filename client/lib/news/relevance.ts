import type { Article } from "@/services/news";
import { getSymbolAliases } from "./symbolAliases";
import type { ServerNewsRequest } from "./types";

const TOPIC_KEYWORDS: Record<string, readonly string[]> = {
  "australian-markets": [
    "all ords",
    "asx",
    "australia",
    "australian",
    "bank",
    "bhp",
    "cba",
    "miners",
  ],
  commodities: [
    "commodity",
    "commodities",
    "copper",
    "crude",
    "energy",
    "gold",
    "metals",
    "oil",
  ],
  "cost-of-living": [
    "bill",
    "cash rate",
    "consumer price",
    "cost of living",
    "grocery",
    "household",
    "housing affordability",
    "inflation",
    "interest rate",
    "living cost",
    "living costs",
    "mortgage",
    "mortgage stress",
    "rent",
    "rba",
    "wage",
  ],
  "international-markets": [
    "asia",
    "china",
    "dow",
    "europe",
    "global",
    "japan",
    "nasdaq",
    "s&p",
    "us market",
    "wall street",
  ],
  "money-news": [
    "banking",
    "finance",
    "money",
    "retirement",
    "saving",
    "superannuation",
    "tax",
  ],
  "personal-finance": [
    "budget",
    "insurance",
    "mortgage",
    "personal finance",
    "retirement",
    "saving",
  ],
  "property-news": [
    "home price",
    "housing",
    "mortgage",
    "property",
    "real estate",
    "rent",
  ],
  technology: [
    "5g",
    "ai",
    "broadcom",
    "chip",
    "cybersecurity",
    "nvidia",
    "semiconductor",
    "software",
    "tech",
    "technology",
  ],
  work: [
    "employment",
    "jobs",
    "labour",
    "productivity",
    "wage",
    "work",
    "workplace",
  ],
};

const TOPIC_MINIMUM_MATCHES: Record<string, number> = {
  "cost-of-living": 2,
  "money-news": 2,
};

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function articleText(
  article: Article,
  { includeSource = false, includeSymbols = true } = {},
): string {
  return normalize(
    [
      article.title,
      article.summary,
      ...(includeSource ? [article.source] : []),
      ...(includeSymbols ? (article.relatedSymbols ?? []) : []),
    ].join(" "),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBoundedPhrase(text: string, phrase: string): boolean {
  const cleaned = normalize(phrase);
  if (!cleaned) return false;

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(cleaned)}([^a-z0-9]|$)`).test(
    text,
  );
}

function compactSymbol(symbol: string | undefined): string {
  return (symbol ?? "").trim().toUpperCase();
}

function tokeniseQuery(query: string | undefined): string[] {
  return normalize(query)
    .split(/[^a-z0-9.=&^]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter(
      (token) =>
        ![
          "and",
          "are",
          "for",
          "market",
          "markets",
          "news",
          "stock",
          "stocks",
          "the",
          "with",
        ].includes(token),
    );
}

function articleMatchesKeywords(
  article: Article,
  keywords: readonly string[],
  { minimumMatches = 1 }: { minimumMatches?: number } = {},
): boolean {
  const text = articleText(article);
  let matches = 0;

  for (const keyword of keywords) {
    if (containsBoundedPhrase(text, keyword)) {
      matches += normalize(keyword).includes(" ") ? 2 : 1;
    }

    if (matches >= minimumMatches) {
      return true;
    }
  }

  return false;
}

function articleMatchesTicker(article: Article, ticker: string | undefined) {
  const symbol = compactSymbol(ticker);
  if (!symbol) return true;

  const text = articleText(article, { includeSymbols: false });
  const aliases = getSymbolAliases(symbol);

  return aliases.some((alias) => {
    const cleaned = normalize(alias);
    return cleaned.length >= 2 && containsBoundedPhrase(text, cleaned);
  });
}

function requestKeywords(request: ServerNewsRequest): string[] {
  if (request.topicId && TOPIC_KEYWORDS[request.topicId]) {
    return [...TOPIC_KEYWORDS[request.topicId]];
  }

  if (request.kind === "commodity") {
    return [
      ...(TOPIC_KEYWORDS.commodities ?? []),
      ...tokeniseQuery(request.commodity),
    ];
  }

  if (request.kind === "industry") {
    return tokeniseQuery(`${request.industry ?? ""} ${request.context}`);
  }

  if (request.kind === "regional") {
    return tokeniseQuery(`${request.country ?? ""} ${request.context}`);
  }

  return tokeniseQuery(request.query ?? request.context);
}

export function filterRelevantNewsArticles(
  articles: readonly Article[],
  request: ServerNewsRequest,
): Article[] {
  if (request.kind === "ticker") {
    return articles.filter((article) =>
      articleMatchesTicker(article, request.ticker),
    );
  }

  const keywords = requestKeywords(request);
  if (!keywords.length) return [...articles];
  const minimumMatches = request.topicId
    ? (TOPIC_MINIMUM_MATCHES[request.topicId] ?? 1)
    : 1;

  return articles.filter((article) =>
    articleMatchesKeywords(article, keywords, { minimumMatches }),
  );
}
