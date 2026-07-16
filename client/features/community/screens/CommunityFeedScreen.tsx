// File purpose: Owns the Community Feed route composition and feed-only navigation lifecycle.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { getCommunityCreateHref, getCommunityFeedHref } from "../lib/communityRouting";
import { useCommunityFeedController } from "../hooks/useCommunityFeedController";
import { useCommunityRouteSync } from "../hooks/useCommunityRouteSync";
import type { CommunityFeedView, CommunityTopTimeRange } from "../types";
import { CommunityFeed } from "../components/CommunityFeed";
import { FeedbackStack, CommunityNotice } from "../components/CommunityFeedback";
import { CommunityLayout } from "../components/CommunityLayout";
import { CommunityToolbar } from "../components/CommunityToolbar";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";

export function CommunityFeedScreen({
  supabase,
}: {
  supabase: SupabaseClient | null;
}) {
  const router = useRouter();
  const community = useCommunityFeedController(supabase);
  const { setFeedView, setQuery, setTopTimeRange } = community;

  useCommunityRouteSync({
    router,
    setFeedView,
    setQuery,
    setTopTimeRange,
  });

  const handleFeedViewChange = React.useCallback(
    (view: CommunityFeedView) => {
      setFeedView(view);
      router.replace(
        getCommunityFeedHref(
          view,
          community.query,
          community.topTimeRange,
        ),
        undefined,
        { shallow: true },
      );
    },
    [
      community.query,
      community.topTimeRange,
      router,
      setFeedView,
    ],
  );

  const handleTopTimeRangeChange = React.useCallback(
    (range: CommunityTopTimeRange) => {
      setTopTimeRange(range);
      router.replace(
        getCommunityFeedHref(community.feedView, community.query, range),
        undefined,
        { shallow: true },
      );
    },
    [community.feedView, community.query, router, setTopTimeRange],
  );

  const handleSearchSubmit = React.useCallback(() => {
    router.replace(
      getCommunityFeedHref(
        community.feedView,
        community.query.trim(),
        community.topTimeRange,
      ),
      undefined,
      { shallow: true },
    );
  }, [
    community.feedView,
    community.query,
    community.topTimeRange,
    router,
  ]);

  return (
    <>
      <CommunityLayout
        activeTimeRange={community.topTimeRange}
        activeView={community.feedView}
        counts={community.feedCounts}
        onTimeRangeChange={handleTopTimeRangeChange}
        onViewChange={handleFeedViewChange}
        toolbar={
          <CommunityToolbar
            actionHref={getCommunityCreateHref(
              community.feedView,
              community.query,
              community.topTimeRange,
            )}
            actionLabel="Create post"
            query={community.query}
            onQueryChange={community.setQuery}
            onSearchSubmit={handleSearchSubmit}
          />
        }
      >
        {!supabase ? (
          <div className="mt-4">
            <CommunityNotice>
              Supabase environment variables are missing, so new posts and
              comments stay local until the page refreshes.
            </CommunityNotice>
          </div>
        ) : null}

        <FeedbackStack
          items={community.feedback}
          onDismiss={community.dismissFeedback}
        />

        <CommunityFeed
          canAttachCommentImage={Boolean(
            supabase && community.currentUserId,
          )}
          canDeleteComment={community.canDeleteComment}
          canDeletePost={community.canDeletePost}
          commentsState={community.commentsState}
          hasLoadedPosts={community.hasLoadedPosts}
          likedPostIds={community.likedPostIds}
          likingPostIds={community.likingPostIds}
          loadError={community.loadError}
          loading={community.loadingCommunity}
          onAddComment={community.handleAddComment}
          onDeleteComment={community.requestDeleteComment}
          onDeletePost={community.requestDeletePost}
          onToggleLike={community.handleToggleLike}
          posts={community.filteredPosts}
          query={community.query}
          view={community.feedView}
        />
      </CommunityLayout>

      <DeleteConfirmDialog
        pending={community.pendingDelete}
        busy={community.deleting}
        onCancel={community.cancelPendingDelete}
        onConfirm={community.confirmPendingDelete}
      />
    </>
  );
}
