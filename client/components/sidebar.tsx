import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import "boxicons/css/boxicons.min.css";
import { useAuth } from "@/components/authContext";
import { AuthDialog, useAuthDialog } from "@/features/auth";
import { FitLogo } from "@/components/shared/FitLogo";
import { fitNav } from "@/components/shared/fitStyles";
import { FIT_FOCUS_VISIBLE, fitType } from "@/components/shared/uiPrimitives";

const DESKTOP_COLLAPSED_WIDTH = 64;
const COMPACT_COLLAPSED_WIDTH = 52;
const EXPANDED_WIDTH = 232;
const LABEL_DELAY_MS = 115;
const CLOSE_DELAY_MS = 120;
const COMPACT_MEDIA_QUERY = "(max-width: 767px)";
const HOVER_MEDIA_QUERY = "(hover: hover) and (pointer: fine)";
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

let rememberedDesktopExpanded = false;
let rememberedCompactExpanded = false;
let lastPointerPosition: { x: number; y: number } | null = null;
let pointerTrackerStarted = false;
let sidebarHasMounted = false;

const focusRing = FIT_FOCUS_VISIBLE;

type SidebarIcon = React.ElementType<SvgIconProps>;

function rememberPointerPosition(event: { clientX: number; clientY: number }) {
  lastPointerPosition = { x: event.clientX, y: event.clientY };
}

function ensureGlobalPointerTracker() {
  if (typeof window === "undefined" || pointerTrackerStarted) return;

  pointerTrackerStarted = true;
  window.addEventListener("pointermove", rememberPointerPosition, {
    passive: true,
  });
  window.addEventListener("pointerdown", rememberPointerPosition, {
    passive: true,
  });
}

