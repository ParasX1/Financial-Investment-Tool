import { API_BASE } from "@/lib/apiBase";
import type { TopPicksWindow } from "../types";
import {
  isTopPicksActive,
  subscribeToTopPicksActivity,
} from "../lib/topPicksActivity";

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
  let active = true;
  let events: EventSource | null = null;
  let closeTransport = () => {};
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 5000;
  let lastRevision: number | null = null;
  const cancelRetry = () => {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
  };
  const subscription: SharedSubscription = {
    listeners: new Set(),
    receivedUpdate: false,
    close: () => {
      active = false;
      cancelRetry();
      stopActivity();
      closeTransport();
    },
  };

  const handleUpdate = (event: Event) => {
    const message = parseMessage(event);
    if (
      !active ||
      !isTopPicksActive() ||
      message?.window !== window ||
      typeof message.revision !== "number" ||
      !Number.isSafeInteger(message.revision) ||
      message.revision < 0
    )
      return;

    // Reconnecting always reads the latest result, including missed events.
    if (event.type === "snapshot" && message.revision === lastRevision) return;
    if (event.type === "connected") retryDelay = 5000;
    lastRevision = message.revision;
    subscription.receivedUpdate = true;
    subscription.listeners.forEach((listener) => {
      if (!listener.active) return;
      listener.receivedUpdate = true;
      listener.onUpdate();
    });
  };
  const handleRefreshError = (event: Event) => {
    if (
      !active ||
      !isTopPicksActive() ||
      parseMessage(event)?.window !== window
    )
      return;
    subscription.listeners.forEach((listener) => {
      if (listener.active) listener.onRefreshError();
    });
  };

  const openTransport = () => {
    if (!active || !isTopPicksActive() || events !== null) return;
    const source = new EventSource(
      `${API_BASE}/api/top-picks/events?window=${encodeURIComponent(window)}`,
    );
    events = source;
    const guard = (callback: (event: Event) => void) => (event: Event) => {
      if (active && events === source && isTopPicksActive()) callback(event);
    };
    const reconnect = (reportError: boolean) => {
      closeTransport();
      if (reportError)
        subscription.listeners.forEach((listener) => {
          if (listener.active) listener.onRefreshError();
        });
      if (!active || !isTopPicksActive() || retryTimer !== null) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        openTransport();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
    };
    const handlers: Record<string, EventListener> = {
      connected: guard(handleUpdate),
      snapshot: guard(handleUpdate),
      "refresh-error": guard(handleRefreshError),
      error: guard(() => reconnect(true)),
      reconnect: guard(() => reconnect(false)),
    };
    Object.entries(handlers).forEach(([type, handler]) =>
      source.addEventListener(type, handler),
    );
    closeTransport = () => {
      if (events !== source) return;
      events = null;
      Object.entries(handlers).forEach(([type, handler]) =>
        source.removeEventListener(type, handler),
      );
      source.close();
    };
  };
  const stopActivity = subscribeToTopPicksActivity(() => {
    if (!isTopPicksActive()) {
      cancelRetry();
      closeTransport();
    } else if (retryTimer === null) {
      openTransport();
    }
  });
  openTransport();
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
      if (!listener.active || listener.receivedUpdate || !isTopPicksActive())
        return;
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
