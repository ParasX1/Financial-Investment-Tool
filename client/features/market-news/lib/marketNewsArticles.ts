import type { Article } from "@/services/news";

const ARTICLE_TIME_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  hour: "2-digit",
  hour12: false,
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Australia/Sydney",
});

const ARTICLE_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const FRESH_NEWS_WINDOW_MS = 36 * 60 * 60 * 1000;
const INVESTOR_CUE_RULES: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: "Rate-sensitive",
    pattern: /\b(rba|rate|rates|inflation|cpi|bond|bonds|yield|yields)\b/i,
  },
  {
    label: "Macro",
    pattern: /\b(economy|economic|jobs|wages|employment|consumer|gdp)\b/i,
  },
  {
    label: "Property",
    pattern: /\b(property|housing|mortgage|rent|rents|real estate)\b/i,
  },
  {
    label: "Commodities",
    pattern: /\b(oil|gold|copper|energy|commodity|commodities|metals)\b/i,
  },
  {
    label: "Technology",
    pattern: /\b(ai|technology|software|semiconductor|cybersecurity)\b/i,
  },
];

export function getArticleDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown source";
  }
}

export function getSafeArticleHref(url: string) {
  if (url.startsWith("#demo-market-news-")) return url;

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "#market-news-main";
  }

  return "#market-news-main";
}

export function formatArticleTime(publishedAt: string) {
  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const parts = ARTICLE_TIME_FORMATTER.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const monthNumber = Number(value("month"));
  const monthLabel = ARTICLE_MONTH_LABELS[monthNumber - 1] ?? value("month");

  return `${value("day")} ${monthLabel}, ${value("hour")}:${value("minute")}`;
}

export function getArticleImage(article: Article) {
  return article.image || null;
}

export function getArticleInvestorCues(
  article: Article,
  now: Date = new Date(),
) {
  const cues: string[] = [];
  const publishedAt = new Date(article.publishedAt);
  const articleText = `${article.title} ${article.summary}`.trim();

  if (
    Number.isFinite(publishedAt.getTime()) &&
    now.getTime() - publishedAt.getTime() >= 0 &&
    now.getTime() - publishedAt.getTime() <= FRESH_NEWS_WINDOW_MS
  ) {
    cues.push("Fresh");
  }

  if (article.relatedSymbols?.length) cues.push("Ticker-linked");
  if (article.sentiment === "negative") cues.push("Risk");
  if (article.sentiment === "positive") cues.push("Opportunity");

  for (const rule of INVESTOR_CUE_RULES) {
    if (cues.length >= 3) break;
    if (rule.pattern.test(articleText) && !cues.includes(rule.label)) {
      cues.push(rule.label);
    }
  }

  return cues.slice(0, 3);
}
