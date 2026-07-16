import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { commentsReducer, createCommentsState } from "../state/commentsReducer";
import type { FeedbackMessage, PostUI } from "../types";
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

function post(): PostUI {
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

describe("useCommunityFeedActions", () => {
  it("rejects comments for a discussion that is no longer in the feed", async () => {
    const dependencies = createDependencies();
    const feedback: Array<Omit<FeedbackMessage, "id">> = [];
    let latest:
      | (ReturnType<typeof useCommunityFeedActions> & {
          commentsState: ReturnType<typeof createCommentsState>;
        })
      | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      const [posts, setPosts] = React.useState<PostUI[]>([]);
      const [likedPostIds, setLikedPostIds] = React.useState(new Set<string>());
      const [commentsState, dispatchComments] = React.useReducer(
        commentsReducer,
        createCommentsState([]),
      );
      const actions = useCommunityFeedActions(
        {
          canDeleteComment: () => false,
          canDeletePost: () => false,
          commentsState,
          currentUserId: "user-a",
          dispatchComments,
          likedPostIds,
          posts,
          pushFeedback: (message) => feedback.push(message),
          sessionKey: "user:user-a",
          setLikedPostIds,
          setPosts,
          supabase: {} as any,
        },
        dependencies,
      );
      latest = { ...actions, commentsState };
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    await expect(
      latest!.handleAddComment("missing-post", { text: "orphan" }),
    ).rejects.toThrow("Discussion is no longer available.");
    expect(dependencies.createComment).not.toHaveBeenCalled();
    expect(latest!.commentsState.byPost["missing-post"]).toBeUndefined();
    expect(feedback).toEqual([]);
    renderer!.unmount();
  });

  it("deduplicates an in-flight like and rolls back a failed optimistic vote", async () => {
    const request = deferred<number>();
    const dependencies = createDependencies();
    (dependencies.setPostLike as jest.Mock<any>).mockReturnValue(request.promise);
    const feedback: Array<Omit<FeedbackMessage, "id">> = [];
    let latest:
      | (ReturnType<typeof useCommunityFeedActions> & {
          likedPostIds: Set<string>;
          posts: PostUI[];
        })
      | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      const [posts, setPosts] = React.useState<PostUI[]>([post()]);
      const [likedPostIds, setLikedPostIds] = React.useState(new Set<string>());
      const [commentsState, dispatchComments] = React.useReducer(
        commentsReducer,
        createCommentsState(posts),
      );
      const actions = useCommunityFeedActions(
        {
          canDeleteComment: () => false,
          canDeletePost: () => true,
          commentsState,
          currentUserId: "user-a",
          dispatchComments,
          likedPostIds,
          posts,
          pushFeedback: (message) => feedback.push(message),
          sessionKey: "user:user-a",
          setLikedPostIds,
          setPosts,
          supabase: {} as any,
        },
        dependencies,
      );
      latest = { ...actions, likedPostIds, posts };
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    let firstRequest!: Promise<void>;
    act(() => {
      firstRequest = latest!.handleToggleLike("post-1");
      void latest!.handleToggleLike("post-1");
    });
    expect(dependencies.setPostLike).toHaveBeenCalledTimes(1);
    expect(latest!.posts[0].votes).toBe(3);
    expect(latest!.likedPostIds.has("post-1")).toBe(true);
    expect(latest!.likingPostIds.has("post-1")).toBe(true);

    await act(async () => {
      request.reject(new Error("raw database policy details"));
      await firstRequest;
    });
    expect(latest!.posts[0].votes).toBe(2);
    expect(latest!.likedPostIds.has("post-1")).toBe(false);
    expect(latest!.likingPostIds.has("post-1")).toBe(false);
    expect(feedback).toEqual([
      {
        tone: "error",
        title: "Like was not saved",
        message: "Could not update like.",
      },
    ]);
    renderer!.unmount();
  });

  it("ignores a like response that belongs to a previous auth session", async () => {
    const request = deferred<number>();
    const dependencies = createDependencies();
    (dependencies.setPostLike as jest.Mock<any>).mockReturnValue(request.promise);
    let sessionKey = "user:user-a";
    let latest:
      | (ReturnType<typeof useCommunityFeedActions> & { posts: PostUI[] })
      | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      const [posts, setPosts] = React.useState<PostUI[]>([post()]);
      const [likedPostIds, setLikedPostIds] = React.useState(new Set<string>());
      const [commentsState, dispatchComments] = React.useReducer(
        commentsReducer,
        createCommentsState(posts),
      );
      const actions = useCommunityFeedActions(
        {
          canDeleteComment: () => false,
          canDeletePost: () => true,
          commentsState,
          currentUserId: sessionKey.endsWith("user-a") ? "user-a" : "user-b",
          dispatchComments,
          likedPostIds,
          posts,
          pushFeedback: jest.fn(),
          sessionKey,
          setLikedPostIds,
          setPosts,
          supabase: {} as any,
        },
        dependencies,
      );
      latest = { ...actions, posts };
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    let pending!: Promise<void>;
    act(() => {
      pending = latest!.handleToggleLike("post-1");
    });
    sessionKey = "user:user-b";
    act(() => renderer!.update(<Probe />));
    expect(latest!.likingPostIds.size).toBe(0);

    await act(async () => {
      request.resolve(99);
      await pending;
    });
    expect(latest!.posts[0].votes).not.toBe(99);
    expect(latest!.likingPostIds.size).toBe(0);
    renderer!.unmount();
  });
});
