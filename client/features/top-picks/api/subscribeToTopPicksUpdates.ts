import { API_BASE } from "@/lib/apiBase";
import type { TopPicksWindow } from "../types";

type SubscribeOptions = {
  window: TopPicksWindow;
  onUpdate: () => void;
  onRefreshError: () => void;
};

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

export function subscribeToTopPicksUpdates({
  window,
  onUpdate,
  onRefreshError,
}: SubscribeOptions): () => void {
  if (typeof globalThis.EventSource === "undefined") return () => {};

  const events = new EventSource(
    `${API_BASE}/api/top-picks/events?window=${encodeURIComponent(window)}`,
  );
  let active = true;
  let lastRevision: number | null = null;

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
    onUpdate();
  };
  const handleRefreshError = (event: Event) => {
    if (active && parseMessage(event)?.window === window) onRefreshError();
  };

  events.addEventListener("connected", handleUpdate);
  events.addEventListener("snapshot", handleUpdate);
  events.addEventListener("refresh-error", handleRefreshError);

  return () => {
    active = false;
    events.removeEventListener("connected", handleUpdate);
    events.removeEventListener("snapshot", handleUpdate);
    events.removeEventListener("refresh-error", handleRefreshError);
    events.close();
  };
}
