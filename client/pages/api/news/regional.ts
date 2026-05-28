import type { NextApiRequest, NextApiResponse } from 'next';
import type { Article } from '@/services/news';
import {
  buildRegionalMarketQuery,
  fetchNewsApiArticles,
  fetchNewsApiArticlesWithFallback,
  getQueryParam,
  normalizePageSize,
} from '@/lib/newsApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const country = getQueryParam(req.query.country, 'au').toLowerCase();
  const pageSize = normalizePageSize(req.query.pageSize);

  try {
    const articles = await fetchNewsApiArticlesWithFallback(
      () => fetchNewsApiArticles('top-headlines', { country, pageSize }),
      () =>
        fetchNewsApiArticles('everything', {
          q: buildRegionalMarketQuery(country),
          language: 'en',
          sortBy: 'publishedAt',
          pageSize,
        })
    );

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
