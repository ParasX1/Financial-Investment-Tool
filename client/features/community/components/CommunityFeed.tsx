// File purpose: Renders the Community Feed loading, warning, empty, and populated states.
import communityStyles from "../styles/community.module.css";
import { cn } from "../design";
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
  hasLoadedPosts,
  likedPostIds,
  likingPostIds,
  savedPostIds,
  savingPostIds,
  loadError,
  loading,
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
  hasLoadedPosts: boolean;
  likedPostIds: Set<string>;
  likingPostIds: Set<string>;
  savedPostIds: Set<string>;
  savingPostIds: Set<string>;
  loadError: string | null;
  loading: boolean;
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

  return (
    <>
      {loadError && !hardLoadError ? (
        <div className="mt-4">
          <StatusMessage
            tone="error"
            title="Community data did not fully load"
          >
            {loadError}
          </StatusMessage>
        </div>
      ) : null}

      <section
        className={cn(communityStyles.primaryContentStart, "space-y-4")}
        data-community-content-start
        aria-label="Community discussions"
        aria-busy={loading}
      >
        {loading ? (
          <LoadingDiscussions />
        ) : hardLoadError ? (
          <StatusMessage tone="error" title="Community is unavailable">
            {loadError}
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
                liked={likedPostIds.has(post.id)}
                likeBusy={likingPostIds.has(post.id)}
                saved={savedPostIds.has(post.id)}
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
        ) : (
          <EmptyState query={query} view={view} />
        )}
      </section>
    </>
  );
}
