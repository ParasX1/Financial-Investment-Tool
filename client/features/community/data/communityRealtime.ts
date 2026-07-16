// File purpose: Encapsulates the Supabase Realtime channel used by the Community feed.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentRow } from "../types";

export function subscribeToCommunityCommentInserts(
  db: SupabaseClient,
  onInsert: (row: CommentRow) => void,
) {
  const channel = db.channel("community-comment-inserts");

  channel
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments" },
      (payload) => onInsert(payload.new as CommentRow),
    )
    .subscribe();

  return () => {
    void db.removeChannel(channel);
  };
}
