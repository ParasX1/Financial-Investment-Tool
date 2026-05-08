import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_POSTS } from "./constants";
import { commentsReducer, createCommentsState } from "./commentsReducer";
import {
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  loadCommunityData,
  setCommunityPostLike,
  uploadCommentImage,
} from "./communityService";
import type {
  CommentRow,
  CommentUI,
  DiscussionDraft,
  DiscussionDraftField,
  FeedbackMessage,
  NewComment,
  PendingDelete,
  PostUI,
  SortMode,
} from "./types";
import {
  commentFromRow,
  createLocalComment,
  createLocalPost,
  getErrorMessage,
  normalizeDiscussionDraft,
} from "./utils";

const EMPTY_DISCUSSION_DRAFT: DiscussionDraft = {
  title: "",
  body: "",
};

export function useCommunityController(supabase: SupabaseClient | null) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortMode>("top");
  const [draft, setDraft] = React.useState<DiscussionDraft>(
    EMPTY_DISCUSSION_DRAFT
  );
  const [creating, setCreating] = React.useState(false);
  const [loadingCommunity, setLoadingCommunity] = React.useState(Boolean(supabase));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackMessage[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [posts, setPosts] = React.useState<PostUI[]>(DEMO_POSTS);
  const [likedPostIds, setLikedPostIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [likingPostIds, setLikingPostIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [commentsState, dispatchComments] = React.useReducer(
    commentsReducer,
    DEMO_POSTS,
    createCommentsState
  );

  const pushFeedback = React.useCallback(
    (message: Omit<FeedbackMessage, "id">) => {
      const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFeedback((previous) => [...previous.slice(-2), { id, ...message }]);
    },
    []
  );

  const dismissFeedback = React.useCallback((id: string) => {
    setFeedback((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const setDraftField = React.useCallback(
    (field: DiscussionDraftField, value: string) => {
      setDraft((previous) => ({ ...previous, [field]: value }));
    },
    []
  );

  React.useEffect(() => {
    if (!supabase) {
      setCurrentUserId(null);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setCurrentUserId(data.session?.user.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  React.useEffect(() => {
    if (!supabase) {
      setLoadingCommunity(false);
      return;
    }

    let mounted = true;

    async function loadCommunity(db: SupabaseClient) {
      setLoadingCommunity(true);
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

        if (result.commentsError) {
          setLoadError(result.commentsError);
        } else if (result.likesError) {
          setLoadError(result.likesError);
        }
      } catch (error) {
        console.error("load community failed:", error);
        if (!mounted) return;

        setPosts(DEMO_POSTS);
        setLikedPostIds(new Set());
        dispatchComments({ type: "reset", posts: DEMO_POSTS });
        setLoadError(
          getErrorMessage(
            error,
            "Could not load latest community posts. Showing demo discussions."
          )
        );
      } finally {
        if (mounted) setLoadingCommunity(false);
      }
    }

    loadCommunity(supabase);

    return () => {
      mounted = false;
    };
  }, [supabase, currentUserId]);

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredPosts = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = normalizedQuery
      ? posts.filter((post) =>
          [post.user, post.title, post.body, ...post.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : posts;

    if (sort === "top") {
      return [...base].sort((a, b) => b.votes - a.votes);
    }

    return [...base].sort((a, b) => b.sortTime - a.sortTime);
  }, [posts, query, sort]);

  function removePostFromState(postId: string) {
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
  }

  const canDeletePost = React.useCallback(
    (post: PostUI) => {
      if (!post.fromDB && post.id.startsWith("local-")) return true;
      return Boolean(currentUserId && post.authorId === currentUserId);
    },
    [currentUserId]
  );

  const canDeleteComment = React.useCallback(
    (comment: CommentUI) => {
      if (!comment.fromDB && comment.id.startsWith("local-comment-")) return true;
      return Boolean(currentUserId && comment.authorId === currentUserId);
    },
    [currentUserId]
  );

  async function handleCreatePost() {
    const nextDraft = normalizeDiscussionDraft(draft);
    if (!nextDraft.title || !nextDraft.body || creating) return;

    setCreating(true);

    try {
      const newPost = supabase
        ? await createCommunityPost(supabase, nextDraft)
        : createLocalPost(nextDraft);

      setPosts((previous) => [newPost, ...previous]);
      dispatchComments({
        type: "ensurePost",
        postId: newPost.id,
        initialCount: 0,
      });
      setDraft(EMPTY_DISCUSSION_DRAFT);
    } catch (error) {
      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Post failed",
        message: getErrorMessage(error, "Could not create post."),
      });
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

    try {
      const imageUrl = data.file
        ? await uploadCommentImage(supabase, postId, data.file)
        : undefined;
      const comment = await createCommunityComment({
        db: supabase,
        postId,
        text: data.text,
        imageUrl,
      });

      dispatchComments({ type: "addComment", postId, comment });
    } catch (error) {
      console.error(error);
      throw new Error(getErrorMessage(error, "Could not post comment."));
    }
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    const target = commentsState.byPost[postId]?.find(
      (comment) => comment.id === commentId
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
        message: "Likes are saved to your account so they persist after refresh.",
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
          : post
      )
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
      const savedVotes = await setCommunityPostLike(supabase, postId, !wasLiked);
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId ? { ...post, votes: savedVotes } : post
        )
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
            : post
        )
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
    sort,
    draft,
    creating,
    loadingCommunity,
    loadError,
    feedback,
    pendingDelete,
    deleting,
    commentsState,
    filteredPosts,
    likedPostIds,
    likingPostIds,
    currentUserId,
    setQuery,
    setSort,
    setDraftField,
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
