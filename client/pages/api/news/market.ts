import type { NextApiRequest, NextApiResponse } from "next";
import { fetchMarketNewsWithProviders } from "@/lib/news/newsService";
import { normaliseNewsPageSize } from "@/lib/news/providerUtils";
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

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function makeRequest(req: NextApiRequest): ServerNewsRequest | null {
  const kind = firstQueryValue(req.query.kind) as ServerNewsRequestKind;

  if (!allowedKinds.has(kind)) return null;

  return {
    commodity: firstQueryValue(req.query.commodity),
    context: firstQueryValue(req.query.context) || "",
    country: firstQueryValue(req.query.country),
    industry: firstQueryValue(req.query.industry),
    kind,
    marketScopeId: firstQueryValue(req.query.marketScopeId),
    pageSize: normaliseNewsPageSize(firstQueryValue(req.query.pageSize)),
    query: firstQueryValue(req.query.q),
    ticker: firstQueryValue(req.query.ticker),
    topicId: firstQueryValue(req.query.topicId),
    userSearch: firstQueryValue(req.query.userSearch) === "true",
  };
}

function hasManualRefresh(req: NextApiRequest) {
  return Boolean(firstQueryValue(req.query._refresh));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServerNewsResponse | { error: string }>,
) {
  res.setHeader(
    "Cache-Control",
    hasManualRefresh(req)
      ? "no-store"
      : "s-maxage=900, stale-while-revalidate=1800",
  );

  try {
    const request = makeRequest(req);

    if (!request) {
      return res.status(400).json({ error: "Unsupported market news request" });
    }

    const result = await fetchMarketNewsWithProviders(request);
    return res.status(200).json(result);
  } catch (cause) {
    console.error("Market news provider error", cause);
    return res.status(502).json({
      error:
        cause instanceof Error
          ? cause.message
          : "Market news provider unavailable",
    });
  }
}
