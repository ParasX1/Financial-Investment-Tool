import type { Article } from "@/services/news";
import { buildNewsSearchProfile } from "./queryPacks";
import type { ServerNewsRequest } from "./types";

const MAX_PAGE_SIZE = 100;

export function compact(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function normaliseNewsPageSize(value: string | undefined): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return "10";

  return String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed))));
}

export function dedupeArticles(articles: readonly Article[]): Article[] {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = article.url || article.id;
    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function describeNewsRequest(request: ServerNewsRequest): string {
  return compact(buildNewsSearchProfile(request).displayText);
}

export function buildStrictSearchText(request: ServerNewsRequest): string {
  return compact(buildNewsSearchProfile(request).searchText);
}
