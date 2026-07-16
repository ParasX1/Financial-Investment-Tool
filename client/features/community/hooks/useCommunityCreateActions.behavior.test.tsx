import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type {
  DiscussionDraft,
  FeedbackMessage,
  PostUI,
} from "../types";
import {
  useCommunityCreateActions,
  type CommunityCreateActionDependencies,
} from "./useCommunityCreateActions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function createDraft(overrides: Partial<DiscussionDraft> = {}): DiscussionDraft {
  return {
    title: "A careful beginner question",
    body: "What evidence should I compare?",
    tags: ["Education"],
    imageFile: null,
    imagePreviewUrl: null,
    ...overrides,
  };
}

function createPost(overrides: Partial<PostUI> = {}): PostUI {
  return {
    id: "post-1",
    user: "You",
    initials: "YU",
    title: "A careful beginner question",
    body: "What evidence should I compare?",
    votes: 0,
    time: "just now",
    sortTime: Date.now(),
    tags: ["Education"],
    commentCount: 0,
    avatarGradient: "linear-gradient(#000, #111)",
    authorId: "user-a",
    fromDB: true,
    ...overrides,
  };
}

function createDependencies(): CommunityCreateActionDependencies {
  return {
    createLocalPost: jest.fn<any>(),
    createPost: jest.fn<any>(),
    invalidateRemoteData: jest.fn<any>(),
    rememberLocalPost: jest.fn<any>(),
    removeImage: jest.fn<any>().mockResolvedValue(undefined),
    uploadPostImage: jest.fn<any>(),
  };
}

