import type { Article } from "@/services/news";
import { buildNewsSearchProfile } from "./queryPacks";
import type { ServerNewsRequest } from "./types";

const MAX_PAGE_SIZE = 100;
const DEFAULT_CANDIDATE_MULTIPLIER = 8;

export function compact(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function safeExternalUrl(value: string | undefined): string {
  const cleaned = compact(value);
  if (!cleaned) return "";

  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? cleaned
      : "";
  } catch {
    return "";
  }
}

export function normaliseNewsPageSize(value: string | undefined): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return "10";

  return String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed))));
}

export function newsCandidateLimit(
  value: string | undefined,
  multiplier = DEFAULT_CANDIDATE_MULTIPLIER,
): number {
  const pageSize = Number(normaliseNewsPageSize(value));
  return Math.min(MAX_PAGE_SIZE, Math.max(pageSize, pageSize * multiplier));
}

function canonicalTitle(value: string, source: string) {
  const suffix = source ? ` - ${source}` : "";
  const title =
    suffix && value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;

  return title
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^\w\s$%.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeArticles(articles: readonly Article[]): Article[] {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();

  return articles.filter((article) => {
    const key = article.url || article.id;
    if (!key || seen.has(key)) return false;

    const titleKey = canonicalTitle(article.title, article.source);
    if (titleKey.length >= 24 && seenTitles.has(titleKey)) return false;

    seen.add(key);
    if (titleKey.length >= 24) seenTitles.add(titleKey);
    return true;
  });
}

export function describeNewsRequest(request: ServerNewsRequest): string {
  return compact(buildNewsSearchProfile(request).displayText);
}

export function buildStrictSearchText(request: ServerNewsRequest): string {
  return compact(buildNewsSearchProfile(request).searchText);
}
