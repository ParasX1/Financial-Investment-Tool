import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { API_BASE } from "@/lib/apiBase";
import { subscribeToTopPicksUpdates } from "./subscribeToTopPicksUpdates";

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly listeners = new Map<string, Set<EventListener>>();
  readonly close = jest.fn<() => void>();

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, value: unknown) {
    const event = { type, data: JSON.stringify(value) } as MessageEvent<string>;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

const originalEventSource = Object.getOwnPropertyDescriptor(
  globalThis,
  "EventSource",
);

describe("subscribeToTopPicksUpdates", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    Object.defineProperty(globalThis, "EventSource", {
      configurable: true,
      value: MockEventSource,
    });
  });

  afterEach(() => {
    if (originalEventSource) {
      Object.defineProperty(globalThis, "EventSource", originalEventSource);
    } else {
      Reflect.deleteProperty(globalThis, "EventSource");
    }
  });

  it("reads completed snapshots and catches up after reconnecting", () => {
    const onUpdate = jest.fn<() => void>();
    const stop = subscribeToTopPicksUpdates({
      window: "1M",
      onUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    const events = MockEventSource.instances[0];
    expect(events.url).toBe(`${API_BASE}/api/top-picks/events?window=1M`);

    events.emit("connected", { revision: 0, window: "1M" });
    events.emit("snapshot", {
      revision: 1,
      window: "1M",
      generatedAt: "2026-10-04T00:00:00Z",
    });
    events.emit("snapshot", { revision: 1, window: "1M" });
    expect(onUpdate).toHaveBeenCalledTimes(2);

    events.emit("connected", { revision: 1, window: "1M" });
    expect(onUpdate).toHaveBeenCalledTimes(3);
    // A backend restart can begin a new revision sequence.
    events.emit("connected", { revision: 0, window: "1M" });
    events.emit("snapshot", { revision: 1, window: "1M" });
    expect(onUpdate).toHaveBeenCalledTimes(5);
    stop();
  });

  it("ignores malformed and other-window messages", () => {
    const onUpdate = jest.fn<() => void>();
    const stop = subscribeToTopPicksUpdates({
      window: "1Y",
      onUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    const events = MockEventSource.instances[0];
    [
      null,
      [],
      {},
      { revision: -1, window: "1Y" },
      { revision: 1.5, window: "1Y" },
      { revision: "1", window: "1Y" },
      { revision: 1, window: "1D" },
    ].forEach((value) => events.emit("snapshot", value));
    events.listeners
      .get("snapshot")!
      .forEach((listener) =>
        listener({
          type: "snapshot",
          data: "invalid JSON",
        } as MessageEvent<string>),
      );
    expect(onUpdate).not.toHaveBeenCalled();
    stop();
  });

  it("reports refresh failures without exposing details and closes every listener", () => {
    const onUpdate = jest.fn<() => void>();
    const onRefreshError = jest.fn<() => void>();
    const stop = subscribeToTopPicksUpdates({
      window: "1Y",
      onUpdate,
      onRefreshError,
    });
    const events = MockEventSource.instances[0];
    events.emit("refresh-error", { window: "1M" });
    events.emit("refresh-error", {
      window: "1Y",
      error: "private backend details",
    });
    expect(onRefreshError.mock.calls).toEqual([[]]);

    stop();
    expect(events.close).toHaveBeenCalledTimes(1);
    events.emit("connected", { revision: 1, window: "1Y" });
    events.emit("snapshot", { revision: 2, window: "1Y" });
    events.emit("refresh-error", { window: "1Y" });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onRefreshError).toHaveBeenCalledTimes(1);
    expect(
      [...events.listeners.values()].every((listeners) => !listeners.size),
    ).toBe(true);
  });

  it("does not open a connection outside browsers", () => {
    Reflect.deleteProperty(globalThis, "EventSource");
    const stop = subscribeToTopPicksUpdates({
      window: "1Y",
      onUpdate: jest.fn<() => void>(),
      onRefreshError: jest.fn<() => void>(),
    });
    expect(MockEventSource.instances).toHaveLength(0);
    expect(() => stop()).not.toThrow();
  });
});