async function renderHarness({
  currentUserId = "user-a",
  dependencies,
  draft: initialDraft = createDraft(),
  sessionKey = "user:user-a",
  supabase = {},
}: {
  currentUserId?: string | null;
  dependencies: CommunityCreateActionDependencies;
  draft?: DiscussionDraft;
  sessionKey?: string;
  supabase?: any;
}) {
  const feedback: Array<Omit<FeedbackMessage, "id">> = [];
  const resetDraft = jest.fn();
  let draft = initialDraft;
  let userId = currentUserId;
  let ownerKey = sessionKey;
  let latest: ReturnType<typeof useCommunityCreateActions> | null = null;
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = useCommunityCreateActions(
      {
        currentUserId: userId,
        draft,
        pushFeedback: (message) => feedback.push(message),
        resetDraft,
        sessionKey: ownerKey,
        supabase,
      },
      dependencies,
    );
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
    resetDraft,
    async updateDraft(nextDraft: DiscussionDraft) {
      draft = nextDraft;
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
    async updateSession(nextSessionKey: string, nextUserId: string | null) {
      ownerKey = nextSessionKey;
      userId = nextUserId;
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
  };
}

describe("useCommunityCreateActions behavior", () => {
  it("cleans a late upload without creating as a different account", async () => {
    const upload = deferred<{ path: string; publicUrl: string }>();
    const dependencies = createDependencies();
    (dependencies.uploadPostImage as jest.Mock<any>).mockReturnValue(upload.promise);
    const supabase = {} as any;
    const harness = await renderHarness({
      dependencies,
      draft: createDraft({
        imageFile: new File(["chart"], "chart.png", { type: "image/png" }),
      }),
      supabase,
    });
    let pending!: Promise<boolean>;

    act(() => {
      pending = harness.latest.handleCreatePost();
    });
    await harness.updateSession("user:user-b", "user-b");
    await harness.updateDraft(createDraft({ title: "B account draft" }));
    harness.resetDraft.mockClear();

    let result = true;
    await act(async () => {
      upload.resolve({
        path: "posts/user-a/late.png",
        publicUrl: "https://images.example/late.png",
      });
      result = await pending;
    });

    expect(result).toBe(false);
    expect(dependencies.removeImage).toHaveBeenCalledWith(
      supabase,
      "posts/user-a/late.png",
    );
    expect(dependencies.createPost).not.toHaveBeenCalled();
    expect(harness.resetDraft).not.toHaveBeenCalled();
    expect(harness.feedback).toEqual([]);
    harness.renderer.unmount();
  });

  it("deduplicates synchronous double submission", async () => {
    const create = deferred<PostUI>();
    const dependencies = createDependencies();
    (dependencies.createPost as jest.Mock<any>).mockReturnValue(create.promise);
    const harness = await renderHarness({ dependencies });
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;

    act(() => {
      first = harness.latest.handleCreatePost();
      second = harness.latest.handleCreatePost();
    });

    await expect(second).resolves.toBe(false);
    expect(dependencies.createPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      create.resolve(createPost());
      await first;
    });
    expect(harness.resetDraft).toHaveBeenCalledTimes(1);
    harness.renderer.unmount();
  });

  it("ignores a persisted result that completes for the previous account", async () => {
    const create = deferred<PostUI>();
    const dependencies = createDependencies();
    (dependencies.createPost as jest.Mock<any>).mockReturnValue(create.promise);
    const harness = await renderHarness({ dependencies });
    let pending!: Promise<boolean>;

    act(() => {
      pending = harness.latest.handleCreatePost();
    });
    await harness.updateSession("user:user-b", "user-b");
    await harness.updateDraft(createDraft({ title: "B account draft" }));
    harness.resetDraft.mockClear();

    let result = true;
    await act(async () => {
      create.resolve(createPost({ authorId: "user-a" }));
      result = await pending;
    });

    expect(result).toBe(false);
    expect(dependencies.invalidateRemoteData).toHaveBeenCalledWith("user-a");
    expect(dependencies.rememberLocalPost).not.toHaveBeenCalled();
    expect(harness.resetDraft).not.toHaveBeenCalled();
    expect(harness.feedback).toEqual([]);
    harness.renderer.unmount();
  });

  it("does not complete or reset after the Create route unmounts", async () => {
    const create = deferred<PostUI>();
    const dependencies = createDependencies();
    (dependencies.createPost as jest.Mock<any>).mockReturnValue(create.promise);
    const harness = await renderHarness({ dependencies });
    let pending!: Promise<boolean>;

    act(() => {
      pending = harness.latest.handleCreatePost();
    });
    act(() => {
      harness.renderer.unmount();
    });

    let result = true;
    await act(async () => {
      create.resolve(createPost());
      result = await pending;
    });

    expect(result).toBe(false);
    expect(dependencies.invalidateRemoteData).toHaveBeenCalledWith("user-a");
    expect(harness.resetDraft).not.toHaveBeenCalled();
  });

  it("cleans a late upload after the Create route unmounts", async () => {
    const upload = deferred<{ path: string; publicUrl: string }>();
    const dependencies = createDependencies();
    (dependencies.uploadPostImage as jest.Mock<any>).mockReturnValue(upload.promise);
    const supabase = {} as any;
    const harness = await renderHarness({
      dependencies,
      draft: createDraft({
        imageFile: new File(["chart"], "chart.png", { type: "image/png" }),
      }),
      supabase,
    });
    let pending!: Promise<boolean>;

    act(() => {
      pending = harness.latest.handleCreatePost();
    });
    act(() => {
      harness.renderer.unmount();
    });

    let result = true;
    await act(async () => {
      upload.resolve({
        path: "posts/user-a/unmounted.png",
        publicUrl: "https://images.example/unmounted.png",
      });
      result = await pending;
    });

    expect(result).toBe(false);
    expect(dependencies.removeImage).toHaveBeenCalledWith(
      supabase,
      "posts/user-a/unmounted.png",
    );
    expect(dependencies.createPost).not.toHaveBeenCalled();
    expect(harness.resetDraft).not.toHaveBeenCalled();
  });

  it("binds a successful remote write to the starting account and invalidates its feed", async () => {
    const dependencies = createDependencies();
    const post = createPost();
    (dependencies.createPost as jest.Mock<any>).mockResolvedValue(post);
    const supabase = {} as any;
    const harness = await renderHarness({ dependencies, supabase });

    let result = false;
    await act(async () => {
      result = await harness.latest.handleCreatePost();
    });

    expect(result).toBe(true);
    expect(dependencies.createPost).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        title: "A careful beginner question",
        body: "What evidence should I compare?",
      }),
      "user-a",
    );
    expect(dependencies.invalidateRemoteData).toHaveBeenCalledWith("user-a");
    expect(harness.resetDraft).toHaveBeenCalledTimes(1);
    harness.renderer.unmount();
  });

  it("keeps a configured remote signed out flow read-only", async () => {
    const dependencies = createDependencies();
    const harness = await renderHarness({
      dependencies,
      currentUserId: null,
      sessionKey: "signed-out",
    });

    let result = true;
    await act(async () => {
      result = await harness.latest.handleCreatePost();
    });

    expect(result).toBe(false);
    expect(dependencies.createPost).not.toHaveBeenCalled();
    expect(dependencies.createLocalPost).not.toHaveBeenCalled();
    expect(harness.resetDraft).not.toHaveBeenCalled();
    expect(harness.feedback).toEqual([
      {
        tone: "info",
        title: "Sign in to post",
        message: "Discussions are saved to your account.",
      },
    ]);
    harness.renderer.unmount();
  });

  it("preserves the original failure when image cleanup also fails", async () => {
    const dependencies = createDependencies();
    (dependencies.uploadPostImage as jest.Mock<any>).mockResolvedValue({
      path: "posts/user-a/orphan.png",
      publicUrl: "https://images.example/orphan.png",
    });
    (dependencies.createPost as jest.Mock<any>).mockRejectedValue(
      new Error("raw database details"),
    );
    (dependencies.removeImage as jest.Mock<any>).mockRejectedValue(
      new Error("cleanup failed"),
    );
    const harness = await renderHarness({
      dependencies,
      draft: createDraft({
        imageFile: new File(["chart"], "chart.png", { type: "image/png" }),
      }),
    });

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let result = true;
    await act(async () => {
      result = await harness.latest.handleCreatePost();
    });

    expect(result).toBe(false);
    expect(harness.resetDraft).not.toHaveBeenCalled();
    expect(harness.feedback).toEqual([
      {
        tone: "error",
        title: "Post failed",
        message: "Could not create post.",
      },
    ]);
    expect(harness.latest.creating).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    harness.renderer.unmount();
  });

  it("remembers a local post across the Create to Feed route transition", async () => {
    const dependencies = createDependencies();
    const localPost = createPost({
      id: "local-1",
      authorId: undefined,
      fromDB: undefined,
    });
    (dependencies.createLocalPost as jest.Mock<any>).mockReturnValue(localPost);
    const harness = await renderHarness({
      dependencies,
      currentUserId: null,
      sessionKey: "demo",
      supabase: null,
    });

    let result = false;
    await act(async () => {
      result = await harness.latest.handleCreatePost();
    });

    expect(result).toBe(true);
    expect(dependencies.rememberLocalPost).toHaveBeenCalledWith(localPost);
    expect(dependencies.createPost).not.toHaveBeenCalled();
    expect(harness.resetDraft).toHaveBeenCalledTimes(1);
    harness.renderer.unmount();
  });
});
