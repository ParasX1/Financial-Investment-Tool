import type { NextApiRequest, NextApiResponse } from 'next'
import type { Article } from '@/services/news'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY!
    const query = Array.isArray(req.query.q) ? req.query.q[0] : (req.query.q || '')
    const context = Array.isArray(req.query.context) ? req.query.context[0] : (req.query.context || '')
    const pageSize = Array.isArray(req.query.pageSize) ? req.query.pageSize[0] : (req.query.pageSize || '10')

    if (!query.trim()) {
      return res.status(400).json({ error: 'q is required' })
    }

    const searchTerms = [query.trim(), context.trim()].filter(Boolean).join(' ')
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('q', searchTerms)
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