function mediaMatches(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

function getInitialCompactMode() {
  return mediaMatches(COMPACT_MEDIA_QUERY);
}

function getInitialHoverExpandMode() {
  return mediaMatches(HOVER_MEDIA_QUERY) && !getInitialCompactMode();
}

function isPointerWithinSidebarWidth(width: number) {
  if (typeof window === "undefined" || !lastPointerPosition) return true;

  return (
    lastPointerPosition.x >= 0 &&
    lastPointerPosition.x <= width &&
    lastPointerPosition.y >= 0 &&
    lastPointerPosition.y <= window.innerHeight
  );
}

function shouldKeepDesktopSidebarExpanded() {
  return (
    rememberedDesktopExpanded &&
    getInitialHoverExpandMode() &&
    isPointerWithinSidebarWidth(EXPANDED_WIDTH)
  );
}

function getInitialSidebarSnapshot() {
  if (typeof window === "undefined" || !sidebarHasMounted) {
    return {
      canHoverExpand: false,
      compact: false,
      expanded: false,
      responsiveReady: false,
      showLabel: false,
    };
  }

  const compact = getInitialCompactMode();
  const canHoverExpand = mediaMatches(HOVER_MEDIA_QUERY) && !compact;
  const expanded = compact
    ? rememberedCompactExpanded
    : canHoverExpand
      ? shouldKeepDesktopSidebarExpanded()
      : rememberedDesktopExpanded;

  return {
    canHoverExpand,
    compact,
    expanded,
    responsiveReady: true,
    showLabel: expanded,
  };
}

interface SidebarNavItem {
  href: string;
  label: string;
  icon: SidebarIcon;
  gated?: boolean;
  match?: (pathname: string) => boolean;
}

const mainNavItems: SidebarNavItem[] = [
  {
    href: "/dashboardView",
    label: "Portfolio",
    icon: AccountBalanceWalletRoundedIcon,
    gated: true,
  },
  {
    href: "/TopPicks",
    label: "Top Picks",
    icon: TrendingUpRoundedIcon,
    gated: true,
  },
  {
    href: "/MarketNews",
    label: "Market News",
    icon: NewspaperRoundedIcon,
    gated: true,
  },
  {
    href: "/Watchlist",
    label: "Watchlist",
    icon: BookmarkBorderRoundedIcon,
    gated: true,
  },
  {
    href: "/Community",
    label: "Community",
    icon: GroupsRoundedIcon,
    gated: true,
    match: (pathname) => pathname.startsWith("/Community"),
  },
  {
    href: "/Guide",
    label: "Guide",
    icon: MenuBookRoundedIcon,
    gated: true,
  },
];

const utilityNavItems: SidebarNavItem[] = [
  {
    href: "/Help",
    label: "Help",
    icon: HelpOutlineRoundedIcon,
  },
  {
    href: "/Profile",
    label: "Profile",
    icon: PersonOutlineRoundedIcon,
    gated: true,
  },
];

function isNavItemActive(item: SidebarNavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href;
}

function SidebarItem({
  active,
  expanded,
  item,
  locked,
  onNavigate,
  showLabel,
  onLockedSelect,
}: {
  active: boolean;
  expanded: boolean;
  item: SidebarNavItem;
  locked: boolean;
  onNavigate: () => void;
  showLabel: boolean;
  onLockedSelect: () => void;
}) {
  const Icon = item.icon;
  const activeExpanded = active && expanded;
  const content = (
    <>
      <span
        className={[
          "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-[background-color,color,box-shadow] duration-150",
          active
            ? activeExpanded
              ? fitNav.iconActive
              : fitNav.iconActiveStandalone
            : "bg-[#141419] text-[#8f98aa] group-hover:text-[#dce4ff]",
        ].join(" ")}
        aria-hidden="true"
      >
        <Icon sx={{ fontSize: 18 }} />
      </span>
      <span
        className={[
          "min-w-0 flex-1 truncate transition-opacity duration-150",
          fitType.navLabel,
          showLabel ? "opacity-100" : "sr-only opacity-0",
        ].join(" ")}
      >
        {item.label}
      </span>
      {locked && showLabel ? (
        <LockOutlinedIcon
          sx={{ fontSize: 14 }}
          className="shrink-0 text-[#697185]"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
  const className = [
    "group relative flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-lg py-2 text-left no-underline transition-[background-color,color,box-shadow] duration-150 hover:no-underline",
    expanded ? "justify-start px-2" : "justify-center px-0",
    activeExpanded
      ? fitNav.itemActive
      : active
        ? fitNav.itemActiveCompact
        : fitNav.itemIdle,
    locked ? "cursor-pointer opacity-70" : "",
    focusRing,
  ].join(" ");

  if (locked) {
    return (
      <button
        type="button"
        className={className}
        onClick={onLockedSelect}
        title={`${item.label} requires sign in`}
        aria-label={`${item.label} requires sign in`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      title={item.label}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

interface SidebarProps {
  onHoverChange?: (open: boolean) => void;
  skipLabel?: string;
  skipTargetId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  onHoverChange,
  skipLabel = "Skip to content",
  skipTargetId = "main-content",
}) => {
  const { user, signOut } = useAuth();
  const [initialSidebarSnapshot] = useState(getInitialSidebarSnapshot);
  const [expanded, setExpanded] = useState(initialSidebarSnapshot.expanded);
  const [showLabel, setShowLabel] = useState(initialSidebarSnapshot.showLabel);
  const authDialog = useAuthDialog();
  const [compact, setCompact] = useState(initialSidebarSnapshot.compact);
  const [canHoverExpand, setCanHoverExpand] = useState(
    initialSidebarSnapshot.canHoverExpand,
  );
  const [responsiveReady, setResponsiveReady] = useState(
    initialSidebarSnapshot.responsiveReady,
  );
  const sidebarRef = useRef<HTMLElement | null>(null);
  const manualToggleRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationInteractionTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const previousCompactDrawerOpenRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const pointerInteractionRef = useRef(false);
  const navigationInteractionRef = useRef(false);
  const router = useRouter();

  const collapsedWidth = compact
    ? COMPACT_COLLAPSED_WIDTH
    : DESKTOP_COLLAPSED_WIDTH;
  const visualWidth = expanded ? EXPANDED_WIDTH : collapsedWidth;
  const layoutWidth = compact ? collapsedWidth : visualWidth;
  const showManualToggle = compact || (responsiveReady && !canHoverExpand);
  const pathname = router.pathname;

  useEffect(() => {
    sidebarHasMounted = true;
    ensureGlobalPointerTracker();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (expanded) {
      if (
        (compact && rememberedCompactExpanded) ||
        (rememberedDesktopExpanded && !compact)
      ) {
        setShowLabel(true);
      } else {
        timer = setTimeout(() => setShowLabel(true), LABEL_DELAY_MS);
      }
    } else {
      setShowLabel(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [canHoverExpand, compact, expanded]);

  useIsomorphicLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--app-sidebar-width",
      `${layoutWidth}px`,
    );
  }, [layoutWidth]);

  useIsomorphicLayoutEffect(() => {
    const compactQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
    const hoverQuery = window.matchMedia(HOVER_MEDIA_QUERY);

    const syncResponsiveState = () => {
      const nextCompact = compactQuery.matches;
      const nextCanHoverExpand = hoverQuery.matches && !nextCompact;

      setCompact(nextCompact);
      setCanHoverExpand(nextCanHoverExpand);
      setResponsiveReady(true);

      if (nextCompact) {
        setExpanded(rememberedCompactExpanded);
        setShowLabel(rememberedCompactExpanded);
        onHoverChange?.(rememberedCompactExpanded);
        return;
      }

      if (!nextCanHoverExpand) {
        setExpanded(rememberedDesktopExpanded);
        setShowLabel(rememberedDesktopExpanded);
        onHoverChange?.(rememberedDesktopExpanded);
        return;
      }

      const shouldStayExpanded = shouldKeepDesktopSidebarExpanded();

      if (!shouldStayExpanded) {
        rememberedDesktopExpanded = false;
      }

      setExpanded(shouldStayExpanded);
      setShowLabel(shouldStayExpanded);
      onHoverChange?.(shouldStayExpanded);
    };

    syncResponsiveState();
    compactQuery.addEventListener("change", syncResponsiveState);
    hoverQuery.addEventListener("change", syncResponsiveState);

    return () => {
      compactQuery.removeEventListener("change", syncResponsiveState);
      hoverQuery.removeEventListener("change", syncResponsiveState);
    };
  }, [onHoverChange]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (navigationInteractionTimerRef.current) {
        clearTimeout(navigationInteractionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!compact || !expanded) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      rememberedCompactExpanded = false;
      setExpanded(false);
      setShowLabel(false);
      onHoverChange?.(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [compact, expanded, onHoverChange]);

  useEffect(() => {
    const compactDrawerOpen = compact && expanded;

    if (compactDrawerOpen) {
      manualToggleRef.current?.focus();
    } else if (previousCompactDrawerOpenRef.current) {
      manualToggleRef.current?.focus();
    }

    previousCompactDrawerOpenRef.current = compactDrawerOpen;
  }, [compact, expanded]);

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function setExpandedState(nextExpanded: boolean) {
    clearCloseTimer();
    setExpanded(nextExpanded);

    if (compact) {
      rememberedCompactExpanded = nextExpanded;
    } else {
      rememberedDesktopExpanded = nextExpanded;
    }

    onHoverChange?.(nextExpanded);
  }

  function scheduleCollapse() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setExpanded(false);

      if (compact) {
        rememberedCompactExpanded = false;
      } else {
        rememberedDesktopExpanded = false;
      }

      onHoverChange?.(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (pointerInteractionRef.current || navigationInteractionRef.current)
      return;

    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      if (!compact && pointerInsideRef.current) return;
      if (!compact && !canHoverExpand) return;

      setExpandedState(false);
    }
  }

  function handleManualToggle() {
    setExpandedState(!expanded);
  }

  function rememberNavigationInteraction() {
    clearCloseTimer();
    navigationInteractionRef.current = true;

    if (compact) {
      rememberedCompactExpanded = false;
      setExpanded(false);
      setShowLabel(false);
      onHoverChange?.(false);
    } else {
      rememberedDesktopExpanded = expanded;
    }

    if (navigationInteractionTimerRef.current) {
      clearTimeout(navigationInteractionTimerRef.current);
    }

    navigationInteractionTimerRef.current = setTimeout(() => {
      navigationInteractionRef.current = false;
      navigationInteractionTimerRef.current = null;
    }, 500);
  }

  function trapCompactDrawerFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (!compact || !expanded || event.key !== "Tab") return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const focusable = Array.from(
      sidebar.querySelectorAll<HTMLElement>(
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

  function markPointerInteraction(event: React.PointerEvent<HTMLElement>) {
    rememberPointerPosition(event.nativeEvent);
    // Avoid treating nav-link pointer clicks as blur-driven collapse events
    // while the next page is mounting the shared sidebar again.
    pointerInteractionRef.current = true;
    window.setTimeout(() => {
      pointerInteractionRef.current = false;
    }, 160);
  }

  function renderNavItem(item: SidebarNavItem) {
    const locked = Boolean(item.gated && !user);

    return (
      <li key={item.href} className="list-none">
        <SidebarItem
          active={isNavItemActive(item, pathname)}
          expanded={expanded}
          item={item}
          locked={locked}
          onNavigate={rememberNavigationInteraction}
          showLabel={showLabel}
          onLockedSelect={() => authDialog.openSignIn(item.href)}
        />
      </li>
    );
  }

  return (
    <>
      <a
        href={`#${skipTargetId}`}
        className={[
          "sr-only fixed left-2 top-2 z-[1100] rounded-md bg-[var(--fit-color-brand-start)] px-3 py-2 text-white no-underline shadow-lg",
          fitType.control,
          "focus:not-sr-only focus:no-underline",
          focusRing,
        ].join(" ")}
      >
        {skipLabel}
      </a>

      {compact && expanded ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-[990] cursor-default bg-black/45 backdrop-blur-[2px]"
          onClick={() => setExpandedState(false)}
          style={{ left: visualWidth }}
        />
      ) : null}

      <aside
        ref={sidebarRef}
        aria-label="Application navigation"
        aria-modal={compact && expanded ? true : undefined}
        className="fixed left-0 top-0 z-[1000] flex h-screen flex-col overflow-x-hidden border-r border-[#141622] bg-[#07080a] text-[#dce4ff] shadow-[18px_0_40px_rgba(0,0,0,0.28)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
        role={compact && expanded ? "dialog" : undefined}
        onBlurCapture={handleBlur}
        onKeyDownCapture={trapCompactDrawerFocus}
        onPointerDownCapture={markPointerInteraction}
        onFocusCapture={() => {
          if (!compact && canHoverExpand && !pointerInteractionRef.current) {
            setExpandedState(true);
          }
        }}
        onPointerEnter={(event) => {
          rememberPointerPosition(event.nativeEvent);
          pointerInsideRef.current = true;
          if (canHoverExpand) setExpandedState(true);
        }}
        onPointerLeave={(event) => {
          rememberPointerPosition(event.nativeEvent);
          pointerInsideRef.current = false;
          if (navigationInteractionRef.current) return;
          if (
            canHoverExpand &&
            !event.currentTarget.contains(document.activeElement)
          ) {
            scheduleCollapse();
          }
        }}
        style={{ width: visualWidth, colorScheme: "dark" }}
      >
        <div className="border-b border-[#141622] px-2 py-4">
          {showManualToggle ? (
            <button
              ref={manualToggleRef}
              type="button"
              aria-controls="app-sidebar-navigation"
              aria-expanded={expanded}
              aria-label={
                expanded ? "Collapse navigation" : "Expand navigation"
              }
              className={[
                "flex min-h-[48px] w-full touch-manipulation items-center gap-3 rounded-lg text-left no-underline transition-colors duration-150 hover:bg-white/[0.04] hover:no-underline",
                expanded ? "justify-start px-2" : "justify-center px-0",
                focusRing,
              ].join(" ")}
              onClick={handleManualToggle}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#14182d] via-[#151126] to-[#0f1016] text-[#8ea0ff] shadow-[inset_0_0_0_1px_rgba(123,140,255,0.16)]"
                aria-hidden="true"
              >
                {expanded ? (
                  <KeyboardDoubleArrowLeftRoundedIcon sx={{ fontSize: 20 }} />
                ) : (
                  <MenuRoundedIcon sx={{ fontSize: 20 }} />
                )}
              </span>
              <span
                className={[
                  "min-w-0 truncate transition-opacity duration-150",
                  fitType.navLabel,
                  showLabel ? "opacity-100" : "sr-only opacity-0",
                ].join(" ")}
              >
                {expanded ? "Collapse navigation" : "Expand navigation"}
              </span>
            </button>
          ) : (
            <Link
              href="/"
              aria-label="FIT home"
              className={[
                "flex min-h-[48px] touch-manipulation items-center gap-3 rounded-lg text-left no-underline transition-colors duration-150 hover:bg-white/[0.04] hover:no-underline",
                expanded ? "justify-start px-2" : "justify-center px-0",
                focusRing,
              ].join(" ")}
              title="FIT home"
            >
              <FitLogo
                decorative
                showWordmark={showLabel}
                size={expanded ? "medium" : "compact"}
                subtitle="Financial Investment Tool"
                wordmark="FIT"
              />
            </Link>
          )}
        </div>

        <nav
          id="app-sidebar-navigation"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Primary navigation"
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {mainNavItems.map(renderNavItem)}
          </ul>

          <div className="mt-auto border-t border-[#141622] pt-4">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {utilityNavItems.map(renderNavItem)}
              {user ? (
                <li className="list-none">
                  <button
                    type="button"
                    className={[
                      "group flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-lg py-2 text-left text-[#a5adbf] no-underline transition-[background-color,color] duration-150 hover:bg-[linear-gradient(135deg,rgba(83,103,255,0.10),rgba(124,58,237,0.12))] hover:text-[#f4f7ff] hover:no-underline",
                      expanded ? "justify-start px-2" : "justify-center px-0",
                      focusRing,
                    ].join(" ")}
                    onClick={() => signOut()}
                    title="Log out"
                    aria-label="Log out"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#141419] text-[#8f98aa] transition-colors duration-150 group-hover:text-[#dce4ff]"
                      aria-hidden="true"
                    >
                      <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                    </span>
                    <span
                      className={[
                        "min-w-0 flex-1 truncate transition-opacity duration-150",
                        fitType.navLabel,
                        showLabel ? "opacity-100" : "sr-only opacity-0",
                      ].join(" ")}
                    >
                      Log out
                    </span>
                  </button>
                </li>
              ) : null}
              <li className="list-none">
                <SidebarItem
                  active={pathname === "/"}
                  expanded={expanded}
                  item={{
                    href: "/",
                    label: "Back to Home",
                    icon: HomeRoundedIcon,
                  }}
                  locked={false}
                  onNavigate={rememberNavigationInteraction}
                  showLabel={showLabel}
                  onLockedSelect={() => authDialog.openSignIn("/")}
                />
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <AuthDialog {...authDialog.dialogProps} onHide={authDialog.close} />
    </>
  );
};

export default Sidebar;
