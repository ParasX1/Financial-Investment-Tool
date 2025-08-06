export type Article = {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
};

export async function fetchGeneralNews(limit = 10): Promise<Article[]> {
  const res = await fetch(`/api/news/general?pageSize=${limit}`, { cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to fetch general news');
  const { articles } = await res.json();
  return articles as Article[];
}

export async function fetchRegionalNews(country = 'au', limit = 10): Promise<Article[]> {
  const res = await fetch(`/api/news/regional?country=${country}&pageSize=${limit}`, { cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to fetch regional news');
  const { articles } = await res.json();
  return articles as Article[];
}

export async function fetchIndustryNews(industry = 'technology', limit = 10): Promise<Article[]> {
  const res = await fetch(`/api/news/industry?industry=${industry}&pageSize=${limit}`, { cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to fetch industry news');
  const { articles } = await res.json();
  return articles as Article[];
}

export async function fetchCommodityNews(commodity = 'gold', limit = 10): Promise<Article[]> {
  const res = await fetch(`/api/news/commodity?commodity=${commodity}&pageSize=${limit}`, { cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to fetch commodity news');
  const { articles } = await res.json();
  return articles as Article[];
}

export async function fetchTickerNews(ticker: string, limit = 10): Promise<Article[]> {
  const q   = encodeURIComponent(ticker);
  const res = await fetch(`/api/news/general?pageSize=${limit}&q=${q}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch ticker news');
  const { articles } = await res.json();
  return articles as Article[];
}