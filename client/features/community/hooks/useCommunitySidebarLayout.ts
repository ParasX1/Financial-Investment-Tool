// File purpose: Manages Community sidebar collapsed state, compact mode, and mobile scroll locking.
import * as React from "react";
import { COMMUNITY_COMPACT_MEDIA_QUERY } from "../constants";
import {
  getRememberedDesktopSidebarCollapsed,
  rememberDesktopSidebarCollapsed,
} from "../state/communityMemory";

export function useCommunitySidebarLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    getRememberedDesktopSidebarCollapsed,
  );
  const [compactSidebar, setCompactSidebar] = React.useState(false);

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
  };
}
