import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import {
  COMMUNITY_APP_RAIL_WIDTH_PX,
  COMMUNITY_COMPACT_MEDIA_QUERY,
  COMMUNITY_CONTENT_MAX_WIDTH_PX,
  COMMUNITY_FEED_NAV_ITEMS,
  COMMUNITY_PAGE_WIDTH,
  COMMUNITY_SIDEBAR_FLOAT_GAP_PX,
  COMMUNITY_SIDEBAR_COLLAPSED_WIDTH_PX,
  COMMUNITY_SIDEBAR_WIDTH_PX,
  COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX,
  COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX,
} from "../constants";
import { cn, communityUi } from "../design";
import communityStyles from "@/styles/community.module.css";
import type { CommunityFeedView } from "../types";
import { useCommunityController } from "../useCommunityController";
import { isDiscussionDraftDirty } from "../utils";
import { CommunityComposer } from "./CommunityComposer";
import { CommunityNotice, FeedbackStack, StatusMessage } from "./CommunityFeedback";
import { CommunitySidebar } from "./CommunitySidebar";
import { CommunityToolbar } from "./CommunityToolbar";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EmptyState, LoadingDiscussions } from "./CommunityStates";
import { PostCard } from "./PostCard";

const communityFeedViewIds = new Set(
  COMMUNITY_FEED_NAV_ITEMS.map((item) => item.id),
);
const communityLayoutStyle = {
  "--community-app-rail-width": `var(--app-sidebar-width, ${COMMUNITY_APP_RAIL_WIDTH_PX}px)`,
  "--community-content-max-width": `${COMMUNITY_CONTENT_MAX_WIDTH_PX}px`,
  "--community-toolbar-control-height": `${COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX}px`,
  "--community-toolbar-y": `${COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX}px`,
  "--community-sidebar-width": `${COMMUNITY_SIDEBAR_WIDTH_PX}px`,
  "--community-sidebar-collapsed-width": `${COMMUNITY_SIDEBAR_COLLAPSED_WIDTH_PX}px`,
} as React.CSSProperties & {
  "--community-app-rail-width": string;
  "--community-content-max-width": string;
  "--community-toolbar-control-height": string;
  "--community-toolbar-y": string;
  "--community-sidebar-width": string;
  "--community-sidebar-collapsed-width": string;
};

let rememberedDesktopSidebarCollapsed = false;

function isCommunityFeedView(value: string): value is CommunityFeedView {
  return communityFeedViewIds.has(value as CommunityFeedView);
}

function getCommunityFeedHref(view: CommunityFeedView, query: string) {
  const params = new URLSearchParams();
  params.set("view", view);

  const trimmedQuery = query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);

  const serialized = params.toString();
  return serialized ? `/Community?${serialized}` : "/Community";
}

function getCommunityCreateHref(view: CommunityFeedView, query: string) {
  const feedHref = getCommunityFeedHref(view, query);
  const queryStart = feedHref.indexOf("?");
  return queryStart === -1
    ? "/CommunityCreate"
    : `/CommunityCreate${feedHref.slice(queryStart)}`;
}

