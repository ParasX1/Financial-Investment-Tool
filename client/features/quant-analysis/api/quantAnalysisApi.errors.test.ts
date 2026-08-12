import {
  QuantAnalysisApiError,
  fetchQuantCapabilities,
} from "./quantAnalysisApi";

const originalFetch = global.fetch;

describe("quant API safe error fallbacks", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses bounded defaults for an unreadable error response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    }) as typeof fetch;

    await expect(fetchQuantCapabilities()).rejects.toMatchObject({
      name: "QuantAnalysisApiError",
      code: "REQUEST_FAILED",
      message: "Quant Analysis is temporarily unavailable. Please try again.",
      status: 502,
      fields: undefined,
      traceId: undefined,
      retryAfterSeconds: undefined,
    } satisfies Partial<QuantAnalysisApiError>);
  });

  it("filters unsafe fields and preserves a finite retry delay", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => "7" },
      json: async () => ({
        error: {
          code: " RATE_LIMITED ",
          message: " Please retry shortly. ",
          traceId: " trace-429 ",
          fields: {
            symbol: " Try another symbol. ",
            ignoredNumber: 12,
            ignoredBlank: "   ",
          },
        },
      }),
    }) as typeof fetch;

    await expect(fetchQuantCapabilities()).rejects.toMatchObject({
      code: "RATE_LIMITED",
      message: "Please retry shortly.",
      traceId: "trace-429",
      fields: { symbol: "Try another symbol." },
      retryAfterSeconds: 7,
    } satisfies Partial<QuantAnalysisApiError>);
  });

  it("ignores a negative retry delay and an empty field map", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => "-1" },
      json: async () => ({ error: { fields: { ignored: false } } }),
    }) as typeof fetch;

    await expect(fetchQuantCapabilities()).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      fields: undefined,
      retryAfterSeconds: undefined,
    } satisfies Partial<QuantAnalysisApiError>);
  });
});
