// File purpose: Composes the Community page experience across feed and create modes.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";
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
import {
  getCommunityCreateHref,
  getCommunityFeedHref,
} from "../lib/communityRouting";
import { cn, communityUi } from "../design";
import communityStyles from "../styles/community.module.css";
import type { CommunityFeedView, CommunityTopTimeRange } from "../types";
import { useCommunityController } from "../hooks/useCommunityController";
import { useCommunityDraftNavigation } from "../hooks/useCommunityDraftNavigation";
import { useCommunityRouteSync } from "../hooks/useCommunityRouteSync";
import { useCommunitySidebarLayout } from "../hooks/useCommunitySidebarLayout";
import { CommunityComposer } from "./CommunityComposer";
import { CommunityNotice, FeedbackStack, StatusMessage } from "./CommunityFeedback";
import { CommunitySidebar } from "./CommunitySidebar";
import { CommunityToolbar } from "./CommunityToolbar";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EmptyState, LoadingDiscussions } from "./CommunityStates";
import { PostCard } from "./PostCard";

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

export function CommunityMain({
  mode = "feed",
  supabase,
}: {
  mode?: "feed" | "create";
  supabase: SupabaseClient | null;
}) {
  const router = useRouter();
  const community = useCommunityController(supabase);
  const { pushFeedback, setFeedView, setQuery, setTopTimeRange } = community;
  const {
    compactSidebar,
    handleSidebarCollapsedChange,
    sidebarCollapsed,
    sidebarPinnedRef,
  } = useCommunitySidebarLayout({
    contentCount: community.filteredPosts.length,
    feedbackCount: community.feedback.length,
    loadError: community.loadError,
    loadingCommunity: community.loadingCommunity,
    mode,
  });
  const { navigateWithDraftGuard } = useCommunityDraftNavigation({
    draft: community.draft,
    mode,
    pushFeedback,
    router,
  });

  useCommunityRouteSync({
    router,
    setFeedView,
    setQuery,
    setTopTimeRange,
  });

  const handleFeedViewChange = React.useCallback(
    (view: CommunityFeedView) => {
      if (mode === "create") {
        navigateWithDraftGuard(`feed:${view}`, () => {
          setFeedView(view);
          router.push(
            getCommunityFeedHref(
              view,
              community.query,
              community.topTimeRange,
            ),
          );
        });
        return;
      }

      setFeedView(view);
      router.replace(
        getCommunityFeedHref(view, community.query, community.topTimeRange),
        undefined,
        {
          shallow: true,
        },
      );
    },
    [
      community.query,
      community.topTimeRange,
      mode,
      navigateWithDraftGuard,
      router,
      setFeedView,
    ],
  );

  const handleTopTimeRangeChange = React.useCallback(
    (range: CommunityTopTimeRange) => {
      setTopTimeRange(range);
      const href =
        mode === "create"
          ? getCommunityCreateHref(community.feedView, community.query, range)
          : getCommunityFeedHref(community.feedView, community.query, range);

      router.replace(href, undefined, { shallow: true });
    },
    [community.feedView, community.query, mode, router, setTopTimeRange],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const query = community.query.trim();
    const href = getCommunityFeedHref(
      community.feedView,
      query,
      community.topTimeRange,
    );

    if (mode === "create") {
      navigateWithDraftGuard("search", () => {
        router.push(href);
      });
      return;
    }

    router.replace(href, undefined, { shallow: true });
  }, [
    community.feedView,
    community.query,
    community.topTimeRange,
    mode,
    navigateWithDraftGuard,
    router,
  ]);

  const handleToolbarActionClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (mode !== "create") return;

      event.preventDefault();
      navigateWithDraftGuard("back-to-feed", () => {
        router.push(
          getCommunityFeedHref(
            community.feedView,
            community.query,
            community.topTimeRange,
          ),
        );
      });
    },
    [
      community.feedView,
      community.query,
      community.topTimeRange,
      mode,
      navigateWithDraftGuard,
      router,
    ],
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
              ref={sidebarPinnedRef}
              className={communityStyles.sidebarPinned}
            >
              <CommunitySidebar
                activeView={community.feedView}
                activeTimeRange={community.topTimeRange}
                collapsed={sidebarCollapsed}
                compact={compactSidebar}
                counts={community.feedCounts}
                onCollapsedChange={handleSidebarCollapsedChange}
                onTimeRangeChange={handleTopTimeRangeChange}
                onViewChange={handleFeedViewChange}
              />
            </div>
          </div>

          <div className="min-w-0">
            <CommunityToolbar
              actionHref={
                mode === "create"
                  ? getCommunityFeedHref(
                      community.feedView,
                      community.query,
                      community.topTimeRange,
                    )
                  : getCommunityCreateHref(
                      community.feedView,
                      community.query,
                      community.topTimeRange,
                    )
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
                      getCommunityFeedHref(
                        community.feedView,
                        community.query,
                        community.topTimeRange,
                      ),
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
