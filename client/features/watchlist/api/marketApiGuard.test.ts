import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import {
  createFixedWindowRateLimiter,
  getRequestClientKey,
} from "@/lib/server/marketApiGuard";

describe("market API guard", () => {
  const originalTrustedProxies = process.env.MARKET_TRUSTED_PROXY_IPS;
  const originalTrustedHeader = process.env.MARKET_TRUSTED_PROXY_HEADER;
  beforeEach(() => {
    delete process.env.MARKET_TRUSTED_PROXY_IPS;
    delete process.env.MARKET_TRUSTED_PROXY_HEADER;
  });
  afterEach(() => {
    if (originalTrustedProxies === undefined)
      delete process.env.MARKET_TRUSTED_PROXY_IPS;
    else process.env.MARKET_TRUSTED_PROXY_IPS = originalTrustedProxies;
    if (originalTrustedHeader === undefined)
      delete process.env.MARKET_TRUSTED_PROXY_HEADER;
    else process.env.MARKET_TRUSTED_PROXY_HEADER = originalTrustedHeader;
  });
  it("limits each client inside a fixed window and resets afterwards", () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({
      limit: 2,
      now: () => now,
      windowMs: 1_000,
    });

    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(false);
    expect(limiter.allow("client-b")).toBe(true);

    now = 2_001;
    expect(limiter.allow("client-a")).toBe(true);
  });

  it("charges fan-out requests by their bounded upstream cost", () => {
    const limiter = createFixedWindowRateLimiter({
      limit: 4,
      now: () => 1_000,
      windowMs: 1_000,
    });

    expect(limiter.allow("client-a", 3)).toBe(true);
    expect(limiter.allow("client-a", 2)).toBe(false);
    expect(limiter.allow("client-a", 1)).toBe(true);
    expect(limiter.allow("client-a")).toBe(false);
  });

  it("uses the TCP peer despite valid forged forwarding headers", () => {
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("127.0.0.1");
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": "<script>" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("127.0.0.1");
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": "deadbeef" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("127.0.0.1");
  });

  it("ignores real IP unless the peer is explicitly trusted", () => {
    expect(
      getRequestClientKey({
        headers: {
          "x-forwarded-for": "not-an-address",
          "x-real-ip": ["2001:db8::7"],
        },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("127.0.0.1");

    expect(
      getRequestClientKey({
        headers: { "x-real-ip": "also invalid" },
        socket: { remoteAddress: "::1" },
      }),
    ).toBe("::1");

    expect(
      getRequestClientKey({
        headers: {},
        socket: { remoteAddress: "<script>" },
      }),
    ).toBe("unknown");
  });

  it("cannot identify a missing peer using forwarding headers", () => {
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": ["198.51.100.9", "10.0.0.2"] },
        socket: {},
      }),
    ).toBe("unknown");
  });

  it("does not let rotated spoofed headers renew a peer's admission bucket", () => {
    const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000 });
    const allowed = ["203.0.113.1", "203.0.113.2", "203.0.113.3"].map(
      (address) =>
        limiter.allow(
          getRequestClientKey({
            headers: { "x-forwarded-for": address, "x-real-ip": address },
            socket: { remoteAddress: "198.51.100.10" },
          }),
        ),
    );
    expect(allowed).toEqual([true, true, false]);
  });

  it("compares socket defaults and explicit trusted peers on the same fixture", () => {
    const request = {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.2" },
      socket: { remoteAddress: "10.0.0.1" },
    };
    expect(getRequestClientKey(request)).toBe("10.0.0.1");
    expect(getRequestClientKey(request, ["10.0.0.1", "10.0.0.2"])).toBe(
      "203.0.113.7",
    );
    expect(getRequestClientKey(request, ["10.0.0.2"])).toBe("10.0.0.1");
  });

  it("stops at the nearest untrusted hop instead of accepting a spoofed prefix", () => {
    const request = {
      headers: {
        "x-forwarded-for": ["203.0.113.99, 198.51.100.7", "10.0.0.2"],
      },
      socket: { remoteAddress: "::ffff:10.0.0.1" },
    };
    expect(getRequestClientKey(request, ["10.0.0.1", "10.0.0.2"])).toBe(
      "198.51.100.7",
    );
    expect(
      getRequestClientKey(
        { ...request, headers: { "x-forwarded-for": "10.0.0.2" } },
        ["10.0.0.1", "10.0.0.2"],
      ),
    ).toBe("10.0.0.2");
  });

  it.each([
    "198.51.100.7, invalid",
    "198.51.100.7,",
    "",
    "1".repeat(2049),
    Array(33).fill("10.0.0.2").join(","),
  ])("fails closed on an invalid or oversized full chain %#", (forwarded) => {
    expect(
      getRequestClientKey(
        {
          headers: {
            "x-forwarded-for": forwarded,
            "x-real-ip": "203.0.113.99",
          },
          socket: { remoteAddress: "10.0.0.1" },
        },
        ["10.0.0.1"],
      ),
    ).toBe("10.0.0.1");
  });

  it("accepts one overwritten real IP only in explicitly selected trusted mode", () => {
    process.env.MARKET_TRUSTED_PROXY_HEADER = "x-real-ip";
    const request = {
      headers: { "x-real-ip": ["2001:0DB8:0:0:0:0:0:7"] },
      socket: { remoteAddress: "10.0.0.1" },
    };
    expect(getRequestClientKey(request, ["10.0.0.1"])).toBe("2001:db8::7");
    expect(
      getRequestClientKey(
        {
          ...request,
          headers: { "x-real-ip": ["203.0.113.7", "203.0.113.8"] },
        },
        ["10.0.0.1"],
      ),
    ).toBe("10.0.0.1");
    expect(getRequestClientKey({ ...request, headers: {} }, ["10.0.0.1"])).toBe(
      "10.0.0.1",
    );
  });

  it("honors configured XRealIP after Next.js fills absent XFF from the socket", () => {
    process.env.MARKET_TRUSTED_PROXY_IPS = "10.0.0.1";
    process.env.MARKET_TRUSTED_PROXY_HEADER = "x-real-ip";
    const headers: Record<string, string | undefined> = {
      "x-real-ip": "198.51.100.7",
    };
    const request = { headers, socket: { remoteAddress: "10.0.0.1" } };
    // Next 15.5.27 base-server.js populates this before the API handler sees req.
    headers["x-forwarded-for"] ??= request.socket.remoteAddress;
    expect(getRequestClientKey(request)).toBe("198.51.100.7");
  });

  it("keeps verified proxy clients in separate buckets after Next header population", () => {
    process.env.MARKET_TRUSTED_PROXY_IPS = "10.0.0.1";
    process.env.MARKET_TRUSTED_PROXY_HEADER = "x-real-ip";
    const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 1000 });
    const admitted = ["198.51.100.7", "198.51.100.8", "198.51.100.7"].map(
      (client) => {
        const headers: Record<string, string | undefined> = {
          "x-real-ip": client,
        };
        const request = { headers, socket: { remoteAddress: "10.0.0.1" } };
        headers["x-forwarded-for"] ??= request.socket.remoteAddress;
        return limiter.allow(getRequestClientKey(request));
      },
    );
    expect(admitted).toEqual([true, true, false]);
  });

  it("does not let forged headers change an untrusted peer in either selected mode", () => {
    for (const mode of ["x-forwarded-for", "x-real-ip"]) {
      process.env.MARKET_TRUSTED_PROXY_HEADER = mode;
      process.env.MARKET_TRUSTED_PROXY_IPS = "10.0.0.1";
      const limiter = createFixedWindowRateLimiter({
        limit: 1,
        windowMs: 1000,
      });
      const admitted = ["203.0.113.7", "203.0.113.8"].map((forged) =>
        limiter.allow(
          getRequestClientKey({
            headers: { "x-forwarded-for": forged, "x-real-ip": forged },
            socket: { remoteAddress: "198.51.100.7" },
          }),
        ),
      );
      expect(admitted).toEqual([true, false]);
    }
  });

  it("uses only the explicitly selected header from a verified trusted peer", () => {
    const request = {
      headers: {
        "x-forwarded-for": "198.51.100.7",
        "x-real-ip": "203.0.113.99",
      },
      socket: { remoteAddress: "10.0.0.1" },
    };
    expect(getRequestClientKey(request, ["10.0.0.1"])).toBe("198.51.100.7");
    expect(
      getRequestClientKey(
        { ...request, headers: { "x-real-ip": "203.0.113.99" } },
        ["10.0.0.1"],
      ),
    ).toBe("10.0.0.1");
    process.env.MARKET_TRUSTED_PROXY_HEADER = "x-real-ip";
    expect(
      getRequestClientKey(
        {
          ...request,
          headers: {
            "x-forwarded-for": "malformed",
            "x-real-ip": "198.51.100.7",
          },
        },
        ["10.0.0.1"],
      ),
    ).toBe("198.51.100.7");
    expect(
      getRequestClientKey(
        {
          ...request,
          headers: {
            "x-forwarded-for": "203.0.113.99",
            "x-real-ip": "malformed",
          },
        },
        ["10.0.0.1"],
      ),
    ).toBe("10.0.0.1");
    process.env.MARKET_TRUSTED_PROXY_HEADER = "forwarded";
    expect(getRequestClientKey(request, ["10.0.0.1"])).toBe("10.0.0.1");
  });

  it.each(["::ffff:192.0.2.7", "0:0:0:0:0:ffff:c000:207", "192.0.2.7"])(
    "canonicalizes mapped IPv4 and IPv4 identities %s",
    (remoteAddress) => {
      expect(
        getRequestClientKey({ headers: {}, socket: { remoteAddress } }),
      ).toBe("192.0.2.7");
    },
  );

  it("canonicalizes equivalent IPv6 peers and ignores unusable scoped addresses", () => {
    expect(
      getRequestClientKey({
        headers: {},
        socket: { remoteAddress: "2001:0DB8:0:0:0:0:0:7" },
      }),
    ).toBe("2001:db8::7");
    expect(
      getRequestClientKey({
        headers: {},
        socket: { remoteAddress: "fe80::1%eth0" },
      }),
    ).toBe("unknown");
  });

  it("uses a validated exact-IP environment allowlist and fails closed on mistakes", () => {
    const request = {
      headers: { "x-forwarded-for": "203.0.113.7" },
      socket: { remoteAddress: "10.0.0.1" },
    };
    process.env.MARKET_TRUSTED_PROXY_IPS = "::ffff:10.0.0.1, 10.0.0.2";
    expect(getRequestClientKey(request)).toBe("203.0.113.7");
    process.env.MARKET_TRUSTED_PROXY_IPS = "10.0.0.1,broken";
    expect(getRequestClientKey(request)).toBe("10.0.0.1");
    expect(getRequestClientKey(request, Array(65).fill("10.0.0.1"))).toBe(
      "10.0.0.1",
    );
  });

  it("caps stored client buckets by evicting the oldest key", () => {
    const limiter = createFixedWindowRateLimiter({
      limit: 1,
      maxKeys: 2,
      now: () => 1_000,
      windowMs: 10_000,
    });

    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-b")).toBe(true);
    expect(limiter.allow("client-a")).toBe(false);

    expect(limiter.allow("client-c")).toBe(true);
    expect(limiter.allow("client-a")).toBe(true);
  });

  it("removes expired buckets before evicting an active client", () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({
      limit: 1,
      maxKeys: 2,
      now: () => now,
      windowMs: 1_000,
    });

    expect(limiter.allow("expired-a")).toBe(true);
    expect(limiter.allow("expired-b")).toBe(true);

    now = 2_000;
    expect(limiter.allow("new-client")).toBe(true);
    expect(limiter.allow("expired-b")).toBe(true);
  });
});
