// File purpose: Stores comment lists, counts, and duplicate prevention logic for Community discussions.
import type {
  CommentEntry,
  CommentUI,
  CommentsAction,
  CommentsState,
  PostUI,
} from "../types";

export function createCommentsState(
  posts: PostUI[],
  comments: CommentEntry[] = []
): CommentsState {
  const byPost: Record<string, CommentUI[]> = Object.fromEntries(
    posts.map((post) => [post.id, []])
  );
  const counts: Record<string, number> = Object.fromEntries(
    posts.map((post) => [post.id, post.fromDB ? 0 : post.commentCount])
  );
  const seenIds: Record<string, true> = {};

  comments.forEach(({ postId, comment }) => {
    if (seenIds[comment.id]) return;

    seenIds[comment.id] = true;
    (byPost[postId] ||= []).push(comment);
    counts[postId] = (counts[postId] ?? 0) + 1;
  });

  return { byPost, counts, seenIds };
}

export function commentsReducer(
  state: CommentsState,
  action: CommentsAction
): CommentsState {
  switch (action.type) {
    case "reset":
      return createCommentsState(action.posts, action.comments);

    case "ensurePost":
      if (state.byPost[action.postId] && action.postId in state.counts) {
        return state;
      }

      return {
        ...state,
        byPost: { ...state.byPost, [action.postId]: [] },
        counts: {
          ...state.counts,
          [action.postId]: action.initialCount ?? 0,
        },
      };

    case "removePost": {
      const removedComments = state.byPost[action.postId] ?? [];
      const nextByPost = { ...state.byPost };
      const nextCounts = { ...state.counts };
      const nextSeenIds = { ...state.seenIds };

      delete nextByPost[action.postId];
      delete nextCounts[action.postId];
      removedComments.forEach((comment) => {
        delete nextSeenIds[comment.id];
      });

      return {
        byPost: nextByPost,
        counts: nextCounts,
        seenIds: nextSeenIds,
      };
    }

    case "addComment": {
      const current = state.byPost[action.postId] ?? [];

      if (
        state.seenIds[action.comment.id] ||
        current.some((comment) => comment.id === action.comment.id)
      ) {
        return state.seenIds[action.comment.id]
          ? state
          : {
              ...state,
              seenIds: { ...state.seenIds, [action.comment.id]: true },
            };
      }

      return {
        byPost: {
          ...state.byPost,
          [action.postId]: [action.comment, ...current],
        },
        counts: {
          ...state.counts,
          [action.postId]: (state.counts[action.postId] ?? 0) + 1,
        },
        seenIds: { ...state.seenIds, [action.comment.id]: true },
      };
    }

    case "removeComment": {
      const current = state.byPost[action.postId] ?? [];
      const nextComments = current.filter(
        (comment) => comment.id !== action.commentId
      );
      const commentWasPresent = nextComments.length !== current.length;

      if (!commentWasPresent && !state.seenIds[action.commentId]) {
        return state;
      }

      const nextSeenIds = { ...state.seenIds };
      delete nextSeenIds[action.commentId];

      return {
        byPost: commentWasPresent
          ? { ...state.byPost, [action.postId]: nextComments }
          : state.byPost,
        counts: commentWasPresent
          ? {
              ...state.counts,
              [action.postId]: Math.max(
                0,
                (state.counts[action.postId] ?? 1) - 1
              ),
            }
          : state.counts,
        seenIds: nextSeenIds,
      };
    }

    default:
      return state;
  }
}
