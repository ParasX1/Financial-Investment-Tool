import { createServer, type ServerResponse } from "node:http";
import { gzipSync } from "node:zlib";
import {
  BoundedProviderFetchError,
  fetchBoundedProviderResponse,
} from "./boundedProviderFetch";

const providerUrl = "https://provider.example/market";

function fetcherReturning(response: Response) {
  return jest.fn(async () => response) as unknown as jest.MockedFunction<
    typeof fetch
  >;
}

async function withLocalProvider(
  respond: (response: ServerResponse) => void,
  check: (url: string) => Promise<void>,
) {
  const server = createServer((_request, response) => respond(response));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test provider address");
  try {
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe("bounded provider fetch", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a genuine buffered response preserving status, headers and URL", async () => {
    const upstream = new Response('{"value":7}', {
      status: 429,
      statusText: "Limited",
      headers: { "x-provider": "test" },
    });
    Object.defineProperty(upstream, "url", { value: providerUrl });
    const fetcher = fetcherReturning(upstream);
    const response = await fetchBoundedProviderResponse(
      providerUrl,
      { headers: { Accept: "application/json" } },
      { fetcher },
    );
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(429);
    expect(response.statusText).toBe("Limited");
    expect(response.ok).toBe(false);
    expect(response.headers.get("x-provider")).toBe("test");
    expect(response.url).toBe(providerUrl);
    expect(await response.clone().json()).toEqual({ value: 7 });
    expect(await response.text()).toBe('{"value":7}');
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({
      Accept: "application/json",
    });
    expect(upstream.body?.locked).toBe(false);
  });

  it("preserves bodyless responses", async () => {
    const response = await fetchBoundedProviderResponse(
      providerUrl,
      {},
      { fetcher: fetcherReturning(new Response(null, { status: 204 })) },
    );
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("accepts exactly the body limit and rejects streamed bytes beyond it", async () => {
    const accepted = await fetchBoundedProviderResponse(
      providerUrl,
      {},
      { fetcher: fetcherReturning(new Response("four")), maxBytes: 4 },
    );
    expect(await accepted.text()).toBe("four");
    const cancel = jest.fn();
    const upstream = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("abc"));
          controller.enqueue(new TextEncoder().encode("de"));
        },
        cancel,
      }),
    );
    const fetcher = fetcherReturning(upstream);
    await expect(
      fetchBoundedProviderResponse(providerUrl, {}, { fetcher, maxBytes: 4 }),
    ).rejects.toMatchObject({ code: "body-limit" });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(upstream.body?.locked).toBe(false);
  });

  it("measures decoded bytes even when encoded Content-Length is smaller", async () => {
    const upstream = new Response("decoded body", {
      headers: { "content-length": "2", "content-encoding": "gzip" },
    });
    await expect(
      fetchBoundedProviderResponse(
        providerUrl,
        {},
        { fetcher: fetcherReturning(upstream), maxBytes: 4 },
      ),
    ).rejects.toMatchObject({ code: "body-limit" });
  });

  it("rejects a declared oversized body before reading and cancels it", async () => {
    const cancel = jest.fn();
    const upstream = new Response(new ReadableStream<Uint8Array>({ cancel }), {
      headers: { "content-length": "100" },
    });
    await expect(
      fetchBoundedProviderResponse(
        providerUrl,
        {},
        { fetcher: fetcherReturning(upstream), maxBytes: 4 },
      ),
    ).rejects.toMatchObject({ code: "body-limit" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the body limit error when cancellation itself fails", async () => {
    const upstream = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("oversized"));
        },
        cancel() {
          return Promise.reject(new Error("cancel failed"));
        },
      }),
    );
    await expect(
      fetchBoundedProviderResponse(
        providerUrl,
        {},
        { fetcher: fetcherReturning(upstream), maxBytes: 4 },
      ),
    ).rejects.toMatchObject({ code: "body-limit" });
    expect(upstream.body?.locked).toBe(false);
  });

  it("aborts a provider that never supplies headers by the deadline", async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as jest.MockedFunction<typeof fetch>;
    const pending = fetchBoundedProviderResponse(
      providerUrl,
      {},
      { fetcher, timeoutMs: 50 },
    );
    const result = expect(pending).rejects.toMatchObject({ code: "timeout" });
    await jest.advanceTimersByTimeAsync(50);
    await result;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("bounds stalled body completion, cancels and releases the reader", async () => {
    jest.useFakeTimers();
    const cancel = jest.fn();
    const upstream = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("partial"));
        },
        cancel,
      }),
    );
    const fetcher = fetcherReturning(upstream);
    const pending = fetchBoundedProviderResponse(
      providerUrl,
      {},
      { fetcher, timeoutMs: 50 },
    );
    const result = expect(pending).rejects.toMatchObject({ code: "timeout" });
    await jest.advanceTimersByTimeAsync(50);
    await result;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(upstream.body?.locked).toBe(false);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("cancels a late response from a fetcher that ignored abort", async () => {
    jest.useFakeTimers();
    let resolveFetch!: (value: Response) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as typeof fetch;
    const pending = fetchBoundedProviderResponse(
      providerUrl,
      {},
      { fetcher, timeoutMs: 50 },
    );
    const result = expect(pending).rejects.toMatchObject({ code: "timeout" });
    await jest.advanceTimersByTimeAsync(50);
    await result;
    const cancel = jest.fn();
    resolveFetch(new Response(new ReadableStream({ cancel })));
    await Promise.resolve();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not surface a late response's cancellation failure", async () => {
    jest.useFakeTimers();
    let resolveFetch!: (value: Response) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as typeof fetch;
    const pending = fetchBoundedProviderResponse(
      providerUrl,
      {},
      { fetcher, timeoutMs: 50 },
    );
    const result = expect(pending).rejects.toMatchObject({ code: "timeout" });
    await jest.advanceTimersByTimeAsync(50);
    await result;
    resolveFetch(
      new Response(
        new ReadableStream({
          cancel() {
            return Promise.reject(new Error("cancel failed"));
          },
        }),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  it("honors caller abort before fetching and during body completion", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = fetcherReturning(new Response("unused"));
    await expect(
      fetchBoundedProviderResponse(
        new Request(providerUrl, { signal: controller.signal }),
        {},
        { fetcher },
      ),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(fetcher).not.toHaveBeenCalled();

    const caller = new AbortController();
    const cancel = jest.fn();
    const pending = fetchBoundedProviderResponse(
      providerUrl,
      { signal: caller.signal },
      {
        fetcher: fetcherReturning(new Response(new ReadableStream({ cancel }))),
      },
    );
    const result = expect(pending).rejects.toMatchObject({ code: "aborted" });
    await Promise.resolve();
    caller.abort();
    await result;
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("honors an explicit null signal override on a Request input", async () => {
    const caller = new AbortController();
    caller.abort();
    const response = await fetchBoundedProviderResponse(
      new Request(providerUrl, { signal: caller.signal }),
      { signal: null },
      { fetcher: fetcherReturning(new Response("accepted")) },
    );
    expect(await response.text()).toBe("accepted");
  });

  it("propagates provider network failures and clears its deadline", async () => {
    jest.useFakeTimers();
    const error = new Error("network failure");
    const fetcher = jest.fn(async () => {
      throw error;
    }) as typeof fetch;
    await expect(
      fetchBoundedProviderResponse(providerUrl, {}, { fetcher }),
    ).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
    expect(new BoundedProviderFetchError("timeout").message).toBe(
      "Market data provider unavailable",
    );
  });

  it("caps genuinely decoded gzip bytes through native fetch", async () => {
    const compressed = gzipSync("x".repeat(4096));
    expect(compressed.byteLength).toBeLessThan(1024);
    await withLocalProvider(
      (response) => {
        response.writeHead(200, {
          "content-encoding": "gzip",
          "content-length": compressed.byteLength,
        });
        response.end(compressed);
      },
      async (url) => {
        await expect(
          fetchBoundedProviderResponse(url, {}, { maxBytes: 1024 }),
        ).rejects.toMatchObject({ code: "body-limit" });
      },
    );
  });

  it("aborts the real local provider connection while its body stalls", async () => {
    let providerClosed!: () => void;
    const closed = new Promise<void>((resolve) => {
      providerClosed = resolve;
    });
    await withLocalProvider(
      (response) => {
        response.on("close", providerClosed);
        response.writeHead(200);
        response.write("partial");
      },
      async (url) => {
        await expect(
          fetchBoundedProviderResponse(url, {}, { timeoutMs: 200 }),
        ).rejects.toMatchObject({ code: "timeout" });
        await closed;
      },
    );
  });

  it.each([
    { timeoutMs: 0 },
    { timeoutMs: NaN },
    { maxBytes: 0 },
    { maxBytes: 1.5 },
  ])("rejects invalid bounds %p", async (options) => {
    await expect(
      fetchBoundedProviderResponse(providerUrl, {}, options),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
