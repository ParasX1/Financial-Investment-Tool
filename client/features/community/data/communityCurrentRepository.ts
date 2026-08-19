// Current-schema Supabase access only. Compatibility decisions live in the
// legacy adapter and are orchestrated by communityRepository.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentRow, DBPost } from "../types";
import {
  CREATE_POST_WITH_TICKERS_RPC,
  CURRENT_COMMENT_SELECT,
  CURRENT_POST_SELECT,
  type CommentDeleteContext,
  type CommunityCommentInsert,
  type CommunityPostDraft,
  type CommunityQueryResult,
  type CurrentCommentCreateResult,
  type CurrentPostCreateResult,
  type PostDeleteContext,
} from "./communityRepositoryContract";

export async function loadCurrentCommunityPostRows(db: SupabaseClient) {
  return (await db
    .from("posts")
    .select(CURRENT_POST_SELECT)
    .order("created_at", { ascending: false })) as CommunityQueryResult<
    DBPost[]
  >;
}

export async function loadCurrentCommunityCommentRows(
  db: SupabaseClient,
  postIds: string[],
) {
  return (await db
    .from("comments")
    .select(CURRENT_COMMENT_SELECT)
    .in("post_id", postIds)
    .order("created_at", { ascending: false })) as CommunityQueryResult<
    CommentRow[]
  >;
}

export async function selectCurrentPostDeleteContext(
  db: SupabaseClient,
  postId: string,
) {
  return (await db
    .from("posts")
    .select("author_id, image_path")
    .eq("id", postId)
    .single()) as CommunityQueryResult<PostDeleteContext>;
}

export async function selectCurrentCommentDeleteContext(
  db: SupabaseClient,
  commentId: string,
) {
  return (await db
    .from("comments")
    .select("author_id, post_id, image_path")
    .eq("id", commentId)
    .single()) as CommunityQueryResult<CommentDeleteContext>;
}

export async function loadCurrentCommentImagePathRowsForPost(
  db: SupabaseClient,
  postId: string,
) {
  return (await db
    .from("comments")
    .select("image_path")
    .eq("post_id", postId)) as CommunityQueryResult<
    Array<{ image_path?: string | null }>
  >;
}

export async function createCurrentCommunityPostWithTickers(
  db: SupabaseClient,
  postDraft: CommunityPostDraft,
  tickers: string[],
): Promise<CurrentPostCreateResult | null> {
  if (typeof db.rpc !== "function") return null;

  return (await db.rpc(CREATE_POST_WITH_TICKERS_RPC, {
    p_title: postDraft.title,
    p_body: postDraft.body,
    p_tags: postDraft.tags,
    p_post_type: postDraft.postType,
    p_time_frame: postDraft.timeFrame,
    p_tickers: tickers,
    p_source_url: postDraft.sourceUrl,
    p_image_url: postDraft.imageUrl,
    p_image_path: postDraft.imagePath,
  })) as CurrentPostCreateResult;
}

export async function insertCurrentCommunityCommentRow(
  db: SupabaseClient,
  input: CommunityCommentInsert,
): Promise<CurrentCommentCreateResult> {
  return (await db
    .from("comments")
    .insert({
      post_id: input.postId,
      body: input.text,
      image_url: input.imageUrl ?? null,
      image_path: input.imagePath ?? null,
      author_id: input.uid,
    })
    .select(CURRENT_COMMENT_SELECT)
    .single()) as CurrentCommentCreateResult;
}

export async function selectLikedPostRows(
  db: SupabaseClient,
  postIds: string[],
  currentUserId: string,
) {
  return (await db
    .from("post_likes")
    .select("post_id")
    .eq("user_id", currentUserId)
    .in("post_id", postIds)) as CommunityQueryResult<
    Array<{ post_id: string }>
  >;
}

export async function selectSavedPostRows(
  db: SupabaseClient,
  postIds: string[],
  currentUserId: string,
) {
  return (await db
    .from("post_saves")
    .select("post_id")
    .eq("user_id", currentUserId)
    .in("post_id", postIds)) as CommunityQueryResult<
    Array<{ post_id: string }>
  >;
}

export async function deleteCommunityPostRow(
  db: SupabaseClient,
  postId: string,
  currentUserId: string,
) {
  return (await db
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", currentUserId)
    .select("id")) as CommunityQueryResult<Array<{ id: string }>>;
}

export async function deleteCommunityCommentRow(
  db: SupabaseClient,
  commentId: string,
  currentUserId: string,
) {
  return (await db
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", currentUserId)
    .select("id")) as CommunityQueryResult<Array<{ id: string }>>;
}

export async function setCommunityPostLikeValue(
  db: SupabaseClient,
  postId: string,
  liked: boolean,
) {
  const { data, error } = await db.rpc(
    liked ? "like_community_post" : "unlike_community_post",
    { target_post_id: postId },
  );

  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function setCommunityPostSavedValue(
  db: SupabaseClient,
  postId: string,
  currentUserId: string,
  saved: boolean,
) {
  const query = saved
    ? db.from("post_saves").insert({ post_id: postId })
    : db
        .from("post_saves")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId);
  const { error } = await query;
  if (error) throw error;
}

export async function insertCommunityPostReportRow(
  db: SupabaseClient,
  input: { postId: string; reason: string; details: string | null },
) {
  const { error } = await db.from("post_reports").insert({
    post_id: input.postId,
    reason: input.reason,
    details: input.details,
  });
  if (error) throw error;
}
