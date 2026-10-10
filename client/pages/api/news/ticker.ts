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
      const ticker = firstQueryValue(req.query.ticker)?.trim() || "";

      return {
        context:
          firstQueryValue(req.query.context)?.trim() ||
          `${ticker} company stock market news`,
        kind: "ticker",
        marketScopeId: firstQueryValue(req.query.marketScopeId),
        pageSize: readNewsPageSize(req),
        ticker,
        topicId: firstQueryValue(req.query.topicId),
      };
    },
    errorLogLabel: "Market news ticker error",
    validate: (request) =>
      request.ticker?.trim() ? null : "ticker is required",
  });
}
