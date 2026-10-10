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
      const industry =
        firstQueryValue(req.query.industry)?.trim() || "technology";

      return {
        context:
          firstQueryValue(req.query.context)?.trim() ||
          `${industry} sector stocks companies market news`,
        industry,
        kind: "industry",
        marketScopeId: firstQueryValue(req.query.marketScopeId),
        pageSize: readNewsPageSize(req),
        topicId: firstQueryValue(req.query.topicId),
      };
    },
    errorLogLabel: "Market news industry error",
  });
}
