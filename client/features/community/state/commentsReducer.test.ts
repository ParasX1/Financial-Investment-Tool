import { describe, expect, it } from "@jest/globals";
import { commentsReducer, createCommentsState } from "./commentsReducer";

describe("commentsReducer feed boundaries", () => {
  const post = {
    id: "post-1",
    user: "Member",
    initials: "ME",
    title: "Discussion",
    body: "Body",
    votes: 1,
    time: "now",
    sortTime: 1,
    tags: [],
    commentCount: 0,
    avatarGradient: "linear-gradient(#000, #111)",
    fromDB: true,
  };
  const comment = {
    id: "comment-1",
    user: "Member",
    text: "One comment",
    createdAt: "2026-07-17T00:00:00.000Z",
    fromDB: true,
  };

  it("initializes loaded posts and ignores duplicate loaded comments", () => {
    const state = createCommentsState(
      [post],
      [
        { postId: post.id, comment },
        { postId: post.id, comment },
      ],
    );

    expect(state.byPost[post.id]).toEqual([comment]);
    expect(state.counts[post.id]).toBe(1);
    expect(state.seenIds[comment.id]).toBe(true);
  });

  it("keeps ensure idempotent and resets the complete feed resource", () => {
    const initial = createCommentsState([post]);
    expect(
      commentsReducer(initial, {
        type: "ensurePost",
        postId: post.id,
        initialCount: 4,
      }),
    ).toBe(initial);

    const reset = commentsReducer(initial, {
      type: "reset",
      posts: [post],
      comments: [{ postId: post.id, comment }],
    });
    expect(reset.byPost[post.id]).toEqual([comment]);
    expect(reset.counts[post.id]).toBe(1);
  });

  it("ignores realtime comments for discussions outside the loaded feed", () => {
    const state = createCommentsState([]);

    const next = commentsReducer(state, {
      type: "addComment",
      postId: "missing-post",
      comment: {
        id: "comment-1",
        user: "Member",
        text: "Late event",
        createdAt: "2026-07-17T00:00:00.000Z",
        fromDB: true,
      },
    });

    expect(next).toBe(state);
    expect(next.byPost["missing-post"]).toBeUndefined();
    expect(next.counts["missing-post"]).toBeUndefined();
  });

  it("deduplicates the create response and its realtime echo", () => {
    const initial = commentsReducer(createCommentsState([], []), {
      type: "ensurePost",
      postId: "post-1",
    });
    const first = commentsReducer(initial, {
      type: "addComment",
      postId: "post-1",
      comment,
    });
    const echo = commentsReducer(first, {
      type: "addComment",
      postId: "post-1",
      comment,
    });

    expect(echo).toBe(first);
    expect(echo.counts["post-1"]).toBe(1);
    expect(echo.byPost["post-1"]).toHaveLength(1);
  });

  it("removes comments and posts without leaving stale counts or seen ids", () => {
    const populated = createCommentsState(
      [post],
      [{ postId: post.id, comment }],
    );
    const withoutComment = commentsReducer(populated, {
      type: "removeComment",
      postId: post.id,
      commentId: comment.id,
    });

    expect(withoutComment.byPost[post.id]).toEqual([]);
    expect(withoutComment.counts[post.id]).toBe(0);
    expect(withoutComment.seenIds[comment.id]).toBeUndefined();
    expect(
      commentsReducer(withoutComment, {
        type: "removeComment",
        postId: post.id,
        commentId: "missing",
      }),
    ).toBe(withoutComment);

    const withoutPost = commentsReducer(populated, {
      type: "removePost",
      postId: post.id,
    });
    expect(withoutPost.byPost[post.id]).toBeUndefined();
    expect(withoutPost.counts[post.id]).toBeUndefined();
    expect(withoutPost.seenIds[comment.id]).toBeUndefined();
  });
});
