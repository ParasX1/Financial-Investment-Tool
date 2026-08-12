import type { NextApiRequest, NextApiResponse } from "next";
import {
  firstQueryValue,
  handleMarketNewsRoute,
  readNewsPageSize,
} from "@/lib/news/newsApiRoute";
import type { ServerNewsResponse } from "@/lib/news/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServerNewsResponse | { error: string }>,
) {
  return handleMarketNewsRoute(req, res, {
    buildRequest: (req) => {
      const commodity = firstQueryValue(req.query.commodity)?.trim() || "gold";

      return {
        commodity,
        context:
          firstQueryValue(req.query.context)?.trim() ||
          `${commodity} commodities futures market supply demand`,
        kind: "commodity",
        marketScopeId: firstQueryValue(req.query.marketScopeId),
        pageSize: readNewsPageSize(req),
        topicId: firstQueryValue(req.query.topicId),
      };
    },
    errorLogLabel: "Market news commodity error",
  });
}
