import type { NextApiRequest, NextApiResponse } from 'next'
import type { Article } from '@/services/news'
import {
  fetchNewsApiArticles,
  getQueryParam,
  normalizePageSize,
} from '@/lib/newsApi'

const NAME_BY_SYMBOL: Record<string, string> = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft',
  AMZN: 'Amazon',
  GOOGL: 'Alphabet',
  GOOG: 'Alphabet',
  NVDA: 'NVIDIA',
  META: 'Meta Platforms',
  TSLA: 'Tesla',
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  try {
    const ticker = getQueryParam(req.query.ticker)
    const pageSize = normalizePageSize(req.query.pageSize)

    if (!ticker) return res.status(400).json({ error: 'ticker is required' })

    const sym = String(ticker).toUpperCase()
    const name = NAME_BY_SYMBOL[sym]
    const q = name ? `${sym} OR "${name}"` : sym

    const articles = await fetchNewsApiArticles('everything', {
      q,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize,
    })

    res.status(200).json({ articles })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Internal error' })
  }
}
