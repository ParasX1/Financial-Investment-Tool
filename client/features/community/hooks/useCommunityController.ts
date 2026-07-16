// File purpose: Composes Community route state, account-scoped feed data, feed actions, and create draft state.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/authContext";
import { createCommunityPost } from "../data/communityService";
import {
  removeCommunityImage,
  uploadPostImage,
} from "../data/communityStorage";
import { normalizeDiscussionDraft } from "../lib/communityDraft";
import { getErrorMessage } from "../lib/communityErrors";
import { createLocalPost } from "../lib/communityMappers";
import { replaceDraftImageMarkers } from "../lib/markdownEditor";
import {
  getRememberedCommunityFeedView,
  getRememberedCommunityQuery,
  getRememberedCommunityTopTimeRange,
  rememberCommunityFeedView,
  rememberCommunityQuery,
  rememberCommunityTopTimeRange,
} from "../state/communityMemory";
import type { CommunityFeedView, CommunityTopTimeRange } from "../types";
import { useCommunityData } from "./useCommunityData";
import { useCommunityDraft } from "./useCommunityDraft";
import { useCommunityFeedback } from "./useCommunityFeedback";
import { useCommunityFeedActions } from "./useCommunityFeedActions";

function getCommunitySessionKey({
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

export function useCommunityController(supabase: SupabaseClient | null) {
  const { user, loading: authLoading } = useAuth();
  const remoteUserId = supabase ? (user?.id ?? null) : null;
  const remoteAuthLoading = Boolean(supabase && authLoading);
  const sessionKey = getCommunitySessionKey({
    authLoading: remoteAuthLoading,
    currentUserId: remoteUserId,
    supabase,
  });
  const {
    draft,
    setDraftField,
    toggleDraftTag,
    clearDraftTags,
    setDraftImage,
    resetDraft,
  } = useCommunityDraft();
  const { feedback, pushFeedback, dismissFeedback } = useCommunityFeedback();
  const [query, setQueryState] = React.useState(getRememberedCommunityQuery);
  const [feedView, setFeedViewState] = React.useState<CommunityFeedView>(
    getRememberedCommunityFeedView,
  );
  const [topTimeRange, setTopTimeRangeState] =
    React.useState<CommunityTopTimeRange>(getRememberedCommunityTopTimeRange);
  const [creating, setCreating] = React.useState(false);

  const setQuery = React.useCallback((nextQuery: string) => {
    rememberCommunityQuery(nextQuery);
    setQueryState(nextQuery);
  }, []);

  const setFeedView = React.useCallback((nextView: CommunityFeedView) => {
    rememberCommunityFeedView(nextView);
    setFeedViewState(nextView);
  }, []);

  const setTopTimeRange = React.useCallback(
    (nextRange: CommunityTopTimeRange) => {
      rememberCommunityTopTimeRange(nextRange);
      setTopTimeRangeState(nextRange);
    },
    [],
  );

  const communityData = useCommunityData({
    authLoading: remoteAuthLoading,
    currentUserId: remoteUserId,
    feedView,
    query,
    supabase,
    topTimeRange,
  });

  const feedActions = useCommunityFeedActions({
    canDeleteComment: communityData.canDeleteComment,
    canDeletePost: communityData.canDeletePost,
    commentsState: communityData.commentsState,
    currentUserId: communityData.currentUserId,
    dispatchComments: communityData.dispatchComments,
    likedPostIds: communityData.likedPostIds,
    posts: communityData.posts,
    pushFeedback,
    sessionKey,
    setLikedPostIds: communityData.setLikedPostIds,
    setPosts: communityData.setPosts,
    supabase,
  });

  async function handleCreatePost() {
    const nextDraft = normalizeDiscussionDraft(draft);
    if (!nextDraft.title || creating) return false;

    if (supabase && !communityData.currentUserId) {
      pushFeedback({
        tone: "info",
        title: "Sign in to post",
        message: "Discussions are saved to your account.",
      });
      return false;
    }

    setCreating(true);
    let uploadedImagePath: string | null = null;

    try {
      let imageUrl: string | null = null;

      if (supabase && draft.imageFile) {
        const upload = await uploadPostImage(supabase, draft.imageFile);
        uploadedImagePath = upload.path;
        imageUrl = upload.publicUrl;
      }
      const bodyWithInlineImage = replaceDraftImageMarkers(
        nextDraft.body,
        imageUrl ?? draft.imagePreviewUrl,
      );
      const postDraft = { ...nextDraft, body: bodyWithInlineImage };

      const newPost = supabase
        ? await createCommunityPost(supabase, {
            ...postDraft,
            imageUrl,
            imagePath: uploadedImagePath,
          })
        : createLocalPost({
            ...postDraft,
            imageUrl: draft.imagePreviewUrl,
          });

      if (supabase && uploadedImagePath && !newPost.imageUrl) {
        await removeCommunityImage(supabase, uploadedImagePath);
      }

      communityData.setPosts((previous) => [newPost, ...previous]);
      communityData.dispatchComments({
        type: "ensurePost",
        postId: newPost.id,
        initialCount: 0,
      });
      resetDraft();
      return true;
    } catch (error) {
      if (supabase && uploadedImagePath) {
        await removeCommunityImage(supabase, uploadedImagePath);
      }

      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Post failed",
        message: getErrorMessage(error, "Could not create post."),
      });
      return false;
    } finally {
      setCreating(false);
    }
  }

  return {
    query,
    feedView,
    topTimeRange,
    draft,
    creating,
    loadingCommunity: communityData.loadingCommunity,
    loadError: communityData.loadError,
    feedback,
    pendingDelete: feedActions.pendingDelete,
    deleting: feedActions.deleting,
    commentsState: communityData.commentsState,
    feedCounts: communityData.feedCounts,
    hasLoadedPosts: communityData.posts.length > 0,
    filteredPosts: communityData.filteredPosts,
    likedPostIds: communityData.likedPostIds,
    likingPostIds: feedActions.likingPostIds,
    currentUserId: communityData.currentUserId,
    setQuery,
    setFeedView,
    setTopTimeRange,
    setDraftField,
    toggleDraftTag,
    clearDraftTags,
    setDraftImage,
    pushFeedback,
    dismissFeedback,
    handleCreatePost,
    handleAddComment: feedActions.handleAddComment,
    requestDeleteComment: feedActions.requestDeleteComment,
    requestDeletePost: feedActions.requestDeletePost,
    canDeleteComment: communityData.canDeleteComment,
    canDeletePost: communityData.canDeletePost,
    handleToggleLike: feedActions.handleToggleLike,
    confirmPendingDelete: feedActions.confirmPendingDelete,
    cancelPendingDelete: feedActions.cancelPendingDelete,
  };
}
