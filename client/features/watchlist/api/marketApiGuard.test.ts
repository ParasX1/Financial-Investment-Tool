import { describe, expect, it } from "@jest/globals";
import {
  createFixedWindowRateLimiter,
  getRequestClientKey,
} from "@/lib/server/marketApiGuard";

describe("market API guard", () => {
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

  it("uses the first forwarded address without trusting arbitrary header text", () => {
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("203.0.113.7");
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": "<script>" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("127.0.0.1");
  });

  it("falls back through real IP, socket address, and the unknown bucket", () => {
    expect(
      getRequestClientKey({
        headers: {
          "x-forwarded-for": "not-an-address",
          "x-real-ip": ["2001:db8::7"],
        },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("2001:db8::7");

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

  it("uses the first entry when a proxy supplies forwarded addresses as an array", () => {
    expect(
      getRequestClientKey({
        headers: { "x-forwarded-for": ["198.51.100.9", "10.0.0.2"] },
        socket: {},
      }),
    ).toBe("198.51.100.9");
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
