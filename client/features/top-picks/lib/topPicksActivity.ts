export const isTopPicksActive = (): boolean =>
  (typeof document === "undefined" || document.visibilityState !== "hidden") &&
  (typeof navigator === "undefined" || navigator.onLine !== false);

export const subscribeToTopPicksActivity = (onChange: () => void) => {
  const page = typeof document === "undefined" ? undefined : document;
  const browser = typeof window === "undefined" ? undefined : window;
  page?.addEventListener?.("visibilitychange", onChange);
  browser?.addEventListener?.("online", onChange);
  browser?.addEventListener?.("offline", onChange);
  return () => {
    page?.removeEventListener?.("visibilitychange", onChange);
    browser?.removeEventListener?.("online", onChange);
    browser?.removeEventListener?.("offline", onChange);
  };
};
