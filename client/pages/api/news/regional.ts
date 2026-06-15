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
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY;
    const country =
      (Array.isArray(req.query.country)
        ? req.query.country[0]
        : req.query.country) || "au";
    const pageSize = normaliseNewsApiPageSize(
      Array.isArray(req.query.pageSize)
        ? req.query.pageSize[0]
        : req.query.pageSize,
    );
    const articles = await fetchNewsApiArticles({
      apiKey,
      candidates: [
        {
          endpoint: "top-headlines",
          params: {
            country: String(country),
          },
        },
        ...businessHeadlineFallback(String(country)),
        ...businessHeadlineFallback(),
      ],
      pageSize,
    });

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
