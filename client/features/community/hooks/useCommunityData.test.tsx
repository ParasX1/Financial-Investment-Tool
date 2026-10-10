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
import { createCommentsState } from "../state/commentsReducer";
import {
  clearCommunityMemoryCache,
  rememberLocalCommunityPost,
  rememberCommunityData,
} from "../state/communityMemory";
import type { PostUI } from "../types";
import {
  useCommunityData,
  type CommunityDataDependencies,
} from "./useCommunityData";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function post(id: string, authorId: string): PostUI {
  return {
    id,
    user: "You",
    initials: "YU",
    title: `${id} title`,
    body: `${id} body`,
    votes: 1,
    time: "now",
    sortTime: Date.now(),
    tags: [],
    commentCount: 0,
    avatarGradient: "linear-gradient(#000, #111)",
    fromDB: true,
    authorId,
  };
}

function result(posts: PostUI[], likedPostIds: string[] = []) {
  return { posts, comments: [], likedPostIds };
}

describe("useCommunityData account-scoped resource", () => {
  beforeEach(() => {
    clearCommunityMemoryCache();
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("restores demo Create posts across Feed remounts without exposing them to remote signed-out mode", async () => {
    const localPost = {
      ...post("local-created", "local"),
      fromDB: undefined,
      authorId: undefined,
    };
    rememberLocalCommunityPost(localPost);
    const dependencies: CommunityDataDependencies = {
      load: jest.fn<any>(),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;

    function DemoProbe() {
      latest = useCommunityData(
        {
          authLoading: false,
          currentUserId: null,
          feedView: "new",
          query: "",
          supabase: null,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<DemoProbe />);
      await flushPromises();
    });
    expect(latest!.posts[0].id).toBe("local-created");
    renderer!.unmount();

    await act(async () => {
      renderer = TestRenderer.create(<DemoProbe />);
      await flushPromises();
    });
    expect(latest!.posts[0].id).toBe("local-created");
    renderer!.unmount();

    const remoteLoad = deferred<ReturnType<typeof result>>();
    dependencies.load = jest.fn<any>(() => remoteLoad.promise);
    const supabase = {} as any;

    function SignedOutProbe() {
      latest = useCommunityData(
        {
          authLoading: false,
          currentUserId: null,
          feedView: "new",
          query: "",
          supabase,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<SignedOutProbe />);
      await flushPromises();
    });
    expect(latest!.posts).toEqual([]);

    await act(async () => {
      remoteLoad.resolve(result([]));
      await flushPromises();
      renderer!.unmount();
    });
  });

  it("masks the previous account cache while auth resolves and user B loads", async () => {
    const oldPost = post("post-a", "user-a");
    rememberCommunityData({
      ownerKey: "user:user-a",
      posts: [oldPost],
      likedPostIds: [oldPost.id],
      savedPostIds: [],
      commentsState: createCommentsState([oldPost]),
    });
    const userBLoad = deferred<ReturnType<typeof result>>();
    const dependencies: CommunityDataDependencies = {
      load: jest.fn<any>(() => userBLoad.promise),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    const supabase = {} as any;
    let props = { authLoading: true, currentUserId: null as string | null };
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useCommunityData(
        {
          ...props,
          feedView: "top",
          query: "",
          supabase,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest!.posts).toEqual([]);
    expect(Array.from(latest!.likedPostIds)).toEqual([]);
    expect(latest!.loadingCommunity).toBe(true);

    props = { authLoading: false, currentUserId: "user-b" };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(dependencies.load).toHaveBeenCalledWith(supabase, "user-b");
    expect(latest!.posts).toEqual([]);
    expect(Array.from(latest!.likedPostIds)).toEqual([]);

    const userBPost = post("post-b", "user-b");
    await act(async () => {
      userBLoad.resolve(result([userBPost], [userBPost.id]));
      await flushPromises();
    });
    expect(latest!.posts.map((item) => item.id)).toEqual(["post-b"]);
    expect(Array.from(latest!.likedPostIds)).toEqual(["post-b"]);
    renderer!.unmount();
  });

  it("discards a late user A request after user B becomes current", async () => {
    const userALoad = deferred<ReturnType<typeof result>>();
    const userBLoad = deferred<ReturnType<typeof result>>();
    const dependencies: CommunityDataDependencies = {
      load: jest.fn<any>((_db: unknown, userId: string | null) =>
        userId === "user-a" ? userALoad.promise : userBLoad.promise,
      ),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    const supabase = {} as any;
    let props = { authLoading: false, currentUserId: "user-a" as string | null };
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useCommunityData(
        {
          ...props,
          feedView: "new",
          query: "",
          supabase,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    props = { authLoading: false, currentUserId: "user-b" };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });

    await act(async () => {
      userBLoad.resolve(result([post("post-b", "user-b")]));
      await flushPromises();
    });
    expect(latest!.posts.map((item) => item.id)).toEqual(["post-b"]);

    await act(async () => {
      userALoad.resolve(result([post("post-a", "user-a")], ["post-a"]));
      await flushPromises();
    });
    expect(latest!.posts.map((item) => item.id)).toEqual(["post-b"]);
    expect(Array.from(latest!.likedPostIds)).toEqual([]);
    renderer!.unmount();
  });

  it("retries an initial failure without changing auth or replacing it with demos", async () => {
    const dependencies: CommunityDataDependencies = {
      load: jest
        .fn<any>()
        .mockRejectedValueOnce(new Error("database host and policy details"))
        .mockResolvedValue(result([post("recovered", "user-a")])),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    const supabase = {} as any;
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useCommunityData(
        {
          authLoading: false,
          currentUserId: "user-a",
          feedView: "top",
          query: "",
          supabase,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest!.posts).toEqual([]);
    expect(latest!.loadError).toBe("Could not load latest community posts.");
    expect(latest!.loadError).not.toContain("database");
    await act(async () => {
      latest!.retryLoad();
      latest!.retryLoad();
      await flushPromises();
    });
    expect(dependencies.load).toHaveBeenCalledTimes(2);
    expect(dependencies.load).toHaveBeenLastCalledWith(supabase, "user-a");
    expect(latest!.posts.map((item) => item.id)).toEqual(["recovered"]);
    expect(latest!.loadError).toBeNull();
    renderer!.unmount();
  });

  it("discards an old account retry response and its retained retry callback", async () => {
    const retryA = deferred<ReturnType<typeof result>>();
    const dependencies: CommunityDataDependencies = {
      load: jest
        .fn<any>()
        .mockRejectedValueOnce(new Error("temporary failure"))
        .mockReturnValueOnce(retryA.promise)
        .mockResolvedValue(result([post("post-b", "user-b")])),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    const supabase = {} as any;
    let currentUserId = "user-a";
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useCommunityData(
        {
          authLoading: false,
          currentUserId,
          supabase,
          feedView: "new",
          query: "",
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    const retry = latest!.retryLoad;
    await act(async () => {
      retry();
      await flushPromises();
    });
    expect(latest!.loadingCommunity).toBe(true);
    currentUserId = "user-b";
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    await act(async () => {
      retry();
      retryA.resolve(result([post("post-a", "user-a")]));
      await flushPromises();
    });
    expect(dependencies.load).toHaveBeenCalledTimes(3);
    expect(latest!.posts.map((item) => item.id)).toEqual(["post-b"]);
    renderer!.unmount();
  });

  it("preserves cached rows and optimistic changes when their refresh fails", async () => {
    const cached = post("cached", "user-a");
    rememberCommunityData({
      ownerKey: "user:user-a",
      posts: [cached],
      likedPostIds: [],
      savedPostIds: [],
      commentsState: createCommentsState([cached]),
    });
    const dependencies: CommunityDataDependencies = {
      load: jest.fn<any>().mockRejectedValue(new Error("temporary failure")),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    const supabase = {} as any;
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useCommunityData(
        {
          authLoading: false,
          currentUserId: "user-a",
          supabase,
          feedView: "new",
          query: "",
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    await act(async () => {
      latest!.setPosts((posts) => posts.map((item) => ({ ...item, votes: 2 })));
      latest!.setLikedPostIds(new Set([cached.id]));
      latest!.setSavedPostIds(new Set([cached.id]));
    });
    await act(async () => {
      latest!.retryLoad();
      await flushPromises();
    });
    expect(dependencies.load).toHaveBeenCalledTimes(1);
    expect(latest!.posts[0]).toMatchObject({ id: "cached", votes: 2 });
    expect(Array.from(latest!.likedPostIds)).toEqual(["cached"]);
    expect(Array.from(latest!.savedPostIds)).toEqual(["cached"]);
    expect(latest!.loadingCommunity).toBe(false);
    renderer!.unmount();
  });

  it("cleans up and replaces the realtime listener when the account changes", async () => {
    const unsubscribeA = jest.fn();
    const unsubscribeB = jest.fn();
    const listeners: Array<(row: any) => void> = [];
    const dependencies: CommunityDataDependencies = {
      load: jest.fn<any>((_db: unknown, userId: string | null) =>
        Promise.resolve(result([post("post-shared", userId ?? "member")])),
      ),
      subscribeToCommentInserts: jest.fn<any>(
        (_db: unknown, listener: (row: any) => void) => {
          listeners.push(listener);
          return listeners.length === 1 ? unsubscribeA : unsubscribeB;
        },
      ),
    };
    const supabase = {} as any;
    let props = { authLoading: false, currentUserId: "user-a" as string | null };
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useCommunityData(
        {
          ...props,
          feedView: "new",
          query: "",
          supabase,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(dependencies.subscribeToCommentInserts).toHaveBeenCalledTimes(1);

    props = { authLoading: false, currentUserId: "user-b" };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(unsubscribeA).toHaveBeenCalledTimes(1);
    expect(dependencies.subscribeToCommentInserts).toHaveBeenCalledTimes(2);

    await act(async () => {
      listeners[0]({
        id: "comment-a",
        post_id: "post-shared",
        user_name: "Member",
        body: "Old session event",
        image_url: null,
        created_at: "2026-07-17T00:00:00.000Z",
        author_id: "user-a",
      });
    });
    expect(latest!.commentsState.byPost["post-shared"]).toEqual([]);

    await act(async () => {
      renderer!.unmount();
    });
    expect(unsubscribeB).toHaveBeenCalledTimes(1);
  });

  it("keeps the loaded Top order stable while engagement counters update", async () => {
    const leader = {
      ...post("leader", "user-b"),
      votes: 10,
      sortTime: 200,
    };
    const reading = {
      ...post("reading", "user-c"),
      votes: 9,
      sortTime: 100,
    };
    const dependencies: CommunityDataDependencies = {
      load: jest.fn<any>(() => Promise.resolve(result([leader, reading]))),
      subscribeToCommentInserts: jest.fn<any>(() => jest.fn()),
    };
    const supabase = {} as any;
    let latest: ReturnType<typeof useCommunityData> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useCommunityData(
        {
          authLoading: false,
          currentUserId: "user-a",
          feedView: "top",
          query: "",
          supabase,
          topTimeRange: "all-time",
        },
        dependencies,
      );
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest!.filteredPosts.map((item) => item.id)).toEqual([
      "leader",
      "reading",
    ]);

    await act(async () => {
      latest!.setPosts((posts) =>
        posts.map((item) =>
          item.id === "reading" ? { ...item, votes: 100 } : item,
        ),
      );
      latest!.dispatchComments({
        type: "addComment",
        postId: "reading",
        comment: {
          id: "new-comment",
          user: "You",
          text: "I am still reading this discussion.",
          createdAt: new Date().toISOString(),
          authorId: "user-a",
          fromDB: true,
        },
      });
    });

    expect(latest!.filteredPosts.map((item) => item.id)).toEqual([
      "leader",
      "reading",
    ]);
    expect(latest!.filteredPosts[1].votes).toBe(100);
    expect(latest!.commentsState.counts.reading).toBe(1);

    await act(async () => {
      latest!.setPosts((posts) => [
        { ...post("newly-active", "user-d"), votes: 1_000 },
        ...posts,
      ]);
    });
    expect(latest!.filteredPosts.map((item) => item.id)).toEqual([
      "leader",
      "reading",
      "newly-active",
    ]);

    await act(async () => {
      latest!.setPosts((posts) =>
        posts.filter((item) => item.id !== "leader"),
      );
    });
    expect(latest!.filteredPosts.map((item) => item.id)).toEqual([
      "reading",
      "newly-active",
    ]);
    renderer!.unmount();
  });
});
