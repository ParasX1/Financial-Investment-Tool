// File purpose: Owns the account-scoped Community feed resource, derivations, and realtime lifecycle.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_POSTS } from "../constants";
import { loadCommunityData } from "../data/communityService";
import { subscribeToCommunityCommentInserts } from "../data/communityRealtime";
import { commentFromRow } from "../lib/communityMappers";
import { getCommunityLoadErrorMessage } from "../lib/communityLoadStatus";
import {
  getCommunityFeedCounts,
  getVisibleCommunityPosts,
} from "../lib/communitySelectors";
import { commentsReducer, createCommentsState } from "../state/commentsReducer";
import {
  getCachedCommunityForOwner,
  rememberCommunityData,
  type CommunityMemoryCache,
} from "../state/communityMemory";
import type {
  CommentUI,
  CommentsAction,
  CommentsState,
  CommunityFeedView,
  CommunityTopTimeRange,
  PostUI,
} from "../types";

type CommunityResource = {
  commentsState: CommentsState;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  posts: PostUI[];
};

type CommunityResourceState = {
  error: string | null;
  loading: boolean;
  ownerKey: string;
  resource: CommunityResource;
};

export type CommunityDataDependencies = {
  load: typeof loadCommunityData;
  subscribeToCommentInserts: typeof subscribeToCommunityCommentInserts;
};

const defaultCommunityDataDependencies: CommunityDataDependencies = {
  load: loadCommunityData,
  subscribeToCommentInserts: subscribeToCommunityCommentInserts,
};

const EMPTY_RESOURCE: CommunityResource = {
  commentsState: createCommentsState([]),
  likedPostIds: new Set(),
  savedPostIds: new Set(),
  posts: [],
};

function createDemoResource(): CommunityResource {
  const cache = getCachedCommunityForOwner("demo");
  if (cache) return createCachedResource(cache);

  return {
    commentsState: createCommentsState(DEMO_POSTS),
    likedPostIds: new Set(),
    savedPostIds: new Set(),
    posts: [...DEMO_POSTS],
  };
}

function createCachedResource(cache: CommunityMemoryCache): CommunityResource {
  return {
    commentsState: cache.commentsState,
    likedPostIds: new Set(cache.likedPostIds),
    savedPostIds: new Set(cache.savedPostIds),
    posts: cache.posts,
  };
}

function createLoadedResource(
  result: Awaited<ReturnType<typeof loadCommunityData>>,
): CommunityResource {
  return {
    commentsState: createCommentsState(result.posts, result.comments),
    likedPostIds: new Set(result.likedPostIds),
    savedPostIds: new Set(result.savedPostIds),
    posts: result.posts,
  };
}

function getOwnerKey({
  authLoading,
  currentUserId,
  supabase,
}: {
  authLoading: boolean;
  currentUserId: string | null;
  supabase: SupabaseClient | null;
}) {
  if (!supabase) return "demo";
  if (authLoading) return "auth-loading";
  return currentUserId ? `user:${currentUserId}` : "signed-out";
}

function createInitialState({
  authLoading,
  ownerKey,
  supabase,
}: {
  authLoading: boolean;
  ownerKey: string;
  supabase: SupabaseClient | null;
}): CommunityResourceState {
  if (!supabase) {
    return {
      error: null,
      loading: false,
      ownerKey,
      resource: createDemoResource(),
    };
  }

  const cache = authLoading ? null : getCachedCommunityForOwner(ownerKey);

  return {
    error: null,
    loading: !cache,
    ownerKey,
    resource: cache ? createCachedResource(cache) : EMPTY_RESOURCE,
  };
}

