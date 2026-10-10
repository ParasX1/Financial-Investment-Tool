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
  if (!address || !isIP(address) || address.includes("%")) return null;
  if (isIP(address) === 4) return address;

  // URL canonicalization collapses equivalent IPv6 spellings before bucket lookup.
  const normalized = new URL(`http://[${address}]`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
  if (!mapped) return normalized;
  const high = parseInt(mapped[1], 16);
  const low = parseInt(mapped[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function configuredTrustedProxyIps(): readonly string[] {
  const configured = process.env.MARKET_TRUSTED_PROXY_IPS;
  return configured ? configured.split(",") : [];
}

function configuredTrustedProxyHeader():
  | "x-forwarded-for"
  | "x-real-ip"
  | null {
  const header = process.env.MARKET_TRUSTED_PROXY_HEADER ?? "x-forwarded-for";
  return header === "x-forwarded-for" || header === "x-real-ip" ? header : null;
}

export function getRequestClientKey(
  request: RequestIdentity,
  trustedProxyIps: readonly string[] = configuredTrustedProxyIps(),
): string {
  const peer = safeClientAddress(request.socket?.remoteAddress);
  if (!peer) return "unknown";
  const trusted = trustedProxyIps.map(safeClientAddress);
  // A malformed configuration disables header trust rather than partially enabling it.
  if (trusted.length > 64 || trusted.some((address) => address === null))
    return peer;
  const trustedPeers = new Set(trusted);
  if (!trustedPeers.has(peer)) return peer;

  const proxyHeader = configuredTrustedProxyHeader();
  if (!proxyHeader) return peer;
  if (proxyHeader === "x-real-ip") {
    const realIp = request.headers["x-real-ip"];
    const realAddress = Array.isArray(realIp) ? realIp.join(",") : realIp;
    return safeClientAddress(realAddress) ?? peer;
  }

  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded !== undefined) {
    const raw = Array.isArray(forwarded) ? forwarded.join(",") : forwarded;
    if (raw.length > 2_048) return peer;
    const chain = raw.split(",").map(safeClientAddress);
    if (!chain.length || chain.length > 32 || chain.some((address) => !address))
      return peer;

    // The nearest untrusted hop is the client. Entries further left are user input.
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const address = chain[index]!;
      if (!trustedPeers.has(address) || index === 0) return address;
    }
  }

  return peer;
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
