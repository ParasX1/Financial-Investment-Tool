import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMUNITY_PAGE_WIDTH } from "../constants";
import { communityUi } from "../design";
import { useCommunityController } from "../useCommunityController";
import { CommunityComposer } from "./CommunityComposer";
import { CommunityNotice, FeedbackStack, StatusMessage } from "./CommunityFeedback";
import { CommunityToolbar } from "./CommunityToolbar";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EmptyState, LoadingDiscussions } from "./CommunityStates";
import { PostCard } from "./PostCard";

export function CommunityMain({ supabase }: { supabase: SupabaseClient | null }) {
  const community = useCommunityController(supabase);

  return (
    <main
      id="community-main"
      tabIndex={-1}
      className={communityUi.page}
    >
      <div
        className={communityUi.pageInner}
        style={{ width: COMMUNITY_PAGE_WIDTH }}
      >
        <header>
          <h1 className="text-balance text-[28px] font-extrabold leading-tight tracking-normal text-white sm:text-[30px]">
            Community
          </h1>
          <p className="mt-2 max-w-[34rem] text-pretty text-[15px] text-[#b9c1d0]">
            Connect with fellow investors and share market insights
          </p>
        </header>

        <CommunityComposer
          draft={community.draft}
          creating={community.creating}
          onDraftChange={community.setDraftField}
          onSubmit={community.handleCreatePost}
        />

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

        {community.loadError ? (
          <div className="mt-4">
            <StatusMessage tone="error" title="Community data did not fully load">
              {community.loadError}
            </StatusMessage>
          </div>
        ) : null}

        <CommunityToolbar
          query={community.query}
          sort={community.sort}
          onQueryChange={community.setQuery}
          onSortChange={community.setSort}
        />

        <section
          className="mt-6 space-y-4"
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
                count={community.commentsState.counts[post.id] ?? post.commentCount}
                liked={community.likedPostIds.has(post.id)}
                likeBusy={community.likingPostIds.has(post.id)}
                canDeletePost={community.canDeletePost(post)}
                canDeleteComment={community.canDeleteComment}
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
            <EmptyState query={community.query} />
          )}
        </section>
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
