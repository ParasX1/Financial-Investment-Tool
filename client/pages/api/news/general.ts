import type { NextApiRequest, NextApiResponse } from 'next';
import type { Article } from '@/services/news';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY!
  const pageSize = Array.isArray(req.query.pageSize)
    ? req.query.pageSize[0]
    : req.query.pageSize || '10';

  // Use Top-Headlines of NewsAPI
  const url = new URL('https://newsapi.org/v2/top-headlines');
  url.searchParams.set('category', 'business');
  url.searchParams.set('pageSize', pageSize);
  url.searchParams.set('apiKey', apiKey);

  try {
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`NewsAPI ${r.status}`);
    const data = await r.json();

    const articles: Article[] = (data.articles || []).map((a: any) => ({
      id: a.url,                     
      title: a.title,
      summary: a.description || '',
      url: a.url,
      image: a.urlToImage || null,
      publishedAt: a.publishedAt,
      source: a.source.name || 'Unknown'
    }));

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
}