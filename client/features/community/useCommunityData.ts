import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_POSTS } from "./constants";
import { commentsReducer, createCommentsState } from "./commentsReducer";
import { commentFromRow } from "./communityMappers";
import { getErrorMessage } from "./communityErrors";
import { getCommunityLoadErrorMessage } from "./communityLoadStatus";
import { loadCommunityData } from "./communityService";
import {
  getCommunityFeedCounts,
  getVisibleCommunityPosts,
} from "./communitySelectors";
import type {
  CommentRow,
  CommentUI,
  CommunityFeedView,
  CommunityTopTimeRange,
  PostUI,
} from "./types";
import {
  getCachedCommunityForRememberedUser,
  hasCommunityMemoryCache,
  rememberCommunityData,
  rememberCommunityUserId,
} from "./communityMemory";

export function useCommunityData({
  feedView,
  query,
  supabase,
  topTimeRange,
}: {
  feedView: CommunityFeedView;
  query: string;
  supabase: SupabaseClient | null;
  topTimeRange: CommunityTopTimeRange;
}) {
  const cachedCommunity = getCachedCommunityForRememberedUser(Boolean(supabase));
  const [loadingCommunity, setLoadingCommunity] = React.useState(
    Boolean(supabase && !cachedCommunity),
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [authReady, setAuthReady] = React.useState(!supabase);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(
    cachedCommunity?.currentUserId ?? null,
  );
  const [posts, setPosts] = React.useState<PostUI[]>(
    cachedCommunity?.posts ?? (supabase ? [] : DEMO_POSTS),
  );
  const [likedPostIds, setLikedPostIds] = React.useState<Set<string>>(
    () => new Set(cachedCommunity?.likedPostIds ?? []),
  );
  const [likingPostIds, setLikingPostIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const initialCommentsState = React.useMemo(
    () =>
      cachedCommunity?.commentsState ??
      createCommentsState(supabase ? [] : DEMO_POSTS),
    [cachedCommunity, supabase],
  );
  const [commentsState, dispatchComments] = React.useReducer(
    commentsReducer,
    initialCommentsState,
  );

  const applyAuthUserId = React.useCallback((nextUserId: string | null) => {
    rememberCommunityUserId(nextUserId);
    setCurrentUserId(nextUserId);
  }, []);

  React.useEffect(() => {
    if (!supabase) return;

    rememberCommunityData({
      posts,
      likedPostIds: Array.from(likedPostIds),
      commentsState,
      currentUserId,
    });
  }, [commentsState, currentUserId, likedPostIds, posts, supabase]);

  React.useEffect(() => {
    if (!supabase) {
      setCurrentUserId(null);
      setAuthReady(true);
      return;
    }

    let mounted = true;
    setAuthReady(false);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        applyAuthUserId(data.session?.user.id ?? null);
        setAuthReady(true);
      })
      .catch((error) => {
        console.error("load auth session failed:", error);
        if (!mounted) return;
        applyAuthUserId(null);
        setAuthReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applyAuthUserId(session?.user?.id ?? null);
        setAuthReady(true);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [applyAuthUserId, supabase]);

  React.useEffect(() => {
    if (!supabase) {
      setLoadingCommunity(false);
      return;
    }

    if (!authReady) return;

    let mounted = true;

    async function loadCommunity(db: SupabaseClient) {
      if (!hasCommunityMemoryCache()) setLoadingCommunity(true);
      setLoadError(null);

      try {
        const result = await loadCommunityData(db, currentUserId);
        if (!mounted) return;

        setPosts(result.posts);
        setLikedPostIds(new Set(result.likedPostIds));
        dispatchComments({
          type: "reset",
          posts: result.posts,
          comments: result.comments,
        });

        setLoadError(
          getCommunityLoadErrorMessage({
            commentsError: result.commentsError,
            likesError: result.likesError,
          }),
        );
      } catch (error) {
        console.error("load community failed:", error);
        if (!mounted) return;

        setPosts(DEMO_POSTS);
        setLikedPostIds(new Set());
        dispatchComments({ type: "reset", posts: DEMO_POSTS });
        setLoadError(
          getErrorMessage(
            error,
            "Could not load latest community posts. Showing demo discussions.",
          ),
        );
      } finally {
        if (mounted) setLoadingCommunity(false);
      }
    }

    loadCommunity(supabase);

    return () => {
      mounted = false;
    };
  }, [authReady, supabase, currentUserId]);

  React.useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("comments-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const row = payload.new as CommentRow;
          dispatchComments({
            type: "addComment",
            postId: row.post_id,
            comment: commentFromRow(row),
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredPosts = React.useMemo(() => {
    return getVisibleCommunityPosts({
      posts,
      query,
      view: feedView,
      topTimeRange,
      likedPostIds,
      commentsState,
      currentUserId,
    });
  }, [
    commentsState,
    currentUserId,
    feedView,
    likedPostIds,
    posts,
    query,
    topTimeRange,
  ]);

  const feedCounts = React.useMemo(
    () =>
      getCommunityFeedCounts({
        posts,
        likedPostIds,
        commentsState,
        currentUserId,
      }),
    [commentsState, currentUserId, likedPostIds, posts],
  );

  const removePostFromState = React.useCallback((postId: string) => {
    setPosts((previous) => previous.filter((post) => post.id !== postId));
    dispatchComments({ type: "removePost", postId });
    setLikedPostIds((previous) => {
      if (!previous.has(postId)) return previous;
      const next = new Set(previous);
      next.delete(postId);
      return next;
    });
    setLikingPostIds((previous) => {
      if (!previous.has(postId)) return previous;
      const next = new Set(previous);
      next.delete(postId);
      return next;
    });
  }, []);

  const canDeletePost = React.useCallback(
    (post: PostUI) => {
      if (!post.fromDB && post.id.startsWith("local-")) return true;
      return Boolean(currentUserId && post.authorId === currentUserId);
    },
    [currentUserId],
  );

  const canDeleteComment = React.useCallback(
    (comment: CommentUI) => {
      if (!comment.fromDB && comment.id.startsWith("local-comment-"))
        return true;
      return Boolean(currentUserId && comment.authorId === currentUserId);
    },
    [currentUserId],
  );

  return {
    canDeleteComment,
    canDeletePost,
    commentsState,
    currentUserId,
    dispatchComments,
    feedCounts,
    filteredPosts,
    likedPostIds,
    likingPostIds,
    loadError,
    loadingCommunity,
    posts,
    removePostFromState,
    setLikedPostIds,
    setLikingPostIds,
    setPosts,
  };
}
