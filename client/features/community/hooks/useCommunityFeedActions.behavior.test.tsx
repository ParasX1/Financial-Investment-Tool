import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { commentsReducer, createCommentsState } from "../state/commentsReducer";
import type {
  CommentEntry,
  CommentUI,
  FeedbackMessage,
  PostUI,
} from "../types";
import {
  useCommunityFeedActions,
  type CommunityFeedActionDependencies,
} from "./useCommunityFeedActions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function createPost(overrides: Partial<PostUI> = {}): PostUI {
  return {
    id: "post-1",
    user: "You",
    initials: "YU",
    title: "Test discussion",
    body: "Test body",
    votes: 2,
    time: "now",
    sortTime: Date.now(),
    tags: [],
    commentCount: 0,
    avatarGradient: "linear-gradient(#000, #111)",
    fromDB: true,
    authorId: "user-a",
    ...overrides,
  };
}

function createComment(overrides: Partial<CommentUI> = {}): CommentUI {
  return {
    id: "comment-1",
    user: "You",
    text: "Useful context",
    createdAt: "2026-07-17T00:00:00.000Z",
    fromDB: true,
    authorId: "user-a",
    ...overrides,
  };
}

function createDependencies(): CommunityFeedActionDependencies {
  return {
    createComment: jest.fn<any>(),
    deleteComment: jest.fn<any>(),
    deletePost: jest.fn<any>(),
    removeImage: jest.fn<any>().mockResolvedValue(undefined),
    setPostLike: jest.fn<any>(),
    uploadCommentImage: jest.fn<any>(),
  };
}

type HarnessOptions = {
  canDeleteComment?: (comment: CommentUI) => boolean;
  canDeletePost?: (post: PostUI) => boolean;
  currentUserId?: string | null;
  dependencies: CommunityFeedActionDependencies;
  initialComments?: CommentEntry[];
  initialLikedPostIds?: string[];
  initialPosts?: PostUI[];
  sessionKey?: string;
  supabase?: any;
};

async function renderHarness(options: HarnessOptions) {
  const initialPosts = options.initialPosts ?? [createPost()];
  const feedback: Array<Omit<FeedbackMessage, "id">> = [];
  let currentUserId =
    options.currentUserId === undefined ? "user-a" : options.currentUserId;
  let sessionKey = options.sessionKey ?? "user:user-a";
  let latest:
    | (ReturnType<typeof useCommunityFeedActions> & {
        commentsState: ReturnType<typeof createCommentsState>;
        likedPostIds: Set<string>;
        posts: PostUI[];
      })
    | null = null;
  let renderer!: ReactTestRenderer;

  function Probe() {
    const [posts, setPosts] = React.useState(initialPosts);
    const [likedPostIds, setLikedPostIds] = React.useState(
      () => new Set(options.initialLikedPostIds ?? []),
    );
    const [commentsState, dispatchComments] = React.useReducer(
      commentsReducer,
      createCommentsState(initialPosts, options.initialComments),
    );
    const actions = useCommunityFeedActions(
      {
        canDeleteComment: options.canDeleteComment ?? (() => true),
        canDeletePost: options.canDeletePost ?? (() => true),
        commentsState,
        currentUserId,
        dispatchComments,
        likedPostIds,
        posts,
        pushFeedback: (message) => feedback.push(message),
        sessionKey,
        setLikedPostIds,
        setPosts,
        supabase:
          options.supabase === undefined ? ({} as any) : options.supabase,
      },
      options.dependencies,
    );
    latest = { ...actions, commentsState, likedPostIds, posts };
    return null;
  }

  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
  });

  return {
    feedback,
    get latest() {
      return latest!;
    },
    renderer,
    async updateSession(nextSessionKey: string, nextUserId: string | null) {
      sessionKey = nextSessionKey;
      currentUserId = nextUserId;
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
  };
}

