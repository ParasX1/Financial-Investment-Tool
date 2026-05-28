import type { NextApiRequest, NextApiResponse } from 'next';
import type { Article } from '@/services/news';
import {
  fetchNewsApiArticles,
  fetchNewsApiArticlesWithFallback,
  normalizePageSize,
} from '@/lib/newsApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  const pageSize = normalizePageSize(req.query.pageSize);

  try {
    const articles = await fetchNewsApiArticlesWithFallback(
      () => fetchNewsApiArticles('top-headlines', { category: 'business', pageSize }),
      () =>
        fetchNewsApiArticles('everything', {
          q: 'business financial markets stocks economy',
          language: 'en',
          sortBy: 'publishedAt',
          pageSize,
        })
    );

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
}
