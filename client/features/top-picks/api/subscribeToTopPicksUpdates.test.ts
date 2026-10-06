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
const subscriptionsToClose: (() => void)[] = [];
const subscribe = (
  options: Parameters<typeof subscribeToTopPicksUpdates>[0],
) => {
  const stop = subscribeToTopPicksUpdates(options);
  subscriptionsToClose.push(stop);
  return stop;
};

describe("subscribeToTopPicksUpdates", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    Object.defineProperty(globalThis, "EventSource", {
      configurable: true,
      value: MockEventSource,
    });
  });

  afterEach(() => {
    subscriptionsToClose.splice(0).forEach((stop) => stop());
    if (originalEventSource) {
      Object.defineProperty(globalThis, "EventSource", originalEventSource);
    } else {
      Reflect.deleteProperty(globalThis, "EventSource");
    }
  });

  it("reads completed snapshots and catches up after reconnecting", () => {
    const onUpdate = jest.fn<() => void>();
    const stop = subscribe({
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
    const stop = subscribe({
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
    events.listeners.get("snapshot")!.forEach((listener) =>
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
    const stop = subscribe({
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
    const stop = subscribe({
      window: "1Y",
      onUpdate: jest.fn<() => void>(),
      onRefreshError: jest.fn<() => void>(),
    });
    expect(MockEventSource.instances).toHaveLength(0);
    expect(() => stop()).not.toThrow();
  });

  it("shares a background stream with page listeners until the last listener leaves", () => {
    const backgroundUpdate = jest.fn<() => void>();
    const pageUpdate = jest.fn<() => void>();
    const stopBackground = subscribe({
      window: "1Y",
      onUpdate: backgroundUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    const stopPage = subscribe({
      window: "1Y",
      onUpdate: pageUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    expect(MockEventSource.instances).toHaveLength(1);
    const events = MockEventSource.instances[0];
    events.emit("connected", { revision: 0, window: "1Y" });
    events.emit("snapshot", { revision: 1, window: "1Y" });
    events.emit("snapshot", { revision: 1, window: "1Y" });
    expect(backgroundUpdate).toHaveBeenCalledTimes(2);
    expect(pageUpdate).toHaveBeenCalledTimes(2);

    stopPage();
    events.emit("snapshot", { revision: 2, window: "1Y" });
    expect(backgroundUpdate).toHaveBeenCalledTimes(3);
    expect(pageUpdate).toHaveBeenCalledTimes(2);
    expect(events.close).not.toHaveBeenCalled();

    stopBackground();
    stopBackground();
    stopPage();
    expect(events.close).toHaveBeenCalledTimes(1);
    expect(
      [...events.listeners.values()].every((listeners) => !listeners.size),
    ).toBe(true);
  });

  it("catches up returning page listeners while background updates continue", async () => {
    const backgroundUpdate = jest.fn<() => void>();
    subscribe({
      window: "1Y",
      onUpdate: backgroundUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    const events = MockEventSource.instances[0];
    events.emit("connected", { revision: 0, window: "1Y" });
    const pageUpdate = jest.fn<() => void>();
    const stopPage = subscribe({
      window: "1Y",
      onUpdate: pageUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    expect(pageUpdate).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(pageUpdate).toHaveBeenCalledTimes(1);

    stopPage();
    events.emit("snapshot", { revision: 1, window: "1Y" });
    expect(pageUpdate).toHaveBeenCalledTimes(1);
    expect(backgroundUpdate).toHaveBeenCalledTimes(2);

    const returningPageUpdate = jest.fn<() => void>();
    subscribe({
      window: "1Y",
      onUpdate: returningPageUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    await Promise.resolve();
    expect(returningPageUpdate).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances).toHaveLength(1);
    expect(events.close).not.toHaveBeenCalled();

    events.emit("connected", { revision: 1, window: "1Y" });
    expect(returningPageUpdate).toHaveBeenCalledTimes(2);
    expect(backgroundUpdate).toHaveBeenCalledTimes(3);
    expect(pageUpdate).toHaveBeenCalledTimes(1);
  });

  it("cancels deferred catch-up when the page leaves before it runs", async () => {
    subscribe({
      window: "1Y",
      onUpdate: jest.fn<() => void>(),
      onRefreshError: jest.fn<() => void>(),
    });
    const events = MockEventSource.instances[0];
    events.emit("connected", { revision: 0, window: "1Y" });
    const pageUpdate = jest.fn<() => void>();
    const stopPage = subscribe({
      window: "1Y",
      onUpdate: pageUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    stopPage();
    await Promise.resolve();
    expect(pageUpdate).not.toHaveBeenCalled();
    expect(events.close).not.toHaveBeenCalled();
  });

  it("uses a live notification instead of duplicating a pending catch-up", async () => {
    subscribe({
      window: "1Y",
      onUpdate: jest.fn<() => void>(),
      onRefreshError: jest.fn<() => void>(),
    });
    const events = MockEventSource.instances[0];
    events.emit("connected", { revision: 0, window: "1Y" });
    const pageUpdate = jest.fn<() => void>();
    subscribe({
      window: "1Y",
      onUpdate: pageUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    events.emit("snapshot", { revision: 1, window: "1Y" });
    await Promise.resolve();
    expect(pageUpdate).toHaveBeenCalledTimes(1);
  });

  it("reports refresh errors to every active listener without exposing details", () => {
    const backgroundError = jest.fn<() => void>();
    const pageError = jest.fn<() => void>();
    subscribe({
      window: "1Y",
      onUpdate: jest.fn<() => void>(),
      onRefreshError: backgroundError,
    });
    const stopPage = subscribe({
      window: "1Y",
      onUpdate: jest.fn<() => void>(),
      onRefreshError: pageError,
    });
    const events = MockEventSource.instances[0];
    events.emit("refresh-error", { window: "1M" });
    events.emit("refresh-error", null);
    events.emit("refresh-error", {
      window: "1Y",
      error: "private backend details",
    });
    expect(backgroundError.mock.calls).toEqual([[]]);
    expect(pageError.mock.calls).toEqual([[]]);

    stopPage();
    events.emit("refresh-error", { window: "1Y" });
    expect(backgroundError.mock.calls).toEqual([[], []]);
    expect(pageError).toHaveBeenCalledTimes(1);
    expect(events.close).not.toHaveBeenCalled();
  });

  it("keeps windows independent and closes only the window without listeners", () => {
    const yearUpdate = jest.fn<() => void>();
    const monthUpdate = jest.fn<() => void>();
    const stopYear = subscribe({
      window: "1Y",
      onUpdate: yearUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    subscribe({
      window: "1M",
      onUpdate: monthUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    expect(MockEventSource.instances).toHaveLength(2);
    const [yearEvents, monthEvents] = MockEventSource.instances;
    expect(yearEvents.url).toContain("window=1Y");
    expect(monthEvents.url).toContain("window=1M");
    yearEvents.emit("connected", { revision: 0, window: "1Y" });
    monthEvents.emit("connected", { revision: 0, window: "1M" });
    yearEvents.emit("snapshot", { revision: 1, window: "1M" });
    monthEvents.emit("snapshot", { revision: 1, window: "1Y" });
    expect(yearUpdate).toHaveBeenCalledTimes(1);
    expect(monthUpdate).toHaveBeenCalledTimes(1);

    stopYear();
    expect(yearEvents.close).toHaveBeenCalledTimes(1);
    expect(monthEvents.close).not.toHaveBeenCalled();
    monthEvents.emit("snapshot", { revision: 1, window: "1M" });
    expect(monthUpdate).toHaveBeenCalledTimes(2);
    expect(yearUpdate).toHaveBeenCalledTimes(1);
  });

  it("opens a fresh stream after final cleanup and ignores obsolete callbacks", () => {
    const previousUpdate = jest.fn<() => void>();
    const previousError = jest.fn<() => void>();
    const stopPrevious = subscribe({
      window: "1Y",
      onUpdate: previousUpdate,
      onRefreshError: previousError,
    });
    const previousEvents = MockEventSource.instances[0];
    const previousSnapshot = [...previousEvents.listeners.get("snapshot")!][0];
    const previousRefreshError = [
      ...previousEvents.listeners.get("refresh-error")!,
    ][0];
    previousEvents.emit("connected", { revision: 2, window: "1Y" });
    stopPrevious();

    const nextUpdate = jest.fn<() => void>();
    subscribe({
      window: "1Y",
      onUpdate: nextUpdate,
      onRefreshError: jest.fn<() => void>(),
    });
    expect(MockEventSource.instances).toHaveLength(2);
    const nextEvents = MockEventSource.instances[1];
    stopPrevious();
    expect(nextEvents.close).not.toHaveBeenCalled();
    previousSnapshot({
      type: "snapshot",
      data: JSON.stringify({ revision: 3, window: "1Y" }),
    } as MessageEvent<string>);
    previousRefreshError({
      type: "refresh-error",
      data: JSON.stringify({ window: "1Y" }),
    } as MessageEvent<string>);
    expect(previousUpdate).toHaveBeenCalledTimes(1);
    expect(previousError).not.toHaveBeenCalled();
    expect(nextUpdate).not.toHaveBeenCalled();

    nextEvents.emit("connected", { revision: 0, window: "1Y" });
    nextEvents.emit("snapshot", { revision: 1, window: "1Y" });
    expect(nextUpdate).toHaveBeenCalledTimes(2);
  });
});
