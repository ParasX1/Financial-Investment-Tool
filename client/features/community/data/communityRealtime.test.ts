import { describe, expect, it, jest } from "@jest/globals";
import type { CommentRow } from "../types";
import { subscribeToCommunityCommentInserts } from "./communityRealtime";

describe("Community realtime adapter", () => {
  it("owns the Supabase subscription details and removes its channel", () => {
    const row = {
      id: "comment-1",
      post_id: "post-1",
      user_name: "Member",
      body: "A comment",
      image_url: null,
      created_at: "2026-07-17T00:00:00.000Z",
      author_id: "user-a",
    } satisfies CommentRow;
    let receiveInsert!: (payload: { new: CommentRow }) => void;
    const channel: any = {
      on: jest.fn(
        (
          _event: string,
          _filter: unknown,
          listener: (payload: { new: CommentRow }) => void,
        ) => {
          receiveInsert = listener;
          return channel;
        },
      ),
      subscribe: jest.fn(() => channel),
    };
    const db: any = {
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    };
    const listener = jest.fn();

    const unsubscribe = subscribeToCommunityCommentInserts(db, listener);
    receiveInsert({ new: row });
    unsubscribe();

    expect(db.channel).toHaveBeenCalledWith("community-comment-inserts");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments" },
      expect.any(Function),
    );
    expect(listener).toHaveBeenCalledWith(row);
    expect(db.removeChannel).toHaveBeenCalledWith(channel);
  });
});
