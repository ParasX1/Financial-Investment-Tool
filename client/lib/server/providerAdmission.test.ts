import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  ProviderAdmission,
  fetchAdmittedProviderResponse,
} from "./providerAdmission";

describe("process-local provider admission", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    [0, 1],
    [1.5, 1],
    [1, -1],
    [1, 1.5],
  ])("rejects invalid active/queue bounds %s/%s", (active, queued) => {
    expect(() => new ProviderAdmission(active, queued)).toThrow(RangeError);
  });

  it("rejects expired, invalid and already aborted admission without consuming a permit", async () => {
    const admission = new ProviderAdmission(1, 0);
    const deadlineAt = Date.now() + 100;
    await expect(admission.acquire({ deadlineAt: Infinity })).rejects.toThrow(
      RangeError,
    );
    await expect(
      admission.acquire({ deadlineAt: Date.now() }),
    ).rejects.toMatchObject({ code: "timeout" });
    await expect(
      admission.acquire({ deadlineAt, signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ code: "aborted" });
    const release = await admission.acquire({ deadlineAt });
    release();
  });

  it("grants FIFO permits and makes release idempotent", async () => {
    const admission = new ProviderAdmission(1, 2);
    const deadlineAt = Date.now() + 100;
    const first = await admission.acquire({ deadlineAt });
    const order: number[] = [];
    const second = admission.acquire({ deadlineAt }).then((release) => {
      order.push(2);
      return release;
    });
    const third = admission.acquire({ deadlineAt }).then((release) => {
      order.push(3);
      return release;
    });
    first();
    first();
    const secondRelease = await second;
    expect(order).toEqual([2]);
    secondRelease();
    const thirdRelease = await third;
    expect(order).toEqual([2, 3]);
    thirdRelease();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("rejects a full queue, removes an aborted waiter, and admits its replacement", async () => {
    const admission = new ProviderAdmission(1, 1);
    const deadlineAt = Date.now() + 100;
    const first = await admission.acquire({ deadlineAt });
    const caller = new AbortController();
    const removeListener = jest.spyOn(caller.signal, "removeEventListener");
    const abandoned = admission.acquire({ deadlineAt, signal: caller.signal });
    const abandonedCheck = expect(abandoned).rejects.toMatchObject({
      code: "aborted",
    });
    await expect(admission.acquire({ deadlineAt })).rejects.toMatchObject({
      code: "busy",
    });
    caller.abort();
    await abandonedCheck;
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    const replacement = admission.acquire({ deadlineAt });
    first();
    const replacementRelease = await replacement;
    replacementRelease();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("expires queued work without fetching and reuses queue capacity", async () => {
    const admission = new ProviderAdmission(1, 1);
    const first = await admission.acquire({ deadlineAt: Date.now() + 100 });
    const fetcher = jest.fn(async () => new Response("ok"));
    const queued = fetchAdmittedProviderResponse(
      "https://example.com/feed",
      {},
      {
        admission,
        fetcher,
        timeoutMs: 10,
      },
    );
    const queuedCheck = expect(queued).rejects.toMatchObject({
      code: "timeout",
    });
    await jest.advanceTimersByTimeAsync(11);
    await queuedCheck;
    expect(fetcher).not.toHaveBeenCalled();
    const replacement = admission.acquire({ deadlineAt: Date.now() + 100 });
    first();
    (await replacement)();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not start an expired waiter when release and expiry share an event-loop turn", async () => {
    const admission = new ProviderAdmission(1, 1);
    const first = await admission.acquire({ deadlineAt: Date.now() + 100 });
    const second = admission.acquire({ deadlineAt: Date.now() + 10 });
    const secondCheck = expect(second).rejects.toMatchObject({
      code: "timeout",
    });
    jest.setSystemTime(Date.now() + 10);
    first();
    await secondCheck;
    const release = await admission.acquire({ deadlineAt: Date.now() + 100 });
    release();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("charges queue wait against the same header/body deadline", async () => {
    const admission = new ProviderAdmission(1, 1);
    const first = await admission.acquire({ deadlineAt: Date.now() + 200 });
    const cancel = jest.fn(() => undefined);
    const fetcher = jest.fn(
      async () => new Response(new ReadableStream({ cancel })),
    );
    const second = fetchAdmittedProviderResponse(
      "https://example.com/feed",
      {},
      {
        admission,
        fetcher,
        timeoutMs: 100,
      },
    );
    const secondCheck = expect(second).rejects.toMatchObject({
      code: "timeout",
    });
    await jest.advanceTimersByTimeAsync(40);
    first();
    await jest.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60);
    await secondCheck;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    (await admission.acquire({ deadlineAt: Date.now() + 100 }))();
  });

  it.each(["network", "body-limit", "aborted"])(
    "releases active capacity after %s failure",
    async (failure) => {
      const admission = new ProviderAdmission(1, 1);
      const caller = new AbortController();
      const failed = fetchAdmittedProviderResponse(
        "https://example.com/feed",
        { signal: caller.signal },
        {
          admission,
          maxBytes: 4,
          fetcher: async () => {
            if (failure === "network") throw new Error("provider offline");
            return failure === "body-limit"
              ? new Response("oversized")
              : new Response(new ReadableStream());
          },
        },
      );
      const failedCheck = expect(failed).rejects.toThrow();
      await jest.advanceTimersByTimeAsync(1);
      if (failure === "aborted") caller.abort();
      await failedCheck;
      const response = await fetchAdmittedProviderResponse(
        "https://example.com/feed",
        {},
        {
          admission,
          fetcher: async () =>
            new Response('{"ok":true}', {
              headers: { "X-Provider": "fixture" },
            }),
        },
      );
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("X-Provider")).toBe("fixture");
      expect(await response.clone().json()).toEqual({ ok: true });
      expect(await response.text()).toBe('{"ok":true}');
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it("preserves a Request's abort signal before admission", async () => {
    const caller = new AbortController();
    const input = new Request("https://example.com/feed", {
      signal: caller.signal,
    });
    caller.abort();
    const fetcher = jest.fn(async () => new Response("ok"));
    await expect(
      fetchAdmittedProviderResponse(input, {}, { fetcher }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([0, -1, Infinity])(
    "rejects invalid duration %s before dispatch",
    async (timeoutMs) => {
      const fetcher = jest.fn(async () => new Response("ok"));
      await expect(
        fetchAdmittedProviderResponse(
          "https://example.com/feed",
          {},
          { fetcher, timeoutMs },
        ),
      ).rejects.toMatchObject({ code: "timeout" });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
