import type { NextApiRequest, NextApiResponse } from 'next'
import type { Article } from '@/services/news'

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
    const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY!
    const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : (req.query.ticker || '')
    const pageSize = Array.isArray(req.query.pageSize) ? req.query.pageSize[0] : (req.query.pageSize || '10')

    if (!ticker) return res.status(400).json({ error: 'ticker is required' })

    const sym = String(ticker).toUpperCase()
    const name = NAME_BY_SYMBOL[sym]
    const q = name ? `${sym} OR "${name}"` : sym

    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('q', q)
    url.searchParams.set('language', 'en')
    url.searchParams.set('sortBy', 'publishedAt')
    url.searchParams.set('pageSize', String(pageSize))

    const r = await fetch(url.toString(), {
      headers: { 'X-Api-Key': apiKey },
    })
    if (!r.ok) throw new Error(`NewsAPI ${r.status}`)

    const data = await r.json()
    const articles: Article[] = (data.articles || []).map((a: any) => ({
      id: a.url,
      title: a.title,
      summary: a.description || '',
      url: a.url,
      image: a.urlToImage || null,
      publishedAt: a.publishedAt,
      source: a.source?.name || 'Unknown',
    }))

    res.status(200).json({ articles })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Internal error' })
  }
}
