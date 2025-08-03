export type Article = {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
};

export async function fetchGeneralNews(limit = 20): Promise<Article[]> {
  const res = await fetch(`/api/news/general?pageSize=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch general news');
  const { articles } = await res.json();
  return articles as Article[];
}