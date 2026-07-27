import { XMLParser } from "fast-xml-parser";
import type { Article } from "@/services/news";
import {
  compact,
  dedupeArticles,
  newsCandidateLimit,
  safeExternalUrl,
} from "../providerUtils";
import { inferRelatedSymbolsFromText } from "../symbolAliases";
import type {
  NewsProvider,
  NewsProviderFetchContext,
  ServerNewsRequest,
} from "../types";

const DEFAULT_YAHOO_FINANCE_RSS_URL =
  "https://au.finance.yahoo.com/news/rssindex";
const DEFAULT_YAHOO_FINANCE_TICKER_RSS_URL =
  "https://finance.yahoo.com/rss/headline";

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  textNodeName: "#text",
});

type YahooRssSource =
  | string
  | {
      "#text"?: string;
      "@_url"?: string;
    };

type YahooRssMedia =
  | {
      "@_url"?: string;
    }
  | Array<{
      "@_url"?: string;
    }>;

type YahooRssItem = {
  description?: string;
  guid?: string | { "#text"?: string };
  link?: string;
  "media:content"?: YahooRssMedia;
  "media:thumbnail"?: YahooRssMedia;
  pubDate?: string;
  source?: YahooRssSource;
  title?: string;
};

type YahooRssDocument = {
  rss?: {
    channel?: {
      item?: YahooRssItem | YahooRssItem[];
    };
  };
};

function envFlag(value: string | undefined) {
  const cleaned = compact(value).toLowerCase();

  if (["1", "true", "yes", "on"].includes(cleaned)) return true;
  if (["0", "false", "no", "off"].includes(cleaned)) return false;

  return null;
}

function safeYahooFinanceRssUrl(value: string | undefined) {
  const configured = compact(value);
  if (!configured) return null;

  try {
    const url = new URL(configured);
    const hostname = url.hostname.toLowerCase();
    const allowedHostname =
      hostname === "finance.yahoo.com" ||
      hostname.endsWith(".finance.yahoo.com");
    const allowedPort = !url.port || url.port === "443";

    if (
      url.protocol !== "https:" ||
      !allowedHostname ||
      !allowedPort ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function yahooRssUrl(
  request: ServerNewsRequest,
  env: Record<string, string | undefined>,
) {
  if (request.kind === "ticker" && compact(request.ticker)) {
    const url = new URL(DEFAULT_YAHOO_FINANCE_TICKER_RSS_URL);
    url.searchParams.set("s", compact(request.ticker).toUpperCase());
    return url.toString();
  }

  const configured = safeYahooFinanceRssUrl(env.YAHOO_FINANCE_RSS_URL);
  if (configured) return configured;

  return DEFAULT_YAHOO_FINANCE_RSS_URL;
}

export function isYahooFinanceRssEnabled(
  env: Record<string, string | undefined>,
) {
  const configured = envFlag(env.YAHOO_FINANCE_RSS_ENABLED);
  if (configured !== null) return configured;

  return true;
}

function asList<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(value: string | { "#text"?: string } | undefined) {
  if (typeof value === "string") return compact(value);
  return compact(value?.["#text"]);
}

function stripHtml(value: string | undefined) {
  return compact(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readSource(value: YahooRssSource | undefined) {
  if (!value) return "Yahoo Finance";
  if (typeof value === "string") return compact(value) || "Yahoo Finance";

  return compact(value["#text"]) || "Yahoo Finance";
}

function readMediaUrl(value: YahooRssMedia | undefined) {
  return safeExternalUrl(asList(value)[0]?.["@_url"]) || null;
}

function readPublishedAt(value: string | undefined) {
  const cleaned = compact(value);
  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return cleaned;
  }

  return date.toISOString();
}

function readGuid(value: YahooRssItem, link: string) {
  return readText(value.guid) || link;
}

export function mapYahooFinanceRssItems(
  items: readonly YahooRssItem[] = [],
): Article[] {
  const mapped = items
    .map((item) => {
      const title = stripHtml(item.title);
      const url = safeExternalUrl(item.link);

      if (!title || !url) return null;

      const summary = stripHtml(item.description);
      const source = readSource(item.source);
      const relatedSymbols = inferRelatedSymbolsFromText(
        `${title} ${summary} ${source}`,
      );

      return {
        confidence: relatedSymbols.length ? 0.62 : null,
        id: readGuid(item, url),
        image:
          readMediaUrl(item["media:content"]) ??
          readMediaUrl(item["media:thumbnail"]),
        provider: "yahoo-finance-rss",
        providerLabel: "Yahoo Finance RSS",
        publishedAt: readPublishedAt(item.pubDate),
        relatedSymbols,
        sentiment: "neutral",
        source,
        summary,
        title,
        url,
      } satisfies Article;
    })
    .filter((article): article is Exclude<typeof article, null> =>
      Boolean(article),
    );

  return dedupeArticles(mapped);
}

function parseYahooFinanceRss(xml: string) {
  const document = parser.parse(xml) as YahooRssDocument;
  return mapYahooFinanceRssItems(asList(document.rss?.channel?.item));
}

export const yahooFinanceRssProvider: NewsProvider = {
  id: "yahoo-finance-rss",
  label: "Yahoo Finance RSS",
  isConfigured: isYahooFinanceRssEnabled,
  supports: (request) => !request.publishedBefore,
  async fetchArticles(request, context: NewsProviderFetchContext) {
    const response = await context.fetcher(yahooRssUrl(request, context.env), {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance RSS ${response.status}`);
    }

    return parseYahooFinanceRss(await response.text()).slice(
      0,
      newsCandidateLimit(request.pageSize),
    );
  },
};
