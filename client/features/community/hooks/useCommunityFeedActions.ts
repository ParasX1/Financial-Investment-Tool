// File purpose: Owns Community Feed comment, delete, and optimistic like workflows.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  setCommunityPostLike,
  setCommunityPostSaved,
} from "../data/communityService";
import {
  removeCommunityImage,
  uploadCommentImage,
} from "../data/communityStorage";
import { createLocalComment } from "../lib/communityMappers";
import type {
  CommentUI,
  CommentsAction,
  CommentsState,
  FeedbackMessage,
  NewComment,
  PendingDelete,
  PostUI,
} from "../types";

export type CommunityFeedActionDependencies = {
  createComment: typeof createCommunityComment;
  deleteComment: typeof deleteCommunityComment;
  deletePost: typeof deleteCommunityPost;
  removeImage: typeof removeCommunityImage;
  setPostLike: typeof setCommunityPostLike;
  setPostSaved: typeof setCommunityPostSaved;
  uploadCommentImage: typeof uploadCommentImage;
};

type PushFeedback = (message: Omit<FeedbackMessage, "id">) => void;

const defaultCommunityFeedActionDependencies: CommunityFeedActionDependencies =
  {
    createComment: createCommunityComment,
    deleteComment: deleteCommunityComment,
    deletePost: deleteCommunityPost,
    removeImage: removeCommunityImage,
    setPostLike: setCommunityPostLike,
    setPostSaved: setCommunityPostSaved,
    uploadCommentImage,
  };

const useCommittedLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

async function removeUploadedImageSafely(
  dependencies: CommunityFeedActionDependencies,
  supabase: SupabaseClient,
  imagePath: string | undefined,
) {
  if (!imagePath) return;

  try {
    await dependencies.removeImage(supabase, imagePath);
  } catch {
    console.error("Community image cleanup failed.");
  }
}

