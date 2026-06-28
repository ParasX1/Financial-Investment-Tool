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
      const query = firstQueryValue(req.query.q)?.trim() || "";
      const context = firstQueryValue(req.query.context)?.trim() || query;

      return {
        context,
        kind: "search",
        marketScopeId: firstQueryValue(req.query.marketScopeId),
        pageSize: readNewsPageSize(req),
        query,
        topicId: firstQueryValue(req.query.topicId),
      };
    },
    errorLogLabel: "Market news search error",
    validate: (request) => (request.query?.trim() ? null : "q is required"),
  });
}
