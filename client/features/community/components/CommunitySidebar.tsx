import * as React from "react";
import AccessibilityNewRoundedIcon from "@mui/icons-material/AccessibilityNewRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AllInclusiveRoundedIcon from "@mui/icons-material/AllInclusiveRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DateRangeRoundedIcon from "@mui/icons-material/DateRangeRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ModeCommentOutlinedIcon from "@mui/icons-material/ModeCommentOutlined";
import NewReleasesOutlinedIcon from "@mui/icons-material/NewReleasesOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { fitNav } from "@/components/shared/fitStyles";
import communityStyles from "../community.module.css";
import {
  COMMUNITY_FEED_NAV_ITEMS,
  COMMUNITY_RESOURCE_LINKS,
  COMMUNITY_TOP_TIME_RANGE_ITEMS,
} from "../constants";
import { FOCUS_VISIBLE, cn } from "../design";
import type {
  CommunityFeedCounts,
  CommunityFeedView,
  CommunityTopTimeRange,
} from "../types";

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

const timeRangeIcons: Record<
  CommunityTopTimeRange,
  typeof AccessTimeRoundedIcon
> = {
  "all-time": AllInclusiveRoundedIcon,
  "past-year": EventRoundedIcon,
  "past-month": CalendarMonthRoundedIcon,
  "past-week": DateRangeRoundedIcon,
  today: TodayRoundedIcon,
  "past-hour": ScheduleRoundedIcon,
};

export function CommunitySidebar({
  activeView,
  activeTimeRange,
  collapsed,
  compact,
  counts,
  onCollapsedChange,
  onTimeRangeChange,
  onViewChange,
}: {
  activeView: CommunityFeedView;
  activeTimeRange: CommunityTopTimeRange;
  collapsed: boolean;
  compact: boolean;
  counts: CommunityFeedCounts;
  onCollapsedChange: (collapsed: boolean) => void;
  onTimeRangeChange: (range: CommunityTopTimeRange) => void;
  onViewChange: (view: CommunityFeedView) => void;
}) {
  const activeItem = COMMUNITY_FEED_NAV_ITEMS.find(
    (item) => item.id === activeView,
  );
  const ActiveIcon = navIcons[activeView];
  const activeTimeItem = COMMUNITY_TOP_TIME_RANGE_ITEMS.find(
    (item) => item.id === activeTimeRange,
  );
  const ActiveTimeIcon = timeRangeIcons[activeTimeRange];
  const showTimeRange = activeView === "top";
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
        <div className="hidden w-12 space-y-2 lg:block">
          <div
            className={cn(
              "rounded-lg py-2 text-center",
              fitNav.itemActiveCompactQuiet,
            )}
            aria-label={activeItem ? `Current view: ${activeItem.label}` : undefined}
          >
            <ActiveIcon sx={{ fontSize: 19 }} aria-hidden="true" />
            <span className="sr-only">{activeItem?.label}</span>
          </div>
          {showTimeRange ? (
            <div
              className={cn(
                "rounded-lg py-2 text-center",
                fitNav.itemActiveCompactQuiet,
              )}
              aria-label={
                activeTimeItem
                  ? `Current top time range: ${activeTimeItem.label}`
                  : undefined
              }
              title={activeTimeItem?.label}
            >
              <ActiveTimeIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              <span className="sr-only">{activeTimeItem?.label}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <nav className="min-w-0" aria-label="Community feeds">
        <p
          className={cn(
            "mb-2 px-2",
            fitNav.sectionLabel,
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
                aria-pressed={active}
                aria-label={`${item.label}: ${item.description}`}
                className={cn(
                  fitNav.itemBase,
                  "relative min-w-[142px] lg:min-w-0",
                  drawerOpen ? "min-w-0" : "",
                  active ? fitNav.itemActiveQuiet : fitNav.itemIdle,
                  FOCUS_VISIBLE,
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
                    active ? fitNav.iconActiveQuiet : fitNav.iconIdle,
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
                <span className={fitNav.countPill}>
                  {counts[item.id].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {showTimeRange ? (
        <section
          className={cn("mt-4 min-w-0", collapsed ? "hidden" : "")}
          aria-label="Top feed time range"
        >
          <p className={cn("mb-2 px-2", fitNav.sectionLabel)}>
            Time
          </p>
          <div
            className={cn(
              drawerOpen
                ? "grid grid-cols-2 gap-2"
                : "flex gap-2 overflow-x-hidden pb-1 lg:flex-col lg:overflow-visible lg:pb-0",
            )}
            role="list"
          >
            {COMMUNITY_TOP_TIME_RANGE_ITEMS.map((item) => {
              const active = activeTimeRange === item.id;
              const Icon = timeRangeIcons[item.id];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTimeRangeChange(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "group flex min-h-[38px] min-w-[132px] touch-manipulation items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors lg:min-w-0",
                    drawerOpen ? "min-w-0" : "",
                    active ? fitNav.itemActiveQuiet : fitNav.itemIdle,
                    FOCUS_VISIBLE,
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors",
                      active ? fitNav.iconActiveQuiet : fitNav.iconIdle,
                    )}
                    aria-hidden="true"
                  >
                    <Icon sx={{ fontSize: 16 }} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div
        className={cn("my-4", communityStyles.dividerTop, collapsed ? "hidden" : "")}
        aria-hidden="true"
      />

      <section
        className={cn("min-w-0", collapsed ? "hidden" : "")}
        aria-label="Community resources"
      >
        <p className={cn("mb-2 px-2", fitNav.sectionLabel)}>
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
