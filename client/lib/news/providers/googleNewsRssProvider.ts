import { XMLParser } from "fast-xml-parser";
import type { Article } from "@/services/news";
import {
  buildGoogleNewsSearchQuery,
  getGoogleNewsLocale,
} from "../queryPacks";
import { compact, dedupeArticles } from "../providerUtils";
import { inferRelatedSymbolsFromText } from "../symbolAliases";
import type {
  NewsProvider,
  NewsProviderFetchContext,
  ServerNewsRequest,
} from "../types";

const GOOGLE_NEWS_RSS_ENDPOINT = "https://news.google.com/rss/search";

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  textNodeName: "#text",
});

type GoogleRssSource =
  | string
  | {
      "#text"?: string;
      "@_url"?: string;
    };

type GoogleRssMedia =
  | {
      "@_url"?: string;
    }
  | Array<{
      "@_url"?: string;
    }>;

type GoogleRssItem = {
  description?: string;
  guid?: string | { "#text"?: string };
  link?: string;
  "media:content"?: GoogleRssMedia;
  "media:thumbnail"?: GoogleRssMedia;
  pubDate?: string;
  source?: GoogleRssSource;
  title?: string;
};

type GoogleRssDocument = {
  rss?: {
    channel?: {
      item?: GoogleRssItem | GoogleRssItem[];
    };
  };
};

function envFlag(value: string | undefined) {
  const cleaned = compact(value).toLowerCase();

  if (["1", "true", "yes", "on"].includes(cleaned)) return true;
  if (["0", "false", "no", "off"].includes(cleaned)) return false;

  return null;
}

export function isGoogleNewsRssEnabled(
  env: Record<string, string | undefined>,
) {
  const configured = envFlag(env.GOOGLE_NEWS_RSS_ENABLED);
  if (configured !== null) return configured;

  return compact(env.NODE_ENV).toLowerCase() !== "production";
}

export function buildGoogleNewsRssUrl(request: ServerNewsRequest): string {
  const locale = getGoogleNewsLocale(request);
  const url = new URL(GOOGLE_NEWS_RSS_ENDPOINT);

  url.searchParams.set("q", buildGoogleNewsSearchQuery(request));
  url.searchParams.set("hl", locale.hl);
  url.searchParams.set("gl", locale.gl);
  url.searchParams.set("ceid", locale.ceid);

  return url.toString();
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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function readSource(value: GoogleRssSource | undefined) {
  if (!value) return "Google News";
  if (typeof value === "string") return compact(value) || "Google News";

  return compact(value["#text"]) || "Google News";
}

function readMediaUrl(value: GoogleRssMedia | undefined) {
  return compact(asList(value)[0]?.["@_url"]) || null;
}

function isSafeExternalUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function readPublishedAt(value: string | undefined) {
  const cleaned = compact(value);
  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return cleaned;
  }

  return date.toISOString();
}

function readGuid(value: GoogleRssItem, link: string) {
  return readText(value.guid) || link;
}

function summaryWithoutDuplicateTitle(
  item: GoogleRssItem,
  title: string,
  source: string,
) {
  const description = stripHtml(item.description);
  const titleWithoutSource = title.endsWith(` - ${source}`)
    ? title.slice(0, -` - ${source}`.length).trim()
    : title;

  if (!description) return "";
  if (description.toLowerCase().startsWith(titleWithoutSource.toLowerCase())) {
    const summary = compact(
      description.slice(titleWithoutSource.length).replace(/^[\s\-:|]+/, ""),
    );
    return summary.toLowerCase() === source.toLowerCase() ? "" : summary;
  }

  return description;
}

export function mapGoogleNewsRssItems(
  items: readonly GoogleRssItem[] = [],
): Article[] {
  const mapped = items
    .map((item) => {
      const title = stripHtml(item.title);
      const url = compact(item.link);

      if (!title || !url || !isSafeExternalUrl(url)) return null;

      const source = readSource(item.source);
      const summary = summaryWithoutDuplicateTitle(item, title, source);
      const relatedSymbols = inferRelatedSymbolsFromText(
        `${title} ${summary} ${source}`,
      );

      return {
        confidence: relatedSymbols.length ? 0.58 : null,
        id: readGuid(item, url),
        image:
          readMediaUrl(item["media:content"]) ??
          readMediaUrl(item["media:thumbnail"]),
        provider: "google-news-rss",
        providerLabel: "Google News RSS",
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

function parseGoogleNewsRss(xml: string) {
  const document = parser.parse(xml) as GoogleRssDocument;
  return mapGoogleNewsRssItems(asList(document.rss?.channel?.item));
}

export const googleNewsRssProvider: NewsProvider = {
  id: "google-news-rss",
  label: "Google News RSS",
  isConfigured: isGoogleNewsRssEnabled,
  async fetchArticles(request, context: NewsProviderFetchContext) {
    const response = await context.fetcher(buildGoogleNewsRssUrl(request), {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Google News RSS ${response.status}`);
    }

    return parseGoogleNewsRss(await response.text()).slice(
      0,
      Number(request.pageSize) || 10,
    );
  },
};
