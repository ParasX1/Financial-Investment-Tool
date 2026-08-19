// File purpose: Provides the shared visual shell for dedicated Community route screens.
import * as React from "react";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import {
  COMMUNITY_APP_RAIL_WIDTH_PX,
  COMMUNITY_CONTENT_MAX_WIDTH_PX,
  COMMUNITY_PAGE_WIDTH,
  COMMUNITY_SIDEBAR_COLLAPSED_WIDTH_PX,
  COMMUNITY_SIDEBAR_WIDTH_PX,
  COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX,
  COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX,
} from "../constants";
import { cn, communityUi } from "../design";
import { useCommunitySidebarLayout } from "../hooks/useCommunitySidebarLayout";
import communityStyles from "../styles/community.module.css";
import type {
  CommunityFeedCounts,
  CommunityFeedView,
  CommunityTopTimeRange,
} from "../types";
import { CommunitySidebar } from "./CommunitySidebar";

const communityLayoutStyle = {
  "--community-app-rail-width": `var(--app-sidebar-width, ${COMMUNITY_APP_RAIL_WIDTH_PX}px)`,
  "--community-content-max-width": `${COMMUNITY_CONTENT_MAX_WIDTH_PX}px`,
  "--community-toolbar-control-height": `${COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX}px`,
  "--community-toolbar-y": `${COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX}px`,
  "--community-sidebar-width": `${COMMUNITY_SIDEBAR_WIDTH_PX}px`,
  "--community-sidebar-collapsed-width": `${COMMUNITY_SIDEBAR_COLLAPSED_WIDTH_PX}px`,
} as React.CSSProperties;

export function CommunityLayout({
  activeTimeRange,
  activeView,
  children,
  counts,
  onTimeRangeChange,
  onViewChange,
  toolbar,
}: {
  activeTimeRange: CommunityTopTimeRange;
  activeView: CommunityFeedView;
  children: React.ReactNode;
  counts?: CommunityFeedCounts;
  onTimeRangeChange: (range: CommunityTopTimeRange) => void;
  onViewChange: (view: CommunityFeedView) => void;
  toolbar: React.ReactNode;
}) {
  const {
    compactSidebar,
    handleSidebarCollapsedChange,
    sidebarCollapsed,
  } = useCommunitySidebarLayout();

  return (
    <main
      id="community-main"
      tabIndex={-1}
      className={communityUi.page}
      style={communityLayoutStyle}
    >
      <div
        className={communityUi.pageInner}
        style={{
          width: COMMUNITY_PAGE_WIDTH,
          maxWidth: `${COMMUNITY_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        {compactSidebar && !sidebarCollapsed ? (
          <button
            type="button"
            aria-label="Close community navigation"
            className="fixed inset-0 z-[880] cursor-default bg-black/60 backdrop-blur-[2px] lg:hidden"
            onClick={() => handleSidebarCollapsedChange(true)}
          />
        ) : null}

        <FitPageHeader
          title="Community"
          subtitle="Connect with fellow investors and share market insights"
          subtitleClassName="max-w-[34rem]"
        />

        <div
          className={cn(
            communityStyles.communityLayoutGrid,
            sidebarCollapsed
              ? communityStyles.communityLayoutGridCollapsed
              : communityStyles.communityLayoutGridExpanded,
          )}
        >
          <div className="min-w-0">
            <div
              className={cn(
                communityStyles.sidebarPinned,
                sidebarCollapsed ? "lg:w-16" : "lg:w-56",
              )}
            >
              <CommunitySidebar
                activeView={activeView}
                activeTimeRange={activeTimeRange}
                collapsed={sidebarCollapsed}
                compact={compactSidebar}
                counts={counts}
                onCollapsedChange={handleSidebarCollapsedChange}
                onTimeRangeChange={onTimeRangeChange}
                onViewChange={onViewChange}
              />
            </div>
          </div>

          <div className="min-w-0">
            {toolbar}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
