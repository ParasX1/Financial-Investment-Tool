// File purpose: Renders the Community Feed loading, warning, empty, and populated states.
import communityStyles from "../styles/community.module.css";
import { cn, FOCUS_VISIBLE } from "../design";
import type {
  CommentUI,
  CommentsState,
  CommunityFeedView,
  NewComment,
  PostUI,
} from "../types";
import { StatusMessage } from "./CommunityFeedback";
import { EmptyState, LoadingDiscussions } from "./CommunityStates";
import { PostCard } from "./PostCard";

export function CommunityFeed({
  canAttachCommentImage,
  canDeleteComment,
  canDeletePost,
  commentsState,
  commentsReady = true,
  hasLoadedPosts,
  likedPostIds,
  likesReady = true,
  likingPostIds,
  savedPostIds,
  savesReady = true,
  savingPostIds,
  loadError,
  loading,
  canRetry = true,
  retrying = false,
  onRetry,
  onAddComment,
  onDeleteComment,
  onDeletePost,
  onToggleLike,
  onToggleSave,
  onReport,
  posts,
  query,
  view,
}: {
  canAttachCommentImage: boolean;
  canDeleteComment: (comment: CommentUI) => boolean;
  canDeletePost: (post: PostUI) => boolean;
  commentsState: CommentsState;
  commentsReady?: boolean;
  hasLoadedPosts: boolean;
  likedPostIds: Set<string>;
  likesReady?: boolean;
  likingPostIds: Set<string>;
  savedPostIds: Set<string>;
  savesReady?: boolean;
  savingPostIds: Set<string>;
  loadError: string | null;
  loading: boolean;
  canRetry?: boolean;
  retrying?: boolean;
  onRetry: () => void;
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost: (postId: string) => Promise<void> | void;
  onToggleLike: (postId: string) => Promise<void> | void;
  onToggleSave: (postId: string) => Promise<void> | void;
  onReport: (postId: string) => void;
  posts: PostUI[];
  query: string;
  view: CommunityFeedView;
}) {
  const hardLoadError = Boolean(loadError && !loading && !hasLoadedPosts);
  const viewUnavailable =
    (view === "saved" && !savesReady) ||
    (view === "liked" && !likesReady) ||
    (view === "commented" && !commentsReady);

  return (
    <>
      {loadError && !hardLoadError ? (
        <div className="mt-4">
          <StatusMessage tone="error" title="Community data did not fully load">
            {loadError}
            {canRetry ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className={cn(
                  "mt-3 block underline underline-offset-4 disabled:opacity-60",
                  FOCUS_VISIBLE,
                )}
              >
                {retrying ? "Retrying…" : "Try again"}
              </button>
            ) : null}
          </StatusMessage>
        </div>
      ) : null}

      <section
        className={cn(communityStyles.primaryContentStart, "space-y-4")}
        data-community-content-start
        aria-label="Community discussions"
        aria-busy={loading || retrying}
      >
        {loading ? (
          <LoadingDiscussions />
        ) : hardLoadError ? (
          <StatusMessage tone="error" title="Community is unavailable">
            {loadError}
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                "mt-3 block underline underline-offset-4",
                FOCUS_VISIBLE,
              )}
            >
              Try again
            </button>
          </StatusMessage>
        ) : posts.length ? (
          posts.map((post) => {
            const mayDeletePost = canDeletePost(post);

            return (
              <PostCard
                key={post.id}
                post={post}
                comments={commentsState.byPost[post.id] ?? []}
                count={commentsState.counts[post.id] ?? post.commentCount}
                liked={likesReady ? likedPostIds.has(post.id) : undefined}
                likeBusy={likingPostIds.has(post.id)}
                saved={savesReady ? savedPostIds.has(post.id) : undefined}
                saveBusy={savingPostIds.has(post.id)}
                canDeletePost={mayDeletePost}
                canDeleteComment={canDeleteComment}
                canAttachCommentImage={canAttachCommentImage}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onDeletePost={mayDeletePost ? onDeletePost : undefined}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
                onReport={onReport}
              />
            );
          })
        ) : viewUnavailable ? (
          <StatusMessage
            tone="info"
            title="This view is unavailable until community data reloads"
          >
            Use Try again above to reload your discussion activity.
          </StatusMessage>
        ) : (
          <EmptyState query={query} view={view} />
        )}
      </section>
    </>
  );
}
