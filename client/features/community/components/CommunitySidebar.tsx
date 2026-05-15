import * as React from "react";
import AccessibilityNewRoundedIcon from "@mui/icons-material/AccessibilityNewRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ModeCommentOutlinedIcon from "@mui/icons-material/ModeCommentOutlined";
import NewReleasesOutlinedIcon from "@mui/icons-material/NewReleasesOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import communityStyles from "@/styles/community.module.css";
import {
  COMMUNITY_FEED_NAV_ITEMS,
  COMMUNITY_RESOURCE_LINKS,
} from "../constants";
import { FOCUS_VISIBLE, cn } from "../design";
import type { CommunityFeedCounts, CommunityFeedView } from "../types";

const navIcons: Record<CommunityFeedView, typeof TrendingUpRoundedIcon> = {
  top: TrendingUpRoundedIcon,
  new: NewReleasesOutlinedIcon,
  "my-posts": PersonOutlineRoundedIcon,
  liked: FavoriteBorderRoundedIcon,
  commented: ModeCommentOutlinedIcon,
};

const resourceIcons = [
  GavelRoundedIcon,
  PrivacyTipOutlinedIcon,
  ArticleRoundedIcon,
  AccessibilityNewRoundedIcon,
];

export function CommunitySidebar({
  activeView,
  collapsed,
  compact,
  counts,
  onCollapsedChange,
  onViewChange,
}: {
  activeView: CommunityFeedView;
  collapsed: boolean;
  compact: boolean;
  counts: CommunityFeedCounts;
  onCollapsedChange: (collapsed: boolean) => void;
  onViewChange: (view: CommunityFeedView) => void;
}) {
  const activeItem = COMMUNITY_FEED_NAV_ITEMS.find(
    (item) => item.id === activeView,
  );
  const ActiveIcon = navIcons[activeView];
  const drawerOpen = compact && !collapsed;
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const toggleButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const previousDrawerOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (drawerOpen) {
      drawerRef.current?.focus();
    } else if (previousDrawerOpenRef.current) {
      toggleButtonRef.current?.focus();
    }

    previousDrawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  function trapDrawerFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (!drawerOpen || event.key !== "Tab") return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleViewChange(view: CommunityFeedView) {
    onViewChange(view);
    if (compact) onCollapsedChange(true);
  }

  return (
    <aside
      ref={drawerRef}
      className={cn(
        drawerOpen
          ? cn(
              "fixed bottom-0 top-0 z-[900] overflow-y-auto bg-[#07080a] px-3 py-4 shadow-[24px_0_60px_rgba(0,0,0,0.45)]",
              communityStyles.sidebarDrawer,
            )
          : compact && collapsed
            ? cn("fixed z-[900]", communityStyles.sidebarCompactToggle)
          : "min-w-0",
        drawerOpen ? communityStyles.drawerIn : "",
        communityStyles.sidebarShell,
      )}
      aria-label="Community navigation"
      aria-modal={drawerOpen ? true : undefined}
      onKeyDown={trapDrawerFocus}
      role={drawerOpen ? "dialog" : undefined}
      tabIndex={drawerOpen ? -1 : undefined}
    >
      <button
        ref={toggleButtonRef}
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        aria-expanded={!collapsed}
        aria-controls="community-feed-navigation"
        className={cn(
          "mb-3 flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-[#101014] text-sm font-bold text-[#dce4ff] transition-colors hover:bg-[#171b4a]",
          communityStyles.sidebarToggle,
          compact && collapsed
            ? cn(communityStyles.toolbarControl, "px-0")
            : "",
          compact && collapsed ? "" : "px-3",
          collapsed ? "lg:w-12 lg:px-0" : "",
          FOCUS_VISIBLE,
        )}
      >
        {collapsed ? (
          <MenuRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
        ) : (
          <KeyboardDoubleArrowLeftRoundedIcon
            sx={{ fontSize: 20 }}
            aria-hidden="true"
          />
        )}
        <span className={cn(collapsed ? "sr-only" : "")}>
          {collapsed ? "Expand navigation" : "Collapse navigation"}
        </span>
      </button>

      {collapsed ? (
        <div
          className="hidden w-12 rounded-lg bg-[#171b4a] py-2 text-center text-white lg:block"
          aria-label={activeItem ? `Current view: ${activeItem.label}` : undefined}
        >
          <ActiveIcon sx={{ fontSize: 19 }} aria-hidden="true" />
          <span className="sr-only">{activeItem?.label}</span>
        </div>
      ) : null}

      <nav className="min-w-0" aria-label="Community feeds">
        <p
          className={cn(
            "mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#687184]",
            collapsed ? "hidden" : "",
          )}
        >
          Feeds
        </p>
        <div
          id="community-feed-navigation"
          className={cn(
            drawerOpen
              ? "flex flex-col gap-2 overflow-visible pb-0"
              : "flex gap-2 overflow-x-hidden pb-1 lg:flex-col lg:overflow-visible lg:pb-0",
            collapsed ? "hidden" : "",
          )}
          role="list"
        >
          {COMMUNITY_FEED_NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            const Icon = navIcons[item.id];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleViewChange(item.id)}
                aria-current={active ? "page" : undefined}
                aria-label={`${item.label}: ${item.description}`}
                className={cn(
                  "group relative flex min-h-[44px] min-w-[142px] touch-manipulation items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors lg:min-w-0",
                  drawerOpen ? "min-w-0" : "",
                  active
                    ? "bg-[#171b4a] text-white shadow-[inset_3px_0_0_#7b8cff]"
                    : "text-[#a5adbf] hover:bg-white/[0.04] hover:text-[#f4f7ff]",
                  FOCUS_VISIBLE,
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
                    active
                      ? "bg-[#5367ff] text-white"
                      : "bg-[#141419] text-[#8f98aa] group-hover:text-[#dce4ff]",
                  )}
                  aria-hidden="true"
                >
                  <Icon sx={{ fontSize: 18 }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">
                    {item.label}
                  </span>
                </span>
                <span className="rounded-md bg-black/30 px-2 py-[2px] text-xs font-bold tabular-nums text-[#c6cee0]">
                  {counts[item.id].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className={cn("my-4", communityStyles.dividerTop, collapsed ? "hidden" : "")}
        aria-hidden="true"
      />

      <section
        className={cn("min-w-0", collapsed ? "hidden" : "")}
        aria-label="Community resources"
      >
        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#687184]">
          Resources
        </p>
        <div
          className={cn(
            drawerOpen ? "space-y-1" : "grid grid-cols-2 gap-2 lg:block lg:space-y-1",
          )}
        >
          {COMMUNITY_RESOURCE_LINKS.map((label, index) => {
            const Icon = resourceIcons[index] ?? ArticleRoundedIcon;

            return (
              <div
                key={label}
                aria-label={`${label} coming soon`}
                className={cn(
                  "flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[#697185]",
                  drawerOpen ? "bg-transparent" : "bg-white/[0.02] lg:bg-transparent",
                )}
              >
                <Icon sx={{ fontSize: 17 }} aria-hidden="true" />
                <span className="truncate">{label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