export function useCommunityData(
  {
    authLoading,
    currentUserId,
    feedView,
    query,
    supabase,
    topTimeRange,
  }: {
    authLoading: boolean;
    currentUserId: string | null;
    feedView: CommunityFeedView;
    query: string;
    supabase: SupabaseClient | null;
    topTimeRange: CommunityTopTimeRange;
  },
  dependencies: CommunityDataDependencies = defaultCommunityDataDependencies,
) {
  const ownerKey = getOwnerKey({ authLoading, currentUserId, supabase });
  const [state, setState] = React.useState<CommunityResourceState>(() =>
    createInitialState({
      authLoading,
      ownerKey,
      supabase,
    }),
  );
  const stateIsCurrent = state.ownerKey === ownerKey;
  const resource = stateIsCurrent ? state.resource : EMPTY_RESOURCE;

  const updateCurrentResource = React.useCallback(
    (update: (current: CommunityResource) => CommunityResource) => {
      setState((current) => {
        if (current.ownerKey !== ownerKey) return current;
        return { ...current, resource: update(current.resource) };
      });
    },
    [ownerKey],
  );

  const setPosts = React.useCallback<
    React.Dispatch<React.SetStateAction<PostUI[]>>
  >(
    (update) => {
      updateCurrentResource((current) => ({
        ...current,
        posts: typeof update === "function" ? update(current.posts) : update,
      }));
    },
    [updateCurrentResource],
  );

  const setLikedPostIds = React.useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >(
    (update) => {
      updateCurrentResource((current) => ({
        ...current,
        likedPostIds:
          typeof update === "function" ? update(current.likedPostIds) : update,
      }));
    },
    [updateCurrentResource],
  );

  const setSavedPostIds = React.useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >(
    (update) => {
      updateCurrentResource((current) => ({
        ...current,
        savedPostIds:
          typeof update === "function" ? update(current.savedPostIds) : update,
      }));
    },
    [updateCurrentResource],
  );

  const dispatchComments = React.useCallback<React.Dispatch<CommentsAction>>(
    (action) => {
      updateCurrentResource((current) => ({
        ...current,
        commentsState: commentsReducer(current.commentsState, action),
      }));
    },
    [updateCurrentResource],
  );

  React.useEffect(() => {
    if (!stateIsCurrent || state.loading || state.error) {
      return;
    }

    rememberCommunityData({
      posts: state.resource.posts,
      likedPostIds: Array.from(state.resource.likedPostIds),
      savedPostIds: Array.from(state.resource.savedPostIds),
      commentsState: state.resource.commentsState,
      ownerKey,
    });
  }, [ownerKey, state, stateIsCurrent]);

  React.useEffect(() => {
    if (!supabase || authLoading) return;

    let active = true;
    const cache = getCachedCommunityForOwner(ownerKey);

    setState({
      error: null,
      loading: !cache,
      ownerKey,
      resource: cache ? createCachedResource(cache) : EMPTY_RESOURCE,
    });

    dependencies
      .load(supabase, currentUserId)
      .then((result) => {
        if (!active) return;

        setState({
          error: getCommunityLoadErrorMessage({
            commentsError: result.commentsError,
            likesError: result.likesError,
            savesError: result.savesError,
          }),
          loading: false,
          ownerKey,
          resource: createLoadedResource(result),
        });
      })
      .catch((error) => {
        console.error("load community failed:", error);
        if (!active) return;

        setState((current) => {
          if (current.ownerKey !== ownerKey) return current;
          return {
            ...current,
            error: "Could not load latest community posts.",
            loading: false,
          };
        });
      });

    return () => {
      active = false;
    };
  }, [authLoading, currentUserId, dependencies, ownerKey, supabase]);

  React.useEffect(() => {
    if (!supabase) return;

    return dependencies.subscribeToCommentInserts(supabase, (row) => {
      dispatchComments({
        type: "addComment",
        postId: row.post_id,
        comment: commentFromRow(row, currentUserId),
      });
    });
  }, [currentUserId, dependencies, dispatchComments, supabase]);

  const filteredPosts = React.useMemo(
    () =>
      getVisibleCommunityPosts({
        posts: resource.posts,
        query,
        view: feedView,
        topTimeRange,
        likedPostIds: resource.likedPostIds,
        savedPostIds: resource.savedPostIds,
        commentsState: resource.commentsState,
        currentUserId,
      }),
    [currentUserId, feedView, query, resource, topTimeRange],
  );

  const feedCounts = React.useMemo(
    () =>
      getCommunityFeedCounts({
        posts: resource.posts,
        likedPostIds: resource.likedPostIds,
        savedPostIds: resource.savedPostIds,
        commentsState: resource.commentsState,
        currentUserId,
      }),
    [currentUserId, resource],
  );

  const canDeletePost = React.useCallback(
    (post: PostUI) => {
      if (!post.fromDB && post.id.startsWith("local-")) return true;
      return Boolean(currentUserId && post.authorId === currentUserId);
    },
    [currentUserId],
  );

  const canDeleteComment = React.useCallback(
    (comment: CommentUI) => {
      if (!comment.fromDB && comment.id.startsWith("local-comment-")) {
        return true;
      }
      return Boolean(currentUserId && comment.authorId === currentUserId);
    },
    [currentUserId],
  );

  return {
    canDeleteComment,
    canDeletePost,
    commentsState: resource.commentsState,
    currentUserId,
    dataMode: supabase ? ("remote" as const) : ("demo" as const),
    dispatchComments,
    feedCounts,
    filteredPosts,
    likedPostIds: resource.likedPostIds,
    savedPostIds: resource.savedPostIds,
    loadError: stateIsCurrent ? state.error : null,
    loadingCommunity:
      !stateIsCurrent || (state.loading && resource.posts.length === 0),
    posts: resource.posts,
    setLikedPostIds,
    setSavedPostIds,
    setPosts,
  };
}
