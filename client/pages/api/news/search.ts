import type { NextApiRequest, NextApiResponse } from 'next'
import type { Article } from '@/services/news'
import {
  fetchNewsApiArticles,
  getQueryParam,
  normalizePageSize,
} from '@/lib/newsApi'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>
) {
  try {
    const query = getQueryParam(req.query.q)
    const context = getQueryParam(req.query.context)
    const pageSize = normalizePageSize(req.query.pageSize)

    if (!query.trim()) {
      return res.status(400).json({ error: 'q is required' })
    }

    const searchTerms = [query.trim(), context.trim()].filter(Boolean).join(' ')
    const articles = await fetchNewsApiArticles('everything', {
      q: searchTerms,
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