describe("useCommunityFeedActions behavior", () => {
  it("persists a remote comment with its uploaded image", async () => {
    const dependencies = createDependencies();
    const savedComment = createComment();
    (dependencies.uploadCommentImage as jest.Mock<any>).mockResolvedValue({
      path: "user-a/comments/image.png",
      publicUrl: "https://images.example/image.png",
    });
    (dependencies.createComment as jest.Mock<any>).mockResolvedValue(
      savedComment,
    );
    const harness = await renderHarness({ dependencies });
    const file = new File(["image"], "image.png", { type: "image/png" });

    await act(async () => {
      await harness.latest.handleAddComment("post-1", {
        text: "Useful context",
        file,
      });
    });

    expect(dependencies.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-a",
        postId: "post-1",
        text: "Useful context",
        imagePath: "user-a/comments/image.png",
        imageUrl: "https://images.example/image.png",
      }),
    );
    expect(dependencies.removeImage).not.toHaveBeenCalled();
    expect(harness.latest.commentsState.byPost["post-1"]).toEqual([
      savedComment,
    ]);
    harness.renderer.unmount();
  });

  it("removes an uploaded image when saving the comment fails", async () => {
    const dependencies = createDependencies();
    (dependencies.uploadCommentImage as jest.Mock<any>).mockResolvedValue({
      path: "user-a/comments/orphan.png",
      publicUrl: "https://images.example/orphan.png",
    });
    (dependencies.createComment as jest.Mock<any>).mockRejectedValue(
      new Error("raw database details"),
    );
    const supabase = {} as any;
    const harness = await renderHarness({ dependencies, supabase });
    let failure: unknown;

    await act(async () => {
      try {
        await harness.latest.handleAddComment("post-1", {
          text: "Useful context",
          file: new File(["image"], "image.png", { type: "image/png" }),
        });
      } catch (error) {
        failure = error;
      }
    });

    expect(failure).toEqual(new Error("Could not post comment."));
    expect(dependencies.removeImage).toHaveBeenCalledWith(
      supabase,
      "user-a/comments/orphan.png",
    );
    expect(harness.latest.commentsState.byPost["post-1"]).toEqual([]);
    harness.renderer.unmount();
  });

  it("cleans up an upload completed for a previous auth session", async () => {
    const upload = deferred<{ path: string; publicUrl: string }>();
    const dependencies = createDependencies();
    (dependencies.uploadCommentImage as jest.Mock<any>).mockReturnValue(
      upload.promise,
    );
    const supabase = {} as any;
    const harness = await renderHarness({ dependencies, supabase });
    let pending!: Promise<void>;

    act(() => {
      pending = harness.latest.handleAddComment("post-1", {
        text: "Useful context",
        file: new File(["image"], "image.png", { type: "image/png" }),
      });
    });
    await harness.updateSession("user:user-b", "user-b");

    await act(async () => {
      upload.resolve({
        path: "user-a/comments/late.png",
        publicUrl: "https://images.example/late.png",
      });
      await pending;
    });

    expect(dependencies.removeImage).toHaveBeenCalledWith(
      supabase,
      "user-a/comments/late.png",
    );
    expect(dependencies.createComment).not.toHaveBeenCalled();
    expect(harness.latest.commentsState.byPost["post-1"]).toEqual([]);
    harness.renderer.unmount();
  });

  it("deletes an owned discussion and all of its local feed state", async () => {
    const dependencies = createDependencies();
    (dependencies.deletePost as jest.Mock<any>).mockResolvedValue(undefined);
    const comment = createComment();
    const harness = await renderHarness({
      dependencies,
      initialComments: [{ postId: "post-1", comment }],
      initialLikedPostIds: ["post-1"],
    });

    act(() => harness.latest.requestDeletePost("post-1"));
    expect(harness.latest.pendingDelete?.type).toBe("post");
    await act(async () => {
      await harness.latest.confirmPendingDelete();
    });

    expect(dependencies.deletePost).toHaveBeenCalledWith(
      expect.anything(),
      "post-1",
      "user-a",
    );
    expect(harness.latest.posts).toEqual([]);
    expect(harness.latest.likedPostIds.has("post-1")).toBe(false);
    expect(harness.latest.commentsState.byPost["post-1"]).toBeUndefined();
    expect(harness.latest.pendingDelete).toBeNull();
    harness.renderer.unmount();
  });

  it("deletes an owned comment while leaving its discussion intact", async () => {
    const dependencies = createDependencies();
    (dependencies.deleteComment as jest.Mock<any>).mockResolvedValue(undefined);
    const comment = createComment();
    const harness = await renderHarness({
      dependencies,
      initialComments: [{ postId: "post-1", comment }],
    });

    act(() =>
      harness.latest.requestDeleteComment(comment.id, "post-1"),
    );
    await act(async () => {
      await harness.latest.confirmPendingDelete();
    });

    expect(dependencies.deleteComment).toHaveBeenCalledWith(
      expect.anything(),
      "comment-1",
      "user-a",
    );
    expect(harness.latest.posts).toHaveLength(1);
    expect(harness.latest.commentsState.byPost["post-1"]).toEqual([]);
    expect(harness.latest.commentsState.counts["post-1"]).toBe(0);
    harness.renderer.unmount();
  });

  it("keeps the delete dialog and feed state when deletion fails", async () => {
    const dependencies = createDependencies();
    (dependencies.deletePost as jest.Mock<any>).mockRejectedValue(
      new Error("raw policy details"),
    );
    const harness = await renderHarness({ dependencies });

    act(() => harness.latest.requestDeletePost("post-1"));
    await act(async () => {
      await harness.latest.confirmPendingDelete();
    });

    expect(harness.latest.posts).toHaveLength(1);
    expect(harness.latest.pendingDelete?.type).toBe("post");
    expect(harness.latest.deleting).toBe(false);
    expect(harness.feedback).toEqual([
      {
        tone: "error",
        title: "Delete failed",
        message: "Could not delete post.",
      },
    ]);
    harness.renderer.unmount();
  });

  it("ignores a delete response that belongs to a previous account", async () => {
    const request = deferred<void>();
    const dependencies = createDependencies();
    (dependencies.deletePost as jest.Mock<any>).mockReturnValue(request.promise);
    const harness = await renderHarness({ dependencies });
    let pending!: Promise<void>;

    act(() => harness.latest.requestDeletePost("post-1"));
    act(() => {
      pending = harness.latest.confirmPendingDelete();
    });
    await harness.updateSession("user:user-b", "user-b");

    await act(async () => {
      request.resolve();
      await pending;
    });

    expect(harness.latest.posts).toHaveLength(1);
    expect(harness.latest.pendingDelete).toBeNull();
    expect(harness.latest.deleting).toBe(false);
    expect(harness.feedback).toEqual([]);
    harness.renderer.unmount();
  });

  it("uses the saved vote count and reports sign-in without calling the API", async () => {
    const dependencies = createDependencies();
    (dependencies.setPostLike as jest.Mock<any>).mockResolvedValue(8);
    const signedIn = await renderHarness({ dependencies });

    await act(async () => {
      await signedIn.latest.handleToggleLike("post-1");
    });
    expect(signedIn.latest.posts[0].votes).toBe(8);
    expect(signedIn.latest.likedPostIds.has("post-1")).toBe(true);
    expect(signedIn.latest.likingPostIds.size).toBe(0);
    signedIn.renderer.unmount();

    const signedOutDependencies = createDependencies();
    const signedOut = await renderHarness({
      currentUserId: null,
      dependencies: signedOutDependencies,
      sessionKey: "signed-out",
    });
    await act(async () => {
      await signedOut.latest.handleToggleLike("post-1");
    });

    expect(signedOutDependencies.setPostLike).not.toHaveBeenCalled();
    expect(signedOut.latest.posts[0].votes).toBe(2);
    expect(signedOut.feedback).toEqual([
      expect.objectContaining({
        tone: "info",
        title: "Sign in to like discussions",
      }),
    ]);
    signedOut.renderer.unmount();
  });

  it("does not let an old account request release the new account like lock", async () => {
    const accountARequest = deferred<number>();
    const accountBRequest = deferred<number>();
    const dependencies = createDependencies();
    (dependencies.setPostLike as jest.Mock<any>)
      .mockReturnValueOnce(accountARequest.promise)
      .mockReturnValueOnce(accountBRequest.promise)
      .mockResolvedValue(9);
    const harness = await renderHarness({ dependencies });
    let pendingA!: Promise<void>;
    let pendingB!: Promise<void>;

    act(() => {
      pendingA = harness.latest.handleToggleLike("post-1");
    });
    await harness.updateSession("user:user-b", "user-b");
    act(() => {
      pendingB = harness.latest.handleToggleLike("post-1");
    });
    expect(dependencies.setPostLike).toHaveBeenCalledTimes(2);
    expect(harness.latest.likingPostIds.has("post-1")).toBe(true);

    await act(async () => {
      accountARequest.resolve(3);
      await pendingA;
    });
    act(() => {
      void harness.latest.handleToggleLike("post-1");
    });

    expect(dependencies.setPostLike).toHaveBeenCalledTimes(2);
    expect(harness.latest.likingPostIds.has("post-1")).toBe(true);

    await act(async () => {
      accountBRequest.resolve(8);
      await pendingB;
    });
    expect(harness.latest.likingPostIds.has("post-1")).toBe(false);
    harness.renderer.unmount();
  });
});
