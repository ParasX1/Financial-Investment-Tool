import type { NextApiRequest, NextApiResponse } from 'next';
import type { Article } from '@/services/news';
import {
  buildCommodityMarketQuery,
  fetchNewsApiArticles,
  getQueryParam,
  normalizePageSize,
} from '@/lib/newsApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  const commodity = getQueryParam(req.query.commodity, 'gold').toLowerCase();
  const pageSize = normalizePageSize(req.query.pageSize);

  try {
    const articles = await fetchNewsApiArticles('everything', {
      q: buildCommodityMarketQuery(commodity),
      language: 'en',
      sortBy: 'publishedAt',
      pageSize,
    });

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
