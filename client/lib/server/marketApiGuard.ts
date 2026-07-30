import { isIP } from "node:net";

type RequestIdentity = {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string | undefined };
};

type RateLimiterOptions = {
  limit: number;
  maxKeys?: number;
  now?: () => number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

function safeClientAddress(value: string | undefined): string | null {
  const address = value?.trim();
  return address && isIP(address) ? address : null;
}

export function getRequestClientKey(request: RequestIdentity): string {
  const forwarded = request.headers["x-forwarded-for"];
  const forwardedAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0];
  const realIp = request.headers["x-real-ip"];
  const realAddress = Array.isArray(realIp) ? realIp[0] : realIp;

  return (
    safeClientAddress(forwardedAddress) ??
    safeClientAddress(realAddress) ??
    safeClientAddress(request.socket.remoteAddress) ??
    "unknown"
  );
}

export function createFixedWindowRateLimiter({
  limit,
  maxKeys = 2_000,
  now = Date.now,
  windowMs,
}: RateLimiterOptions) {
  const buckets = new Map<string, RateLimitBucket>();

  function removeExpired(currentTime: number) {
    for (const [key, bucket] of Array.from(buckets.entries())) {
      if (bucket.resetAt <= currentTime) buckets.delete(key);
    }
  }

  return {
    allow(key: string, requestedCost = 1) {
      const cost =
        Number.isFinite(requestedCost) && requestedCost > 0
          ? Math.floor(requestedCost)
          : 1;
      if (cost > limit) return false;

      const currentTime = now();
      const bucket = buckets.get(key);

      if (bucket && bucket.resetAt > currentTime) {
        if (bucket.count + cost > limit) return false;
        buckets.set(key, { ...bucket, count: bucket.count + cost });
        return true;
      }

      if (buckets.size >= maxKeys) removeExpired(currentTime);
      while (buckets.size >= maxKeys) {
        const oldestKey = buckets.keys().next().value as string | undefined;
        if (!oldestKey) break;
        buckets.delete(oldestKey);
      }

      buckets.set(key, { count: cost, resetAt: currentTime + windowMs });
      return true;
    },
  };
}

export const marketApiRateLimiter = createFixedWindowRateLimiter({
  limit: 60,
  windowMs: 60_000,
});

export const marketNewsApiRateLimiter = createFixedWindowRateLimiter({
  limit: 20,
  windowMs: 60_000,
});

export const MARKET_API_RETRY_AFTER_SECONDS = 60;
export const MARKET_PROVIDER_TIMEOUT_MS = 5_000;
