import type { NextApiRequest, NextApiResponse } from "next";
import {
  firstQueryValue,
  handleMarketNewsRoute,
  readNewsPageSize,
} from "@/lib/news/newsApiRoute";
import type {
  ServerNewsRequest,
  ServerNewsRequestKind,
  ServerNewsResponse,
} from "@/lib/news/types";

const allowedKinds = new Set<ServerNewsRequestKind>([
  "commodity",
  "general",
  "industry",
  "regional",
  "search",
  "ticker",
]);

function makeRequest(req: NextApiRequest): ServerNewsRequest | null {
  const kind = firstQueryValue(req.query.kind) as ServerNewsRequestKind;

  if (!allowedKinds.has(kind)) return null;

  const query = firstQueryValue(req.query.q)?.trim();
  const ticker = firstQueryValue(req.query.ticker)?.trim();

  return {
    commodity: firstQueryValue(req.query.commodity),
    continuationCursor: firstQueryValue(req.query.cursor),
    context: firstQueryValue(req.query.context) || "",
    country: firstQueryValue(req.query.country),
    industry: firstQueryValue(req.query.industry),
    kind,
    marketScopeId: firstQueryValue(req.query.marketScopeId),
    pageSize: readNewsPageSize(req),
    query,
    ticker,
    topicId: firstQueryValue(req.query.topicId),
  };
}

function getValidationError(request: ServerNewsRequest) {
  if (request.kind === "search" && !request.query?.trim()) {
    return "q is required";
  }

  if (request.kind === "ticker" && !request.ticker?.trim()) {
    return "ticker is required";
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServerNewsResponse | { error: string }>,
) {
  return handleMarketNewsRoute(req, res, {
    buildRequest: makeRequest,
    errorLogLabel: "Market news provider error",
    unsupportedError: "Unsupported market news request",
    validate: getValidationError,
  });
}
