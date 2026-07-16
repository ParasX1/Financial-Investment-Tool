// File purpose: Runs an account-bound create-post transaction without coupling Create to Feed state.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCommunityPost } from "../data/communityService";
import {
  removeCommunityImage,
  uploadPostImage,
} from "../data/communityStorage";
import { normalizeDiscussionDraft } from "../lib/communityDraft";
import { createLocalPost } from "../lib/communityMappers";
import { replaceDraftImageMarkers } from "../lib/markdownEditor";
import {
  invalidateCommunityDataForUser,
  rememberLocalCommunityPost,
} from "../state/communityMemory";
import type { DiscussionDraft, FeedbackMessage, PostUI } from "../types";

export type CommunityCreateActionDependencies = {
  createLocalPost: typeof createLocalPost;
  createPost: typeof createCommunityPost;
  invalidateRemoteData: (currentUserId: string) => void;
  rememberLocalPost: (post: PostUI) => void;
  removeImage: typeof removeCommunityImage;
  uploadPostImage: typeof uploadPostImage;
};

const defaultDependencies: CommunityCreateActionDependencies = {
  createLocalPost,
  createPost: createCommunityPost,
  invalidateRemoteData: invalidateCommunityDataForUser,
  rememberLocalPost: rememberLocalCommunityPost,
  removeImage: removeCommunityImage,
  uploadPostImage,
};

const useCommittedLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

type SessionSnapshot = {
  currentUserId: string | null;
  sessionKey: string;
};

export function useCommunityCreateActions(
  {
    currentUserId,
    draft,
    pushFeedback,
    resetDraft,
    sessionKey,
    supabase,
  }: {
    currentUserId: string | null;
    draft: DiscussionDraft;
    pushFeedback: (message: Omit<FeedbackMessage, "id">) => void;
    resetDraft: () => void;
    sessionKey: string;
    supabase: SupabaseClient | null;
  },
  dependencies: CommunityCreateActionDependencies = defaultDependencies,
) {
  const [creating, setCreating] = React.useState(false);
  const creatingRef = React.useRef(false);
  const mountedRef = React.useRef(false);
  const requestVersionRef = React.useRef(0);
  const previousSessionKeyRef = React.useRef(sessionKey);
  const latestSessionRef = React.useRef<SessionSnapshot>({
    currentUserId,
    sessionKey,
  });

  useCommittedLayoutEffect(() => {
    latestSessionRef.current = { currentUserId, sessionKey };
  }, [currentUserId, sessionKey]);

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
      creatingRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (previousSessionKeyRef.current === sessionKey) return;

    previousSessionKeyRef.current = sessionKey;
    requestVersionRef.current += 1;
    creatingRef.current = false;
    setCreating(false);
  }, [sessionKey]);

  const handleCreatePost = React.useCallback(async () => {
    const nextDraft = normalizeDiscussionDraft(draft);
    if (!nextDraft.title || creatingRef.current) return false;

    const startedSession = latestSessionRef.current;
    if (supabase && !startedSession.currentUserId) {
      pushFeedback({
        tone: "info",
        title: "Sign in to post",
        message: "Discussions are saved to your account.",
      });
      return false;
    }

    creatingRef.current = true;
    setCreating(true);
    const requestVersion = ++requestVersionRef.current;
    let uploadedImagePath: string | null = null;
    let postPersisted = false;

    const requestIsCurrent = () =>
      mountedRef.current &&
      requestVersionRef.current === requestVersion &&
      latestSessionRef.current.sessionKey === startedSession.sessionKey;

    const cleanUploadedImage = async () => {
      if (!supabase || !uploadedImagePath) return;
      try {
        await dependencies.removeImage(supabase, uploadedImagePath);
      } catch (cleanupError) {
        console.error("community image cleanup failed:", cleanupError);
      }
    };

    try {
      let imageUrl: string | null = null;

      if (supabase && draft.imageFile) {
        const upload = await dependencies.uploadPostImage(
          supabase,
          draft.imageFile,
        );
        uploadedImagePath = upload.path;
        imageUrl = upload.publicUrl;
      }

      if (!requestIsCurrent()) {
        await cleanUploadedImage();
        return false;
      }

      const bodyWithInlineImage = replaceDraftImageMarkers(
        nextDraft.body,
        imageUrl ?? draft.imagePreviewUrl,
      );
      const postDraft = {
        ...nextDraft,
        body: bodyWithInlineImage,
        imageUrl: supabase ? imageUrl : draft.imagePreviewUrl,
        imagePath: uploadedImagePath,
      };
      const newPost = supabase
        ? await dependencies.createPost(
            supabase,
            postDraft,
            startedSession.currentUserId!,
          )
        : dependencies.createLocalPost(postDraft);
      postPersisted = true;

      if (!requestIsCurrent()) {
        if (supabase && startedSession.currentUserId) {
          dependencies.invalidateRemoteData(startedSession.currentUserId);
        }
        return false;
      }

      if (supabase && uploadedImagePath && !newPost.imageUrl) {
        await cleanUploadedImage();
      }

      if (supabase && startedSession.currentUserId) {
        dependencies.invalidateRemoteData(startedSession.currentUserId);
      } else {
        dependencies.rememberLocalPost(newPost);
      }

      resetDraft();
      return true;
    } catch (error) {
      if (!postPersisted) await cleanUploadedImage();

      if (requestIsCurrent()) {
        console.error("create community post failed:", error);
        pushFeedback({
          tone: "error",
          title: "Post failed",
          message: "Could not create post.",
        });
      }
      return false;
    } finally {
      if (requestIsCurrent()) {
        creatingRef.current = false;
        setCreating(false);
      }
    }
  }, [dependencies, draft, pushFeedback, resetDraft, supabase]);

  return {
    creating,
    handleCreatePost,
  };
}
