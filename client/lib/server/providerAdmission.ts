import { fetchBoundedProviderResponse } from "./boundedProviderFetch";
import { MARKET_PROVIDER_TIMEOUT_MS } from "./marketApiGuard";

export const NEWS_PROVIDER_MAX_ACTIVE = 8;
export const NEWS_PROVIDER_MAX_QUEUED = 64;

export class ProviderAdmissionError extends Error {
  constructor(public readonly code: "busy" | "timeout" | "aborted") {
    super("Market data provider unavailable");
    this.name = "ProviderAdmissionError";
  }
}

type AdmissionOptions = { deadlineAt: number; signal?: AbortSignal | null };
type QueuedAdmission = { start: () => void };

/** A bounded FIFO within one server process; no cross-instance quota is implied. */
export class ProviderAdmission {
  private active = 0;
  private readonly queue: QueuedAdmission[] = [];

  constructor(
    private readonly maxActive = NEWS_PROVIDER_MAX_ACTIVE,
    private readonly maxQueued = NEWS_PROVIDER_MAX_QUEUED,
  ) {
    if (
      !Number.isSafeInteger(maxActive) ||
      maxActive < 1 ||
      !Number.isSafeInteger(maxQueued) ||
      maxQueued < 0
    ) {
      throw new RangeError("Invalid provider admission bounds");
    }
  }

  private releasePermit() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      while (this.active < this.maxActive && this.queue.length) {
        this.queue.shift()!.start();
      }
    };
  }

  acquire({ deadlineAt, signal }: AdmissionOptions): Promise<() => void> {
    if (!Number.isFinite(deadlineAt)) {
      return Promise.reject(new RangeError("Invalid provider deadline"));
    }
    if (signal?.aborted) {
      return Promise.reject(new ProviderAdmissionError("aborted"));
    }
    if (deadlineAt <= Date.now()) {
      return Promise.reject(new ProviderAdmissionError("timeout"));
    }
    if (this.active < this.maxActive) {
      this.active += 1;
      return Promise.resolve(this.releasePermit());
    }
    if (this.queue.length >= this.maxQueued) {
      return Promise.reject(new ProviderAdmissionError("busy"));
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      const fail = (code: "timeout" | "aborted") => {
        const index = this.queue.indexOf(queued);
        if (index < 0) return;
        this.queue.splice(index, 1);
        cleanup();
        reject(new ProviderAdmissionError(code));
      };
      const onAbort = () => fail("aborted");
      const queued: QueuedAdmission = {
        start: () => {
          cleanup();
          // A release and a deadline can become ready on the same event-loop turn.
          if (signal?.aborted || deadlineAt <= Date.now()) {
            reject(
              new ProviderAdmissionError(
                signal?.aborted ? "aborted" : "timeout",
              ),
            );
            return;
          }
          this.active += 1;
          resolve(this.releasePermit());
        },
      };
      const timer = setTimeout(() => fail("timeout"), deadlineAt - Date.now());
      signal?.addEventListener("abort", onAbort, { once: true });
      this.queue.push(queued);
    });
  }
}

// Pages API routes can have separate module bundles in the same process.
const providerGlobal = globalThis as typeof globalThis & {
  __fitNewsProviderAdmissionV1?: ProviderAdmission;
};
const sharedAdmission =
  providerGlobal.__fitNewsProviderAdmissionV1 ?? new ProviderAdmission();
providerGlobal.__fitNewsProviderAdmissionV1 = sharedAdmission;

export async function fetchAdmittedProviderResponse(
  input: string | URL | Request,
  init: RequestInit = {},
  {
    admission = sharedAdmission,
    fetcher = fetch,
    maxBytes,
    timeoutMs = MARKET_PROVIDER_TIMEOUT_MS,
  }: {
    admission?: ProviderAdmission;
    fetcher?: typeof fetch;
    maxBytes?: number;
    timeoutMs?: number;
  } = {},
): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ProviderAdmissionError("timeout");
  }
  const deadlineAt = Date.now() + timeoutMs;
  const signal =
    init.signal === undefined && input instanceof Request
      ? input.signal
      : init.signal;
  const release = await admission.acquire({ deadlineAt, signal });
  try {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) throw new ProviderAdmissionError("timeout");
    // Queueing, headers and decoded body consume the same per-call budget.
    return await fetchBoundedProviderResponse(input, init, {
      fetcher,
      maxBytes,
      timeoutMs: remainingMs,
    });
  } finally {
    release();
  }
}
