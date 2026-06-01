import type {
  CommentUI,
  CommentsState,
  CommunityFeedCounts,
  CommunityFeedView,
  CommunityTopTimeRange,
  PostUI,
} from "./types";

function isCurrentUserPost(post: PostUI, currentUserId: string | null) {
  if (currentUserId && post.authorId === currentUserId) return true;
  return !post.fromDB && post.user === "You";
}

function isCurrentUserComment(comment: CommentUI, currentUserId: string | null) {
  if (currentUserId && comment.authorId === currentUserId) return true;
  return !comment.fromDB && comment.user === "You";
}

function hasCurrentUserComment(
  postId: string,
  commentsState: CommentsState,
  currentUserId: string | null,
) {
  return (commentsState.byPost[postId] ?? []).some((comment) =>
    isCurrentUserComment(comment, currentUserId),
  );
}

function matchesCommunitySearch(post: PostUI, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [post.user, post.title, post.body, ...post.tags]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function getTopTimeRangeCutoff(
  range: CommunityTopTimeRange,
  now = Date.now(),
) {
  if (range === "all-time") return null;

  const current = new Date(now);

  if (range === "past-hour") {
    return now - 60 * 60 * 1000;
  }

  if (range === "today") {
    return new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate(),
    ).getTime();
  }

  const getCalendarMonthCutoff = (monthsBack: number) => {
    const cutoff = new Date(now);
    const currentDay = cutoff.getDate();

    cutoff.setDate(1);
    cutoff.setMonth(cutoff.getMonth() - monthsBack);

    const lastDayOfTargetMonth = new Date(
      cutoff.getFullYear(),
      cutoff.getMonth() + 1,
      0,
    ).getDate();
    cutoff.setDate(Math.min(currentDay, lastDayOfTargetMonth));

    return cutoff.getTime();
  };

  if (range === "past-week") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
    return cutoff.getTime();
  }

  if (range === "past-month") {
    return getCalendarMonthCutoff(1);
  }

  return getCalendarMonthCutoff(12);
}

export function getCommunityFeedCounts({
  posts,
  likedPostIds,
  commentsState,
  currentUserId,
}: {
  posts: PostUI[];
  likedPostIds: Set<string>;
  commentsState: CommentsState;
  currentUserId: string | null;
}): CommunityFeedCounts {
  return {
    top: posts.length,
    new: posts.length,
    "my-posts": posts.filter((post) =>
      isCurrentUserPost(post, currentUserId),
    ).length,
    liked: posts.filter((post) => likedPostIds.has(post.id)).length,
    commented: posts.filter((post) =>
      hasCurrentUserComment(post.id, commentsState, currentUserId),
    ).length,
  };
}

export function getVisibleCommunityPosts({
  posts,
  query,
  view,
  topTimeRange = "all-time",
  now = Date.now(),
  likedPostIds,
  commentsState,
  currentUserId,
}: {
  posts: PostUI[];
  query: string;
  view: CommunityFeedView;
  topTimeRange?: CommunityTopTimeRange;
  now?: number;
  likedPostIds: Set<string>;
  commentsState: CommentsState;
  currentUserId: string | null;
}) {
  const matchingPosts = posts.filter((post) =>
    matchesCommunitySearch(post, query),
  );

  const scopedPosts = matchingPosts.filter((post) => {
    if (view === "my-posts") {
      return isCurrentUserPost(post, currentUserId);
    }

    if (view === "liked") {
      return likedPostIds.has(post.id);
    }

    if (view === "commented") {
      return hasCurrentUserComment(post.id, commentsState, currentUserId);
    }

    return true;
  });

  if (view === "top") {
    const cutoff = getTopTimeRangeCutoff(topTimeRange, now);
    const timeScopedPosts =
      cutoff === null
        ? scopedPosts
        : scopedPosts.filter((post) => post.sortTime >= cutoff);

    return [...timeScopedPosts].sort((a, b) => b.votes - a.votes);
  }

  return [...scopedPosts].sort((a, b) => b.sortTime - a.sortTime);
}