export function useCommunityFeedActions(
  {
    canDeleteComment,
    canDeletePost,
    commentsState,
    currentUserId,
    dispatchComments,
    likedPostIds,
    posts,
    pushFeedback,
    savedPostIds,
    sessionKey,
    setLikedPostIds,
    setSavedPostIds,
    setPosts,
    supabase,
  }: {
    canDeleteComment: (comment: CommentUI) => boolean;
    canDeletePost: (post: PostUI) => boolean;
    commentsState: CommentsState;
    currentUserId: string | null;
    dispatchComments: React.Dispatch<CommentsAction>;
    likedPostIds: Set<string>;
    posts: PostUI[];
    pushFeedback: PushFeedback;
    savedPostIds: Set<string>;
    sessionKey: string;
    setLikedPostIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSavedPostIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setPosts: React.Dispatch<React.SetStateAction<PostUI[]>>;
    supabase: SupabaseClient | null;
  },
  dependencies: CommunityFeedActionDependencies = defaultCommunityFeedActionDependencies,
) {
  const [pendingDelete, setPendingDelete] =
    React.useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [likingPostIds, setLikingPostIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [savingPostIds, setSavingPostIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const committedSessionKeyRef = React.useRef(sessionKey);
  const inFlightLikeTokensRef = React.useRef(new Map<string, symbol>());
  const inFlightSaveTokensRef = React.useRef(new Map<string, symbol>());

  useCommittedLayoutEffect(() => {
    committedSessionKeyRef.current = sessionKey;
    inFlightLikeTokensRef.current.clear();
    inFlightSaveTokensRef.current.clear();
    setLikingPostIds(new Set());
    setSavingPostIds(new Set());
    setPendingDelete(null);
    setDeleting(false);
  }, [sessionKey]);

  const isSessionCurrent = React.useCallback(
    (startedSessionKey: string) =>
      committedSessionKeyRef.current === startedSessionKey,
    [],
  );

  async function handleDeletePost(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target || !canDeletePost(target)) {
      const message = "You can only delete discussions you created.";
      pushFeedback({ tone: "error", title: "Delete not allowed", message });
      throw new Error(message);
    }

    if (!target.fromDB || !supabase) {
      setPosts((previous) => previous.filter((post) => post.id !== postId));
      dispatchComments({ type: "removePost", postId });
      setLikedPostIds((previous) => {
        if (!previous.has(postId)) return previous;
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      setSavedPostIds((previous) => {
        if (!previous.has(postId)) return previous;
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      return;
    }

    if (!currentUserId) {
      throw new Error("Sign in to delete your discussion.");
    }

    const startedSessionKey = committedSessionKeyRef.current;

    try {
      await dependencies.deletePost(supabase, postId, currentUserId);
      if (!isSessionCurrent(startedSessionKey)) return;

      setPosts((previous) => previous.filter((post) => post.id !== postId));
      dispatchComments({ type: "removePost", postId });
      setLikedPostIds((previous) => {
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      setSavedPostIds((previous) => {
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
    } catch {
      if (!isSessionCurrent(startedSessionKey)) return;
      const message = "Could not delete post.";
      pushFeedback({ tone: "error", title: "Delete failed", message });
      throw new Error(message);
    }
  }

  async function handleAddComment(postId: string, data: NewComment) {
    const target = posts.find((post) => post.id === postId);
    if (!target) throw new Error("Discussion is no longer available.");

    if (!target.fromDB || !supabase) {
      dispatchComments({
        type: "addComment",
        postId,
        comment: createLocalComment(data.text),
      });
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

    const startedSessionKey = committedSessionKeyRef.current;
    let imagePath: string | undefined;

    try {
      let imageUrl: string | undefined;

      if (data.file) {
        const upload = await dependencies.uploadCommentImage(
          supabase,
          postId,
          data.file,
        );
        imageUrl = upload.publicUrl;
        imagePath = upload.path;

        if (!isSessionCurrent(startedSessionKey)) {
          await removeUploadedImageSafely(dependencies, supabase, imagePath);
          return;
        }
      }

      const comment = await dependencies.createComment({
        authorId: currentUserId,
        db: supabase,
        postId,
        text: data.text,
        imageUrl,
        imagePath,
      });

      if (!isSessionCurrent(startedSessionKey)) return;
      dispatchComments({ type: "addComment", postId, comment });
    } catch {
      await removeUploadedImageSafely(dependencies, supabase, imagePath);
      if (!isSessionCurrent(startedSessionKey)) return;
      throw new Error("Could not post comment.");
    }
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    const target = commentsState.byPost[postId]?.find(
      (comment) => comment.id === commentId,
    );

    if (!target || !canDeleteComment(target)) {
      const message = "You can only delete comments you created.";
      pushFeedback({ tone: "error", title: "Delete not allowed", message });
      throw new Error(message);
    }

    if (commentId.startsWith("local-comment-") || !supabase) {
      dispatchComments({ type: "removeComment", postId, commentId });
      return;
    }

    if (!currentUserId) throw new Error("Sign in to delete your comment.");
    const startedSessionKey = committedSessionKeyRef.current;

    try {
      await dependencies.deleteComment(supabase, commentId, currentUserId);
      if (!isSessionCurrent(startedSessionKey)) return;
      dispatchComments({ type: "removeComment", postId, commentId });
    } catch {
      if (!isSessionCurrent(startedSessionKey)) return;
      const message = "Could not delete comment.";
      pushFeedback({ tone: "error", title: "Delete failed", message });
      throw new Error(message);
    }
  }

  async function handleToggleLike(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target || inFlightLikeTokensRef.current.has(postId)) return;

    if (target.fromDB && supabase && !currentUserId) {
      pushFeedback({
        tone: "info",
        title: "Sign in to like discussions",
        message:
          "Likes are saved to your account so they persist after refresh.",
      });
      return;
    }

    const startedSessionKey = committedSessionKeyRef.current;
    const requestToken = Symbol(postId);
    const wasLiked = likedPostIds.has(postId);
    const delta = wasLiked ? -1 : 1;
    inFlightLikeTokensRef.current.set(postId, requestToken);
    setLikingPostIds((previous) => new Set(previous).add(postId));
    setLikedPostIds((previous) => {
      const next = new Set(previous);
      if (wasLiked) next.delete(postId);
      else next.add(postId);
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
      if (inFlightLikeTokensRef.current.get(postId) === requestToken) {
        inFlightLikeTokensRef.current.delete(postId);
      }
      setLikingPostIds((previous) => {
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      return;
    }

    try {
      const savedVotes = await dependencies.setPostLike(
        supabase,
        postId,
        !wasLiked,
      );
      if (!isSessionCurrent(startedSessionKey)) return;

      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId ? { ...post, votes: savedVotes } : post,
        ),
      );
    } catch {
      if (!isSessionCurrent(startedSessionKey)) return;

      setLikedPostIds((previous) => {
        const next = new Set(previous);
        if (wasLiked) next.add(postId);
        else next.delete(postId);
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
        message: "Could not update like.",
      });
    } finally {
      const ownsCurrentLock =
        inFlightLikeTokensRef.current.get(postId) === requestToken;
      if (ownsCurrentLock) {
        inFlightLikeTokensRef.current.delete(postId);
      }
      if (ownsCurrentLock && isSessionCurrent(startedSessionKey)) {
        setLikingPostIds((previous) => {
          const next = new Set(previous);
          next.delete(postId);
          return next;
        });
      }
    }
  }

  async function handleToggleSave(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target || inFlightSaveTokensRef.current.has(postId)) return;

    if (target.fromDB && supabase && !currentUserId) {
      pushFeedback({
        tone: "info",
        title: "Sign in to save discussions",
        message:
          "Saved discussions are private to your account so you can revisit them later.",
      });
      return;
    }

    const startedSessionKey = committedSessionKeyRef.current;
    const requestToken = Symbol(postId);
    const wasSaved = savedPostIds.has(postId);
    inFlightSaveTokensRef.current.set(postId, requestToken);
    setSavingPostIds((previous) => new Set(previous).add(postId));
    setSavedPostIds((previous) => {
      const next = new Set(previous);
      if (wasSaved) next.delete(postId);
      else next.add(postId);
      return next;
    });

    if (!target.fromDB || !supabase) {
      if (inFlightSaveTokensRef.current.get(postId) === requestToken) {
        inFlightSaveTokensRef.current.delete(postId);
      }
      setSavingPostIds((previous) => {
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      return;
    }

    try {
      await dependencies.setPostSaved(
        supabase,
        postId,
        !wasSaved,
        currentUserId!,
      );
    } catch {
      if (!isSessionCurrent(startedSessionKey)) return;

      setSavedPostIds((previous) => {
        const next = new Set(previous);
        if (wasSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
      pushFeedback({
        tone: "error",
        title: "Save was not updated",
        message: "Could not update saved discussions.",
      });
    } finally {
      const ownsCurrentLock =
        inFlightSaveTokensRef.current.get(postId) === requestToken;
      if (ownsCurrentLock) {
        inFlightSaveTokensRef.current.delete(postId);
      }
      if (ownsCurrentLock && isSessionCurrent(startedSessionKey)) {
        setSavingPostIds((previous) => {
          const next = new Set(previous);
          next.delete(postId);
          return next;
        });
      }
    }
  }

  function requestDeletePost(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target) return;

    setPendingDelete({
      type: "post",
      postId,
      title: "Delete discussion?",
      message: `This will remove "${target.title}" and its comments from the community.`,
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

    const startedSessionKey = committedSessionKeyRef.current;
    setDeleting(true);

    try {
      if (target.type === "post") {
        await handleDeletePost(target.postId);
      } else {
        await handleDeleteComment(target.commentId, target.postId);
      }

      if (isSessionCurrent(startedSessionKey)) setPendingDelete(null);
    } catch {
      // The focused action reports a stable failure in the feedback area.
    } finally {
      if (isSessionCurrent(startedSessionKey)) setDeleting(false);
    }
  }

  function cancelPendingDelete() {
    if (!deleting) setPendingDelete(null);
  }

  return {
    cancelPendingDelete,
    confirmPendingDelete,
    deleting,
    handleAddComment,
    handleToggleLike,
    handleToggleSave,
    likingPostIds,
    savingPostIds,
    pendingDelete,
    requestDeleteComment,
    requestDeletePost,
  };
}
