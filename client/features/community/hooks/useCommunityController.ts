// File purpose: Combines Community data, draft, feedback, and mutation hooks into the view-model consumed by the page.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  setCommunityPostLike,
} from "../data/communityService";
import {
  removeCommunityImage,
  uploadCommentImage,
  uploadPostImage,
} from "../data/communityStorage";
import type {
  CommentUI,
  CommunityFeedView,
  CommunityTopTimeRange,
  NewComment,
  PendingDelete,
} from "../types";
import { createLocalComment, createLocalPost } from "../lib/communityMappers";
import { getErrorMessage } from "../lib/communityErrors";
import { normalizeDiscussionDraft } from "../lib/communityDraft";
import { replaceDraftImageMarkers } from "../lib/markdownEditor";
import {
  getRememberedCommunityFeedView,
  getRememberedCommunityQuery,
  getRememberedCommunityTopTimeRange,
  rememberCommunityFeedView,
  rememberCommunityQuery,
  rememberCommunityTopTimeRange,
} from "../state/communityMemory";
import { useCommunityData } from "./useCommunityData";
import { useCommunityDraft } from "./useCommunityDraft";
import { useCommunityFeedback } from "./useCommunityFeedback";

export function useCommunityController(supabase: SupabaseClient | null) {
  const {
    draft,
    setDraftField,
    toggleDraftTag,
    clearDraftTags,
    setDraftImage,
    resetDraft,
  } = useCommunityDraft();
  const { feedback, pushFeedback, dismissFeedback } = useCommunityFeedback();
  const [query, setQueryState] = React.useState(
    getRememberedCommunityQuery,
  );
  const [feedView, setFeedViewState] = React.useState<CommunityFeedView>(
    getRememberedCommunityFeedView,
  );
  const [topTimeRange, setTopTimeRangeState] =
    React.useState<CommunityTopTimeRange>(
      getRememberedCommunityTopTimeRange,
    );
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] =
    React.useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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
  const {
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
  } = useCommunityData({
    feedView,
    query,
    supabase,
    topTimeRange,
  });

  async function handleCreatePost() {
    const nextDraft = normalizeDiscussionDraft(draft);
    if (!nextDraft.title || creating) return false;

    if (supabase && !currentUserId) {
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

      setPosts((previous) => [newPost, ...previous]);
      dispatchComments({
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

  async function handleDeletePost(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target || !canDeletePost(target)) {
      const message = "You can only delete discussions you created.";
      pushFeedback({
        tone: "error",
        title: "Delete not allowed",
        message,
      });
      throw new Error(message);
    }

    if (!target?.fromDB || !supabase) {
      removePostFromState(postId);
      return;
    }

    try {
      if (!currentUserId) throw new Error("Sign in to delete your discussion.");
      await deleteCommunityPost(supabase, postId, currentUserId);
      removePostFromState(postId);
    } catch (error) {
      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Delete failed",
        message: getErrorMessage(error, "Could not delete post."),
      });
      throw error;
    }
  }

  async function handleAddComment(postId: string, data: NewComment) {
    const target = posts.find((post) => post.id === postId);

    if (!target?.fromDB || !supabase) {
      const localComment: CommentUI = createLocalComment(data.text);
      dispatchComments({ type: "addComment", postId, comment: localComment });
      return;
    }

    if (!currentUserId) {
      const message = "Sign in before commenting.";
      pushFeedback({
        tone: "info",
        title: "Sign in to comment",
        message,
      });
      throw new Error(message);
    }

    let imagePath: string | undefined;

    try {
      let imageUrl: string | undefined;

      if (data.file) {
        const upload = await uploadCommentImage(supabase, postId, data.file);
        imageUrl = upload.publicUrl;
        imagePath = upload.path;
      }

      const comment = await createCommunityComment({
        db: supabase,
        postId,
        text: data.text,
        imageUrl,
        imagePath,
      });

      dispatchComments({ type: "addComment", postId, comment });
    } catch (error) {
      if (imagePath) {
        await removeCommunityImage(supabase, imagePath);
      }

      console.error(error);
      throw new Error(getErrorMessage(error, "Could not post comment."));
    }
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    const target = commentsState.byPost[postId]?.find(
      (comment) => comment.id === commentId,
    );

    if (!target || !canDeleteComment(target)) {
      const message = "You can only delete comments you created.";
      pushFeedback({
        tone: "error",
        title: "Delete not allowed",
        message,
      });
      throw new Error(message);
    }

    if (commentId.startsWith("local-comment-") || !supabase) {
      dispatchComments({ type: "removeComment", postId, commentId });
      return;
    }

    try {
      if (!currentUserId) throw new Error("Sign in to delete your comment.");
      await deleteCommunityComment(supabase, commentId, currentUserId);
      dispatchComments({ type: "removeComment", postId, commentId });
    } catch (error) {
      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Delete failed",
        message: getErrorMessage(error, "Could not delete comment."),
      });
      throw error;
    }
  }

  async function handleToggleLike(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target || likingPostIds.has(postId)) return;

    if (target.fromDB && supabase && !currentUserId) {
      pushFeedback({
        tone: "info",
        title: "Sign in to like discussions",
        message:
          "Likes are saved to your account so they persist after refresh.",
      });
      return;
    }

    const wasLiked = likedPostIds.has(postId);
    const delta = wasLiked ? -1 : 1;

    setLikingPostIds((previous) => new Set(previous).add(postId));
    setLikedPostIds((previous) => {
      const next = new Set(previous);
      if (wasLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, votes: Math.max(0, post.votes + delta) }
          : post,
      ),
    );

    if (!target.fromDB || !supabase) {
      setLikingPostIds((previous) => {
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      return;
    }

    try {
      const savedVotes = await setCommunityPostLike(
        supabase,
        postId,
        !wasLiked,
      );
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId ? { ...post, votes: savedVotes } : post,
        ),
      );
    } catch (error) {
      console.error(error);
      setLikedPostIds((previous) => {
        const next = new Set(previous);
        if (wasLiked) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? { ...post, votes: Math.max(0, post.votes - delta) }
            : post,
        ),
      );
      pushFeedback({
        tone: "error",
        title: "Like was not saved",
        message: getErrorMessage(error, "Could not update like."),
      });
    } finally {
      setLikingPostIds((previous) => {
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
    }
  }

  function requestDeletePost(postId: string) {
    const target = posts.find((post) => post.id === postId);
    setPendingDelete({
      type: "post",
      postId,
      title: "Delete discussion?",
      message: `This will remove "${
        target?.title ?? "this discussion"
      }" and its comments from the community.`,
    });
  }

  function requestDeleteComment(commentId: string, postId: string) {
    setPendingDelete({
      type: "comment",
      commentId,
      postId,
      title: "Delete comment?",
      message: "This comment will be removed from the discussion.",
    });
  }

  async function confirmPendingDelete() {
    const target = pendingDelete;
    if (!target || deleting) return;

    setDeleting(true);

    try {
      if (target.type === "post") {
        await handleDeletePost(target.postId);
      } else {
        await handleDeleteComment(target.commentId, target.postId);
      }

      setPendingDelete(null);
    } catch {
      // The action handler already reports the failure in the feedback area.
    } finally {
      setDeleting(false);
    }
  }

  function cancelPendingDelete() {
    if (!deleting) setPendingDelete(null);
  }

  return {
    query,
    feedView,
    topTimeRange,
    draft,
    creating,
    loadingCommunity,
    loadError,
    feedback,
    pendingDelete,
    deleting,
    commentsState,
    feedCounts,
    filteredPosts,
    likedPostIds,
    likingPostIds,
    currentUserId,
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
    handleAddComment,
    requestDeleteComment,
    requestDeletePost,
    canDeleteComment,
    canDeletePost,
    handleToggleLike,
    confirmPendingDelete,
    cancelPendingDelete,
  };
}
