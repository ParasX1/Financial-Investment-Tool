import type { Article } from '@/services/news';

type QueryParam = string | string[] | undefined;
type NewsApiEndpoint = 'top-headlines' | 'everything';

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const REGION_MARKET_QUERIES: Record<string, string> = {
  au: 'Australia ASX market business finance',
  us: 'United States stock market Wall Street business finance',
  gb: 'United Kingdom FTSE LSE market business finance',
  jp: 'Japan Nikkei Tokyo Stock Exchange market business finance',
  cn: 'China Shanghai Shenzhen stock market business finance',
};

const INDUSTRY_TERMS: Record<string, string> = {
  technology: 'technology',
  finance: 'finance banking',
  health: 'healthcare',
  internet: 'internet digital economy',
  pharmaceutical: 'pharmaceutical healthcare biotech',
};

const COMMODITY_TERMS: Record<string, string> = {
  gold: 'gold',
  oil: 'oil crude energy',
  wheat: 'wheat agriculture',
  copper: 'copper metals',
  silver: 'silver metals',
};

export function getQueryParam(value: QueryParam, fallback = '') {
  const nextValue = Array.isArray(value) ? value[0] : value;
  return String(nextValue ?? fallback).trim();
}

export function normalizePageSize(value: QueryParam, fallback = DEFAULT_PAGE_SIZE) {
  const parsed = Number.parseInt(getQueryParam(value, String(fallback)), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return String(fallback);
  }

  return String(Math.min(parsed, MAX_PAGE_SIZE));
}

export function buildRegionalMarketQuery(country: string) {
  const normalizedCountry = country.trim().toLowerCase();
  return REGION_MARKET_QUERIES[normalizedCountry] ?? `${country} stock market business finance`;
}

export function buildIndustryMarketQuery(industry: string) {
  const normalizedIndustry = industry.trim().toLowerCase();
  const terms = INDUSTRY_TERMS[normalizedIndustry] ?? industry;
  return `${terms} industry stocks business market`;
}

export function buildCommodityMarketQuery(commodity: string) {
  const normalizedCommodity = commodity.trim().toLowerCase();
  const terms = COMMODITY_TERMS[normalizedCommodity] ?? commodity;
  return `${terms} commodity market prices supply demand`;
}

function getNewsApiKey() {
  const apiKey = process.env.NEWSAPI_KEY ?? process.env.NEXT_PUBLIC_NEWSAPI_KEY;

  if (!apiKey) {
    throw new Error('NewsAPI key is not configured');
  }

  return apiKey;
}

function mapArticle(article: any): Article {
  return {
    id: article.url,
    title: article.title,
    summary: article.description || '',
    url: article.url,
    image: article.urlToImage || null,
    publishedAt: article.publishedAt,
    source: article.source?.name || 'Unknown',
  };
}

export async function fetchNewsApiArticles(
  endpoint: NewsApiEndpoint,
  params: Record<string, string | undefined>
) {
  const url = new URL(`${NEWS_API_BASE_URL}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: { 'X-Api-Key': getNewsApiKey() },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.status === 'error') {
    const detail = data?.message ? `: ${data.message}` : '';
    throw new Error(`NewsAPI ${response.status}${detail}`);
  }

  return (data?.articles || []).map(mapArticle) as Article[];
}

export async function fetchNewsApiArticlesWithFallback(
  primary: () => Promise<Article[]>,
  fallback: () => Promise<Article[]>
) {
  const articles = await primary();
  return articles.length ? articles : fallback();
}