export function CommunityMain({
  mode = "feed",
  supabase,
}: {
  mode?: "feed" | "create";
  supabase: SupabaseClient | null;
}) {
  const router = useRouter();
  const community = useCommunityController(supabase);
  const { pushFeedback, setFeedView, setQuery } = community;
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    rememberedDesktopSidebarCollapsed,
  );
  const [compactSidebar, setCompactSidebar] = React.useState(false);
  const sidebarPinnedRef = React.useRef<HTMLDivElement | null>(null);
  const sidebarMeasureFrameRef = React.useRef(0);
  const blockedNavigationRef = React.useRef<string | null>(null);
  const draftDirty = React.useMemo(
    () => isDiscussionDraftDirty(community.draft),
    [community.draft],
  );

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
    community.feedback.length,
    community.filteredPosts.length,
    community.loadError,
    community.loadingCommunity,
    mode,
    syncSidebarTop,
  ]);

  React.useEffect(() => {
    const query = window.matchMedia(COMMUNITY_COMPACT_MEDIA_QUERY);
    const syncSidebarState = () => {
      setCompactSidebar(query.matches);
      setSidebarCollapsed(
        query.matches ? true : rememberedDesktopSidebarCollapsed,
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

  React.useEffect(() => {
    if (!draftDirty) blockedNavigationRef.current = null;
  }, [draftDirty]);

  React.useEffect(() => {
    if (mode !== "create" || !draftDirty) return;

    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [draftDirty, mode]);

  React.useEffect(() => {
    if (mode !== "create") return;

    router.beforePopState(() => {
      if (!draftDirty) return true;

      if (blockedNavigationRef.current === "browser-back") {
        blockedNavigationRef.current = null;
        return true;
      }

      blockedNavigationRef.current = "browser-back";
      pushFeedback({
        tone: "info",
        title: "Unsaved discussion",
        message: "Your draft has unsaved content. Press Back again to leave without posting.",
      });
      return false;
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [draftDirty, mode, pushFeedback, router]);

  const handleSidebarCollapsedChange = React.useCallback(
    (nextCollapsed: boolean) => {
      setSidebarCollapsed(nextCollapsed);

      if (!compactSidebar) {
        rememberedDesktopSidebarCollapsed = nextCollapsed;
      }
    },
    [compactSidebar],
  );

  React.useEffect(() => {
    if (!router.isReady) return;

    const queryView = router.query.view;
    const querySearch = router.query.q;

    if (typeof queryView === "string" && isCommunityFeedView(queryView)) {
      setFeedView(queryView);
    } else {
      setFeedView("top");
    }

    setQuery(typeof querySearch === "string" ? querySearch : "");
  }, [router.isReady, router.query.q, router.query.view, setFeedView, setQuery]);

  const navigateWithDraftGuard = React.useCallback(
    (key: string, navigate: () => void) => {
      if (mode !== "create" || !draftDirty) {
        blockedNavigationRef.current = null;
        navigate();
        return;
      }

      if (blockedNavigationRef.current === key) {
        blockedNavigationRef.current = null;
        navigate();
        return;
      }

      blockedNavigationRef.current = key;
      pushFeedback({
        tone: "info",
        title: "Unsaved discussion",
        message: "Your draft has unsaved content. Select the action again to leave this page.",
      });
    },
    [draftDirty, mode, pushFeedback],
  );

  const handleFeedViewChange = React.useCallback(
    (view: CommunityFeedView) => {
      if (mode === "create") {
        navigateWithDraftGuard(`feed:${view}`, () => {
          setFeedView(view);
          router.push(getCommunityFeedHref(view, community.query));
        });
        return;
      }

      setFeedView(view);
      router.replace(getCommunityFeedHref(view, community.query), undefined, {
        shallow: true,
      });
    },
    [community.query, mode, navigateWithDraftGuard, router, setFeedView],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const query = community.query.trim();
    const href = getCommunityFeedHref(community.feedView, query);

    if (mode === "create") {
      navigateWithDraftGuard("search", () => {
        router.push(href);
      });
      return;
    }

    router.replace(href, undefined, { shallow: true });
  }, [community.feedView, community.query, mode, navigateWithDraftGuard, router]);

  const handleToolbarActionClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (mode !== "create") return;

      event.preventDefault();
      navigateWithDraftGuard("back-to-feed", () => {
        router.push(getCommunityFeedHref(community.feedView, community.query));
      });
    },
    [community.feedView, community.query, mode, navigateWithDraftGuard, router],
  );

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

        <header>
          <h1 className="text-balance text-[28px] font-extrabold leading-tight tracking-normal text-white sm:text-[30px]">
            Community
          </h1>
          <p className="mt-2 max-w-[34rem] text-pretty text-[15px] text-[#b9c1d0]">
            Connect with fellow investors and share market insights
          </p>
        </header>

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
              ref={sidebarPinnedRef}
              className={cn(
                communityStyles.sidebarPinned,
                sidebarCollapsed ? "lg:w-16" : "lg:w-56",
              )}
            >
              <CommunitySidebar
                activeView={community.feedView}
                collapsed={sidebarCollapsed}
                compact={compactSidebar}
                counts={community.feedCounts}
                onCollapsedChange={handleSidebarCollapsedChange}
                onViewChange={handleFeedViewChange}
              />
            </div>
          </div>

          <div className="min-w-0">
            <CommunityToolbar
              actionHref={
                mode === "create"
                  ? getCommunityFeedHref(community.feedView, community.query)
                  : getCommunityCreateHref(community.feedView, community.query)
              }
              actionLabel={mode === "create" ? "Back" : "Create post"}
              actionType={mode === "create" ? "back" : "create"}
              query={community.query}
              onActionClick={handleToolbarActionClick}
              onQueryChange={community.setQuery}
              onSearchSubmit={handleSearchSubmit}
            />

            {!supabase ? (
              <div className="mt-4">
                <CommunityNotice>
                  Supabase environment variables are missing, so new posts and
                  comments stay local until the page refreshes.
                </CommunityNotice>
              </div>
            ) : null}

            {mode === "create" ? (
              <CommunityComposer
                className={communityStyles.primaryContentStart}
                draft={community.draft}
                creating={community.creating}
                canAttachImage={Boolean(supabase && community.currentUserId)}
                onDraftChange={community.setDraftField}
                onClearTags={community.clearDraftTags}
                onDraftImageChange={community.setDraftImage}
                onToggleTag={community.toggleDraftTag}
                onSubmit={async () => {
                  const created = await community.handleCreatePost();
                  if (created) {
                    router.push(
                      getCommunityFeedHref(community.feedView, community.query),
                    );
                  }
                }}
              />
            ) : null}

            <FeedbackStack
              items={community.feedback}
              onDismiss={community.dismissFeedback}
            />

            {community.loadError ? (
              <div className="mt-4">
                <StatusMessage
                  tone="error"
                  title="Community data did not fully load"
                >
                  {community.loadError}
                </StatusMessage>
              </div>
            ) : null}

            {mode === "feed" ? (
              <section
                className={cn(communityStyles.primaryContentStart, "space-y-4")}
                data-community-content-start
                aria-label="Community discussions"
                aria-busy={community.loadingCommunity}
              >
              {community.loadingCommunity ? (
                <LoadingDiscussions />
              ) : community.filteredPosts.length ? (
                community.filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={community.commentsState.byPost[post.id] ?? []}
                    count={
                      community.commentsState.counts[post.id] ??
                      post.commentCount
                    }
                    liked={community.likedPostIds.has(post.id)}
                    likeBusy={community.likingPostIds.has(post.id)}
                    canDeletePost={community.canDeletePost(post)}
                    canDeleteComment={community.canDeleteComment}
                    canAttachCommentImage={Boolean(
                      supabase && community.currentUserId,
                    )}
                    onAddComment={community.handleAddComment}
                    onDeleteComment={community.requestDeleteComment}
                    onDeletePost={
                      community.canDeletePost(post)
                        ? community.requestDeletePost
                        : undefined
                    }
                    onToggleLike={community.handleToggleLike}
                  />
                ))
              ) : (
                <EmptyState
                  query={community.query}
                  view={community.feedView}
                />
              )}
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        pending={community.pendingDelete}
        busy={community.deleting}
        onCancel={community.cancelPendingDelete}
        onConfirm={community.confirmPendingDelete}
      />
    </main>
  );
}
