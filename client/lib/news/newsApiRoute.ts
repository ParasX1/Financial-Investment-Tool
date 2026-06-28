import type { NextApiRequest, NextApiResponse } from "next";
import {
  applyMarketNewsRequestPrivacy,
  getMarketNewsCacheControl,
} from "./marketNewsRequestPolicy";
import { fetchMarketNewsWithProviders } from "./newsService";
import { normaliseNewsPageSize } from "./providerUtils";
import type { ServerNewsRequest, ServerNewsResponse } from "./types";

export type NewsApiErrorResponse = { error: string };

export const MARKET_NEWS_UNAVAILABLE_ERROR =
  "Market news is temporarily unavailable.";
export const MARKET_NEWS_ERROR_CACHE_CONTROL = "private, no-store, max-age=0";

type MarketNewsRouteOptions = {
  buildRequest: (req: NextApiRequest) => ServerNewsRequest | null;
  errorLogLabel: string;
  unsupportedError?: string;
  validate?: (request: ServerNewsRequest) => string | null;
};

export function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readNewsPageSize(req: NextApiRequest) {
  return normaliseNewsPageSize(firstQueryValue(req.query.pageSize));
}

export function hasManualRefresh(req: NextApiRequest) {
  return Boolean(firstQueryValue(req.query._refresh));
}

export function sendMarketNewsUnavailable(
  res: NextApiResponse<ServerNewsResponse | NewsApiErrorResponse>,
  logLabel: string,
  cause: unknown,
) {
  console.error(logLabel, cause);
  res.setHeader("Cache-Control", MARKET_NEWS_ERROR_CACHE_CONTROL);
  return res.status(502).json({ error: MARKET_NEWS_UNAVAILABLE_ERROR });
}

export async function handleMarketNewsRoute(
  req: NextApiRequest,
  res: NextApiResponse<ServerNewsResponse | NewsApiErrorResponse>,
  {
    buildRequest,
    errorLogLabel,
    unsupportedError = "Unsupported market news request",
    validate,
  }: MarketNewsRouteOptions,
) {
  try {
    const builtRequest = buildRequest(req);

    if (!builtRequest) {
      return res.status(400).json({ error: unsupportedError });
    }

    const request = applyMarketNewsRequestPrivacy(builtRequest);
    const validationError = validate?.(request);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    res.setHeader(
      "Cache-Control",
      getMarketNewsCacheControl({
        manualRefresh: hasManualRefresh(req),
        request,
      }),
    );

    const result = await fetchMarketNewsWithProviders(request);
    return res.status(200).json(result);
  } catch (cause) {
    return sendMarketNewsUnavailable(res, errorLogLabel, cause);
  }
}
