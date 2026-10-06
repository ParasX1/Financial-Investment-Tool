import { API_BASE } from "@/lib/apiBase";
import type { TopPicksWindow } from "../types";

type SubscribeOptions = {
  window: TopPicksWindow;
  onUpdate: () => void;
  onRefreshError: () => void;
};

type UpdateListener = {
  onUpdate: () => void;
  onRefreshError: () => void;
  active: boolean;
  receivedUpdate: boolean;
};

type SharedSubscription = {
  listeners: Set<UpdateListener>;
  receivedUpdate: boolean;
  close: () => void;
};

const sharedSubscriptions = new Map<TopPicksWindow, SharedSubscription>();

const parseMessage = (event: Event): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse((event as MessageEvent<string>).data);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const createSubscription = (window: TopPicksWindow): SharedSubscription => {
  const events = new EventSource(
    `${API_BASE}/api/top-picks/events?window=${encodeURIComponent(window)}`,
  );
  let active = true;
  let lastRevision: number | null = null;
  const subscription: SharedSubscription = {
    listeners: new Set(),
    receivedUpdate: false,
    close: () => {
      active = false;
      events.removeEventListener("connected", handleUpdate);
      events.removeEventListener("snapshot", handleUpdate);
      events.removeEventListener("refresh-error", handleRefreshError);
      events.close();
    },
  };

  const handleUpdate = (event: Event) => {
    const message = parseMessage(event);
    if (
      !active ||
      message?.window !== window ||
      typeof message.revision !== "number" ||
      !Number.isSafeInteger(message.revision) ||
      message.revision < 0
    )
      return;

    // Reconnecting always reads the latest result, including missed events.
    if (event.type === "snapshot" && message.revision === lastRevision) return;
    lastRevision = message.revision;
    subscription.receivedUpdate = true;
    subscription.listeners.forEach((listener) => {
      if (!listener.active) return;
      listener.receivedUpdate = true;
      listener.onUpdate();
    });
  };
  const handleRefreshError = (event: Event) => {
    if (!active || parseMessage(event)?.window !== window) return;
    subscription.listeners.forEach((listener) => {
      if (listener.active) listener.onRefreshError();
    });
  };

  events.addEventListener("connected", handleUpdate);
  events.addEventListener("snapshot", handleUpdate);
  events.addEventListener("refresh-error", handleRefreshError);
  return subscription;
};

export function subscribeToTopPicksUpdates({
  window,
  onUpdate,
  onRefreshError,
}: SubscribeOptions): () => void {
  if (typeof globalThis.EventSource === "undefined") return () => {};

  const existingSubscription = sharedSubscriptions.get(window);
  const subscription = existingSubscription ?? createSubscription(window);
  if (!existingSubscription) {
    sharedSubscriptions.set(window, subscription);
  }
  const listener: UpdateListener = {
    onUpdate,
    onRefreshError,
    active: true,
    receivedUpdate: false,
  };
  subscription.listeners.add(listener);

  if (subscription.receivedUpdate) {
    // A page returning to an existing background connection catches up without
    // opening another stream or missing updates received while it was away.
    queueMicrotask(() => {
      if (!listener.active || listener.receivedUpdate) return;
      listener.receivedUpdate = true;
      listener.onUpdate();
    });
  }

  return () => {
    if (!listener.active) return;
    listener.active = false;
    subscription.listeners.delete(listener);
    if (subscription.listeners.size === 0) {
      sharedSubscriptions.delete(window);
      subscription.close();
    }
  };
}
