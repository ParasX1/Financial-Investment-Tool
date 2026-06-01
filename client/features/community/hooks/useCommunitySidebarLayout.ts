// File purpose: Manages Community sidebar collapsed state, compact mode, scroll locking, and sticky positioning.
import * as React from "react";
import {
  COMMUNITY_COMPACT_MEDIA_QUERY,
  COMMUNITY_SIDEBAR_FLOAT_GAP_PX,
  COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX,
  COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX,
} from "../constants";
import {
  getRememberedDesktopSidebarCollapsed,
  rememberDesktopSidebarCollapsed,
} from "../state/communityMemory";

export function useCommunitySidebarLayout({
  contentCount,
  feedbackCount,
  loadError,
  loadingCommunity,
  mode,
}: {
  contentCount: number;
  feedbackCount: number;
  loadError: string | null;
  loadingCommunity: boolean;
  mode: "feed" | "create";
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    getRememberedDesktopSidebarCollapsed,
  );
  const [compactSidebar, setCompactSidebar] = React.useState(false);
  const sidebarPinnedRef = React.useRef<HTMLDivElement | null>(null);
  const sidebarMeasureFrameRef = React.useRef(0);

  const syncSidebarTop = React.useCallback(() => {
    window.cancelAnimationFrame(sidebarMeasureFrameRef.current);
    sidebarMeasureFrameRef.current = window.requestAnimationFrame(() => {
      const toolbar = document.querySelector<HTMLElement>(
        "[data-community-toolbar]",
      );
      const contentStart = document.querySelector<HTMLElement>(
        "[data-community-content-start]",
      );
      const toolbarBottom =
        toolbar?.getBoundingClientRect().bottom ??
        COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX +
          COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX * 2;
      const minTop = toolbarBottom + COMMUNITY_SIDEBAR_FLOAT_GAP_PX;
      const contentTop = contentStart?.getBoundingClientRect().top ?? minTop;
      const nextTop = Math.max(minTop, contentTop);
      sidebarPinnedRef.current?.style.setProperty(
        "--community-sidebar-top",
        `${nextTop}px`,
      );
    });
  }, []);

  React.useEffect(() => {
    syncSidebarTop();
    window.addEventListener("scroll", syncSidebarTop, { passive: true });
    window.addEventListener("resize", syncSidebarTop);

    return () => {
      window.cancelAnimationFrame(sidebarMeasureFrameRef.current);
      window.removeEventListener("scroll", syncSidebarTop);
      window.removeEventListener("resize", syncSidebarTop);
    };
  }, [syncSidebarTop]);

  React.useEffect(() => {
    syncSidebarTop();
  }, [
    contentCount,
    feedbackCount,
    loadError,
    loadingCommunity,
    mode,
    syncSidebarTop,
  ]);

  React.useEffect(() => {
    const query = window.matchMedia(COMMUNITY_COMPACT_MEDIA_QUERY);
    const syncSidebarState = () => {
      setCompactSidebar(query.matches);
      setSidebarCollapsed(
        query.matches ? true : getRememberedDesktopSidebarCollapsed(),
      );
    };

    syncSidebarState();
    query.addEventListener("change", syncSidebarState);

    return () => {
      query.removeEventListener("change", syncSidebarState);
    };
  }, []);

  React.useEffect(() => {
    if (!compactSidebar || sidebarCollapsed) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarCollapsed(true);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [compactSidebar, sidebarCollapsed]);

  React.useEffect(() => {
    if (!compactSidebar || sidebarCollapsed) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [compactSidebar, sidebarCollapsed]);

  const handleSidebarCollapsedChange = React.useCallback(
    (nextCollapsed: boolean) => {
      setSidebarCollapsed(nextCollapsed);

      if (!compactSidebar) {
        rememberDesktopSidebarCollapsed(nextCollapsed);
      }
    },
    [compactSidebar],
  );

  return {
    compactSidebar,
    handleSidebarCollapsedChange,
    sidebarCollapsed,
    sidebarPinnedRef,
  };
}
