import * as React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import {
  clearCommunityMemoryCache,
  getCachedCommunityForOwner,
} from "../state/communityMemory";
import type { PostUI } from "../types";
import {
  useCommunityData,
  type CommunityDataDependencies,
} from "./useCommunityData";
import {
  useCommunityFeedActions,
  type CommunityFeedActionDependencies,
} from "./useCommunityFeedActions";

type LoadResult = Awaited<ReturnType<CommunityDataDependencies["load"]>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

const livePost: PostUI = {
  id: "post-1",
  user: "Member",
  initials: "ME",
  title: "Live research",
  body: "Useful notes",
  votes: 4,
  time: "now",
  sortTime: 100,
  tags: [],
  commentCount: 0,
  avatarGradient: "linear-gradient(#000, #111)",
  fromDB: true,
  authorId: "user-a",
};

function loaded(overrides: Partial<LoadResult> = {}): LoadResult {
  return {
    posts: [livePost],
    comments: [],
    likedPostIds: [],
    savedPostIds: [],
    ...overrides,
  };
}

async function renderHarness(
  load: CommunityDataDependencies["load"],
  supabase: any = {},
) {
  let currentUserId = "user-a";
  let dependencies: CommunityDataDependencies = {
    load,
    subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
  };
  const actionDependencies: CommunityFeedActionDependencies = {
    createComment: jest.fn<any>(),
    deleteComment: jest.fn<any>(),
    deletePost: jest.fn<any>(),
    removeImage: jest.fn<any>(),
    uploadCommentImage: jest.fn<any>(),
    setPostLike: jest.fn<any>(),
    setPostSaved: jest.fn<any>(),
  };
  let latest!: ReturnType<typeof useCommunityData> &
    ReturnType<typeof useCommunityFeedActions>;
  let renderer!: ReactTestRenderer;
  function Probe() {
    const data = useCommunityData(
      {
        authLoading: false,
        currentUserId,
        feedView: "new",
        query: "",
        supabase,
        topTimeRange: "all-time",
      },
      dependencies,
    );
    const actions = useCommunityFeedActions(
      {
        ...data,
        sessionKey: `user:${currentUserId}`,
        pushFeedback: jest.fn(),
        supabase,
      },
      actionDependencies,
    );
    latest = { ...data, ...actions };
    return null;
  }
  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
  });
  return {
    actionDependencies,
    renderer,
    supabase,
    get latest() {
      return latest;
    },
    async changeOwner(userId: string) {
      currentUserId = userId;
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
    async replaceLoad(nextLoad: CommunityDataDependencies["load"]) {
      dependencies = { ...dependencies, load: nextLoad };
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
  };
}

describe("Community partial-load recovery", () => {
  beforeEach(() => {
    clearCommunityMemoryCache();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(["commentsError", "likesError", "savesError"] as const)(
    "recovers %s without hiding or refetching useful posts",
    async (failure) => {
      const retry = deferred<LoadResult>();
      const load = jest
        .fn<any>()
        .mockResolvedValueOnce(
          loaded({ [failure]: "Associated data unavailable." }),
        )
        .mockReturnValueOnce(retry.promise);
      const harness = await renderHarness(load);
      await act(async () => {
        harness.latest.retryLoad();
        harness.latest.retryLoad();
      });
      expect(load).toHaveBeenCalledTimes(2);
      expect(harness.latest.posts).toEqual([livePost]);
      expect(harness.latest.loadingCommunity).toBe(false);
      expect(harness.latest.retryingCommunity).toBe(true);
      expect(load).toHaveBeenLastCalledWith(harness.supabase, "user-a", {
        posts: [livePost],
        comments: failure === "commentsError",
        likes: failure === "likesError",
        saves: failure === "savesError",
      });
      await act(async () => {
        retry.resolve(
          loaded({
            likedPostIds: [livePost.id],
            savedPostIds: [livePost.id],
            comments: [
              {
                postId: livePost.id,
                comment: {
                  id: "comment-1",
                  user: "Member",
                  text: "Recovered context",
                  createdAt: "2026-10-09T00:00:00.000Z",
                },
              },
            ],
          }),
        );
      });
      expect(harness.latest.loadError).toBeNull();
      expect(harness.latest.retryingCommunity).toBe(false);
      if (failure === "commentsError")
        expect(harness.latest.commentsState.counts[livePost.id]).toBe(1);
      if (failure === "likesError")
        expect(harness.latest.likedPostIds.has(livePost.id)).toBe(true);
      if (failure === "savesError")
        expect(harness.latest.savedPostIds.has(livePost.id)).toBe(true);
      harness.renderer.unmount();
    },
  );

  it("blocks unknown toggle state until recovery, then removes existing likes and saves", async () => {
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(
        loaded({
          likesError: "Likes unavailable.",
          savesError: "Saves unavailable.",
        }),
      )
      .mockResolvedValueOnce(
        loaded({ likedPostIds: [livePost.id], savedPostIds: [livePost.id] }),
      );
    const harness = await renderHarness(load);
    (
      harness.actionDependencies.setPostLike as jest.Mock<any>
    ).mockResolvedValue(3);
    await act(async () => {
      await harness.latest.handleToggleLike(livePost.id);
      await harness.latest.handleToggleSave(livePost.id);
    });
    expect(harness.actionDependencies.setPostLike).not.toHaveBeenCalled();
    expect(harness.actionDependencies.setPostSaved).not.toHaveBeenCalled();
    expect(harness.latest.posts[0].votes).toBe(4);
    await act(async () => {
      harness.latest.retryLoad();
    });
    await act(async () => {
      await harness.latest.handleToggleLike(livePost.id);
      await harness.latest.handleToggleSave(livePost.id);
    });
    expect(harness.actionDependencies.setPostLike).toHaveBeenCalledWith(
      harness.supabase,
      livePost.id,
      false,
      "user-a",
    );
    expect(harness.actionDependencies.setPostSaved).toHaveBeenCalledWith(
      harness.supabase,
      livePost.id,
      false,
      "user-a",
    );
    harness.renderer.unmount();
  });

  it("preserves healthy optimistic likes, saves and in-flight actions during comments recovery", async () => {
    const retry = deferred<LoadResult>();
    const like = deferred<number>();
    const save = deferred<void>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ commentsError: "Comments unavailable." }))
      .mockReturnValueOnce(retry.promise);
    const harness = await renderHarness(load);
    (harness.actionDependencies.setPostLike as jest.Mock<any>).mockReturnValue(
      like.promise,
    );
    (harness.actionDependencies.setPostSaved as jest.Mock<any>).mockReturnValue(
      save.promise,
    );
    let likeAction!: Promise<void>;
    let saveAction!: Promise<void>;
    await act(async () => {
      likeAction = harness.latest.handleToggleLike(livePost.id);
      saveAction = harness.latest.handleToggleSave(livePost.id);
      harness.latest.retryLoad();
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(harness.latest.posts[0].votes).toBe(5);
    await act(async () => {
      retry.resolve(loaded());
    });
    expect(harness.latest.likedPostIds.has(livePost.id)).toBe(true);
    expect(harness.latest.savedPostIds.has(livePost.id)).toBe(true);
    expect(harness.latest.posts[0].votes).toBe(5);
    expect(harness.latest.likingPostIds.has(livePost.id)).toBe(true);
    expect(harness.latest.savingPostIds.has(livePost.id)).toBe(true);
    await act(async () => {
      like.resolve(5);
      save.resolve();
      await Promise.all([likeAction, saveAction]);
    });
    expect(harness.latest.likingPostIds.size).toBe(0);
    expect(harness.latest.savingPostIds.size).toBe(0);
    harness.renderer.unmount();
  });

  it("retains new comments and does not resurrect comments deleted during recovery", async () => {
    const retry = deferred<LoadResult>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ commentsError: "Comments unavailable." }))
      .mockReturnValueOnce(retry.promise);
    const harness = await renderHarness(load);
    const comment = {
      id: "live-comment",
      user: "You",
      text: "New context",
      createdAt: "2026-10-09T00:00:00.000Z",
    };
    await act(async () => {
      harness.latest.dispatchComments({
        type: "addComment",
        postId: livePost.id,
        comment,
      });
      harness.latest.retryLoad();
    });
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => {
      harness.latest.dispatchComments({
        type: "removeComment",
        postId: livePost.id,
        commentId: comment.id,
      });
      harness.latest.dispatchComments({
        type: "addComment",
        postId: livePost.id,
        comment: { ...comment, id: "retained-comment" },
      });
      retry.resolve(loaded({ comments: [{ postId: livePost.id, comment }] }));
    });
    expect(
      harness.latest.commentsState.byPost[livePost.id].map((item) => item.id),
    ).toEqual(["retained-comment"]);
    expect(harness.latest.commentsState.counts[livePost.id]).toBe(1);
    harness.renderer.unmount();
  });

  it.each(["add", "delete", "replace"] as const)(
    "preserves a comment %s queued in the same batch immediately after retry starts",
    async (change) => {
      const retry = deferred<LoadResult>();
      const load = jest
        .fn<any>()
        .mockResolvedValueOnce(
          loaded({ commentsError: "Comments unavailable." }),
        )
        .mockReturnValueOnce(retry.promise);
      const harness = await renderHarness(load);
      const previousComment = {
        id: "previous-comment",
        user: "Member",
        text: "Previous context",
        createdAt: "2026-10-09T00:00:00.000Z",
      };
      const newComment = {
        ...previousComment,
        id: "new-comment",
        text: "New context",
      };
      if (change !== "add") {
        await act(async () => {
          harness.latest.dispatchComments({
            type: "addComment",
            postId: livePost.id,
            comment: previousComment,
          });
        });
      }

      await act(async () => {
        harness.latest.retryLoad();
        if (change === "add") {
          harness.latest.dispatchComments({
            type: "addComment",
            postId: livePost.id,
            comment: newComment,
          });
        } else if (change === "delete") {
          harness.latest.dispatchComments({
            type: "removeComment",
            postId: livePost.id,
            commentId: previousComment.id,
          });
        } else {
          harness.latest.dispatchComments({
            type: "reset",
            posts: [livePost],
            comments: [{ postId: livePost.id, comment: newComment }],
          });
        }
      });
      expect(load).toHaveBeenCalledTimes(2);
      const expectedIds = change === "delete" ? [] : [newComment.id];
      expect(
        harness.latest.commentsState.byPost[livePost.id].map((item) => item.id),
      ).toEqual(expectedIds);

      await act(async () => {
        retry.resolve(
          loaded({
            comments:
              change === "add"
                ? []
                : [{ postId: livePost.id, comment: previousComment }],
          }),
        );
      });
      expect(
        harness.latest.commentsState.byPost[livePost.id].map((item) => item.id),
      ).toEqual(expectedIds);
      expect(harness.latest.commentsState.counts[livePost.id]).toBe(
        expectedIds.length,
      );
      harness.renderer.unmount();
    },
  );

  it("ignores an old owner retry callback and late recovery response", async () => {
    const retry = deferred<LoadResult>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ savesError: "Saves unavailable." }))
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce(
        loaded({ posts: [{ ...livePost, id: "post-b", authorId: "user-b" }] }),
      );
    const harness = await renderHarness(load);
    const oldRetry = harness.latest.retryLoad;
    await act(async () => {
      oldRetry();
    });
    await harness.changeOwner("user-b");
    await act(async () => {
      oldRetry();
      retry.resolve(loaded({ savedPostIds: [livePost.id] }));
    });
    expect(load).toHaveBeenCalledTimes(3);
    expect(harness.latest.posts.map((item) => item.id)).toEqual(["post-b"]);
    expect(harness.latest.savedPostIds.size).toBe(0);
    harness.renderer.unmount();
  });

  it("keeps queued comments when a duplicate retry is attempted in the same batch", async () => {
    const retry = deferred<LoadResult>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ commentsError: "Comments unavailable." }))
      .mockReturnValueOnce(retry.promise);
    const harness = await renderHarness(load);
    const comment = {
      id: "new-comment",
      user: "Member",
      text: "New context",
      createdAt: "2026-10-09T00:00:00.000Z",
    };
    await act(async () => {
      harness.latest.retryLoad();
      harness.latest.dispatchComments({
        type: "addComment",
        postId: livePost.id,
        comment,
      });
      harness.latest.retryLoad();
    });
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => {
      retry.resolve(loaded());
    });
    expect(harness.latest.commentsState.byPost[livePost.id]).toEqual([comment]);
    expect(harness.latest.commentsState.counts[livePost.id]).toBe(1);
    harness.renderer.unmount();
  });

  it("preserves queued comments when the same-owner recovery request is superseded", async () => {
    const older = deferred<LoadResult>();
    const newer = deferred<LoadResult>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ commentsError: "Comments unavailable." }))
      .mockReturnValueOnce(older.promise);
    const harness = await renderHarness(load);
    const comment = {
      id: "new-comment",
      user: "Member",
      text: "New context",
      createdAt: "2026-10-09T00:00:00.000Z",
    };
    await act(async () => {
      harness.latest.retryLoad();
      harness.latest.dispatchComments({
        type: "addComment",
        postId: livePost.id,
        comment,
      });
    });
    const newerLoad = jest.fn<any>().mockReturnValue(newer.promise);
    await harness.replaceLoad(newerLoad);
    expect(newerLoad).toHaveBeenCalledTimes(1);
    await act(async () => {
      older.resolve(loaded({ commentsError: "Superseded error." }));
    });
    expect(harness.latest.retryingCommunity).toBe(true);
    expect(harness.latest.commentsState.byPost[livePost.id]).toEqual([comment]);
    await act(async () => {
      newer.resolve(loaded());
    });
    expect(harness.latest.loadError).toBeNull();
    expect(harness.latest.commentsState.byPost[livePost.id]).toEqual([comment]);
    expect(harness.latest.commentsState.counts[livePost.id]).toBe(1);
    harness.renderer.unmount();
  });

  it("ignores a superseded recovery response for the same owner", async () => {
    const retry = deferred<LoadResult>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ savesError: "Saves unavailable." }))
      .mockReturnValueOnce(retry.promise);
    const harness = await renderHarness(load);
    await act(async () => {
      harness.latest.retryLoad();
    });
    expect(load).toHaveBeenCalledTimes(2);
    await harness.replaceLoad(
      jest.fn<any>().mockResolvedValue(loaded({ savedPostIds: [livePost.id] })),
    );
    await act(async () => {
      retry.resolve(loaded({ savesError: "Old failure." }));
    });
    expect(harness.latest.loadError).toBeNull();
    expect(harness.latest.savedPostIds.has(livePost.id)).toBe(true);
    harness.renderer.unmount();
  });

  it("starts a full load when returning to an owner whose recovery was interrupted", async () => {
    const retry = deferred<LoadResult>();
    const returnedPost = { ...livePost, id: "returned-post" };
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(loaded({ savesError: "Saves unavailable." }))
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce(
        loaded({ posts: [{ ...livePost, id: "post-b", authorId: "user-b" }] }),
      )
      .mockResolvedValueOnce(
        loaded({ posts: [returnedPost], savedPostIds: [returnedPost.id] }),
      );
    const harness = await renderHarness(load);
    await act(async () => {
      harness.latest.retryLoad();
    });
    await harness.changeOwner("user-b");
    await harness.changeOwner("user-a");
    await act(async () => {
      retry.resolve(loaded({ savesError: "Old failure." }));
    });
    expect(load).toHaveBeenCalledTimes(4);
    expect(load).toHaveBeenLastCalledWith(harness.supabase, "user-a");
    expect(harness.latest.posts).toEqual([returnedPost]);
    expect(harness.latest.savedPostIds.has(returnedPost.id)).toBe(true);
    expect(harness.latest.loadError).toBeNull();
    harness.renderer.unmount();
  });

  it("keeps failed membership out of the complete cache across a remount", async () => {
    const load = jest
      .fn<any>()
      .mockResolvedValue(loaded({ savesError: "Saves unavailable." }));
    const first = await renderHarness(load);
    expect(first.latest.savesReady).toBe(false);
    expect(getCachedCommunityForOwner("user:user-a")).toBeNull();
    first.renderer.unmount();
    const second = await renderHarness(load);
    expect(second.latest.savesReady).toBe(false);
    expect(second.latest.canRetryLoad).toBe(true);
    expect(getCachedCommunityForOwner("user:user-a")).toBeNull();
    second.renderer.unmount();
  });

  it("keeps only unresolved secondary errors for the next explicit retry", async () => {
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(
        loaded({
          commentsError: "Comments unavailable.",
          savesError: "Saves unavailable.",
        }),
      )
      .mockResolvedValueOnce(loaded({ savesError: "Saves still unavailable." }))
      .mockResolvedValueOnce(loaded({ savedPostIds: [livePost.id] }));
    const harness = await renderHarness(load);
    await act(async () => {
      harness.latest.retryLoad();
    });
    expect(harness.latest.loadError).toBe("Saves still unavailable.");
    expect(harness.latest.commentsReady).toBe(true);
    expect(harness.latest.savesReady).toBe(false);
    await act(async () => {
      harness.latest.retryLoad();
    });
    expect(load).toHaveBeenLastCalledWith(harness.supabase, "user-a", {
      posts: [livePost],
      comments: false,
      likes: false,
      saves: true,
    });
    expect(harness.latest.savedPostIds.has(livePost.id)).toBe(true);
    expect(harness.latest.loadError).toBeNull();
    harness.renderer.unmount();
  });

  it("does not restore a post or its associated data after deletion during recovery", async () => {
    const retry = deferred<LoadResult>();
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(
        loaded({
          commentsError: "Comments unavailable.",
          savesError: "Saves unavailable.",
        }),
      )
      .mockReturnValueOnce(retry.promise);
    const harness = await renderHarness(load);
    await act(async () => {
      harness.latest.retryLoad();
    });
    await act(async () => {
      harness.latest.setPosts([]);
      harness.latest.dispatchComments({
        type: "removePost",
        postId: livePost.id,
      });
      retry.resolve(
        loaded({
          savedPostIds: [livePost.id],
          comments: [
            {
              postId: livePost.id,
              comment: {
                id: "comment-1",
                user: "Member",
                text: "Old context",
                createdAt: "2026-10-09T00:00:00.000Z",
              },
            },
          ],
        }),
      );
    });
    expect(harness.latest.posts).toEqual([]);
    expect(harness.latest.savedPostIds.size).toBe(0);
    expect(harness.latest.commentsState.byPost[livePost.id]).toBeUndefined();
    harness.renderer.unmount();
  });

  it("keeps a rejected recovery actionable without changing posts or known activity", async () => {
    const load = jest
      .fn<any>()
      .mockResolvedValueOnce(
        loaded({
          savesError: "Saves unavailable.",
          likedPostIds: [livePost.id],
        }),
      )
      .mockRejectedValueOnce(new Error("Internal host details"));
    const harness = await renderHarness(load);
    await act(async () => {
      harness.latest.retryLoad();
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(harness.latest.loadError).toBe(
      "Could not reload community details. Try again.",
    );
    expect(harness.latest.canRetryLoad).toBe(true);
    expect(harness.latest.retryingCommunity).toBe(false);
    expect(harness.latest.posts).toEqual([livePost]);
    expect(harness.latest.likedPostIds.has(livePost.id)).toBe(true);
    expect(harness.latest.savesReady).toBe(false);
    harness.renderer.unmount();
  });

  it("keeps demo likes and saves usable without remote data or retries", async () => {
    const load = jest.fn<any>();
    const harness = await renderHarness(load, null);
    const target = harness.latest.posts[0];
    await act(async () => {
      await harness.latest.handleToggleLike(target.id);
      await harness.latest.handleToggleSave(target.id);
    });
    expect(harness.latest.likedPostIds.has(target.id)).toBe(true);
    expect(harness.latest.savedPostIds.has(target.id)).toBe(true);
    expect(harness.latest.posts[0].votes).toBe(target.votes + 1);
    await act(async () => {
      await harness.latest.handleToggleLike(target.id);
      await harness.latest.handleToggleSave(target.id);
      harness.latest.retryLoad();
    });
    expect(harness.latest.likedPostIds.has(target.id)).toBe(false);
    expect(harness.latest.savedPostIds.has(target.id)).toBe(false);
    expect(harness.latest.posts[0].votes).toBe(target.votes);
    expect(load).not.toHaveBeenCalled();
    expect(harness.actionDependencies.setPostLike).not.toHaveBeenCalled();
    expect(harness.actionDependencies.setPostSaved).not.toHaveBeenCalled();
    harness.renderer.unmount();
  });

  it("blocks retained toggle callbacks when current membership becomes unknown", async () => {
    const harness = await renderHarness(
      jest.fn<any>().mockResolvedValue(loaded()),
    );
    const toggleLike = harness.latest.handleToggleLike;
    const toggleSave = harness.latest.handleToggleSave;
    await harness.replaceLoad(
      jest.fn<any>().mockResolvedValue(
        loaded({
          likesError: "Likes unavailable.",
          savesError: "Saves unavailable.",
        }),
      ),
    );
    await act(async () => {
      await toggleLike(livePost.id);
      await toggleSave(livePost.id);
    });
    expect(harness.actionDependencies.setPostLike).not.toHaveBeenCalled();
    expect(harness.actionDependencies.setPostSaved).not.toHaveBeenCalled();
    harness.renderer.unmount();
  });
});
