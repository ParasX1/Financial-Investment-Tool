import { MARKET_PROVIDER_TIMEOUT_MS } from "./marketApiGuard";

type BoundedProviderFetchOptions = {
  fetcher?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
};

export const DEFAULT_PROVIDER_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export class BoundedProviderFetchError extends Error {
  constructor(public readonly code: "timeout" | "body-limit" | "aborted") {
    super("Market data provider unavailable");
    this.name = "BoundedProviderFetchError";
  }
}

/** Bound fetch headers and the decompressed response body with one deadline. */
export async function fetchBoundedProviderResponse(
  input: string | URL | Request,
  init: RequestInit = {},
  options: BoundedProviderFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? MARKET_PROVIDER_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_PROVIDER_BODY_LIMIT_BYTES;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes <= 0
  ) {
    throw new RangeError("Invalid provider fetch bounds");
  }

  const callerSignal =
    init.signal === undefined
      ? input instanceof Request
        ? input.signal
        : undefined
      : init.signal;
  if (callerSignal?.aborted) throw new BoundedProviderFetchError("aborted");
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectDeadline: (reason: BoundedProviderFetchError) => void;
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  const stop = (code: "timeout" | "aborted") => {
    controller.abort();
    rejectDeadline(new BoundedProviderFetchError(code));
  };
  const onCallerAbort = () => stop("aborted");
  const timer = setTimeout(() => stop("timeout"), timeoutMs);
  callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

  const work = async () => {
    const response = await (options.fetcher ?? fetch)(input, {
      ...init,
      signal: controller.signal,
    });
    // A late response from a fetcher that ignored abort must not start new body work.
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => undefined);
      throw new BoundedProviderFetchError("aborted");
    }
    reader = response.body?.getReader();
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new BoundedProviderFetchError("body-limit");
    }

    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new BoundedProviderFetchError("body-limit");
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const buffered = new Response(response.body === null ? null : bytes, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
    Object.defineProperty(buffered, "url", { value: response.url });
    return buffered;
  };

  try {
    return await Promise.race([work(), deadline]);
  } catch (error: unknown) {
    controller.abort();
    // Do not wait for a stalled stream's cancellation to complete the request.
    void reader?.cancel().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
    reader?.releaseLock();
  }
}
