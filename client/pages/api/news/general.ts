import type { NextApiRequest, NextApiResponse } from "next";
import {
  businessHeadlineFallback,
  fetchNewsApiArticles,
  normaliseNewsApiPageSize,
} from "@/lib/newsApi";
import type { Article } from "@/services/news";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>,
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY;
    const pageSize = normaliseNewsApiPageSize(
      Array.isArray(req.query.pageSize)
        ? req.query.pageSize[0]
        : req.query.pageSize,
    );
    const articles = await fetchNewsApiArticles({
      apiKey,
      candidates: businessHeadlineFallback(),
      pageSize,
    });

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
}
