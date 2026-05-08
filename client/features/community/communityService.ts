import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COMMENT_BUCKET, DEMO_POSTS } from "./constants";
import type { CommentEntry, CommentRow, DBPost, PostUI } from "./types";
import {
  commentFromRow,
  getUploadErrorMessage,
  postFromRow,
  validateCommentImage,
} from "./utils";

const COMMENT_SELECT =
  "id, post_id, user_name, body, image_url, created_at, author_id";

function isMissingAuthorIdColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const details = error as { code?: string; message?: string };
  return (
    details.code === "42703" &&
    Boolean(details.message?.toLowerCase().includes("author_id"))
  );
}

async function getSessionUserId(db: SupabaseClient) {
  const { data } = await db.auth.getSession();
  return data.session?.user.id ?? null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (process.env as any).NEXT_PUBLIC_ANON ||
    "";

  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: true } });
}

export async function loadCommunityData(
  db: SupabaseClient,
  currentUserId?: string | null
): Promise<{
  posts: PostUI[];
  comments: CommentEntry[];
  likedPostIds: string[];
  commentsError?: string;
  likesError?: string;
}> {
  const activeUserId =
    currentUserId === undefined ? await getSessionUserId(db) : currentUserId;

  const { data: rows, error } = await db
    .from("posts")
    .select("id, title, votes, created_at, author_id")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const dbPosts: PostUI[] = rows
    ? rows.map((row: DBPost) => postFromRow(row, activeUserId))
    : [];
  const posts: PostUI[] = dbPosts.length ? [...dbPosts, ...DEMO_POSTS] : [];

  if (!dbPosts.length) {
    return { posts, comments: [], likedPostIds: [] };
  }

  const postIds = dbPosts.map((post) => post.id);
  const commentsQuery = await db
    .from("comments")
    .select(COMMENT_SELECT)
    .in("post_id", postIds)
    .order("created_at", { ascending: false });

  const { data: allComments, error: commentsError } = commentsQuery;
  const likedPostIds = await loadLikedPostIds(db, postIds, activeUserId);

  if (commentsError) {
    console.error("load comments failed:", commentsError.message);
    return {
      posts,
      comments: [],
      likedPostIds: likedPostIds.ids,
      commentsError: "Posts loaded, but comments could not be loaded.",
      likesError: likedPostIds.error,
    };
  }

  return {
    posts,
    comments: (allComments ?? []).map((row: CommentRow) => ({
      postId: row.post_id,
      comment: commentFromRow(row, activeUserId),
    })),
    likedPostIds: likedPostIds.ids,
    likesError: likedPostIds.error,
  };
}

async function loadLikedPostIds(
  db: SupabaseClient,
  postIds: string[],
  currentUserId: string | null
) {
  if (!currentUserId || !postIds.length) {
    return { ids: [] as string[] };
  }

  const { data, error } = await db
    .from("post_likes")
    .select("post_id")
    .eq("user_id", currentUserId)
    .in("post_id", postIds);

  if (error) {
    console.error("load likes failed:", error.message);
    return {
      ids: [] as string[],
      error: "Posts loaded, but saved like state could not be loaded.",
    };
  }

  return { ids: (data ?? []).map((row) => row.post_id as string) };
}

export async function createCommunityPost(
  db: SupabaseClient,
  text: string
): Promise<PostUI> {
  const uid = await getSessionUserId(db);

  const { data: row, error } = await db
    .from("posts")
    .insert({
      title: text,
      votes: 0,
      author_id: uid,
    })
    .select("id, title, votes, created_at, author_id")
    .single();

  if (error) throw error;

  return postFromRow(row as DBPost, uid);
}

export async function deleteCommunityPost(
  db: SupabaseClient,
  postId: string,
  currentUserId: string
) {
  const { data: ownerRow, error: ownerError } = await db
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (ownerError) throw ownerError;

  if (!ownerRow || ownerRow.author_id !== currentUserId) {
    throw new Error("You can only delete discussions you created.");
  }

  const { error: commentsDeleteError } = await db
    .from("comments")
    .delete()
    .eq("post_id", postId);

  if (commentsDeleteError) throw commentsDeleteError;

  const { data, error } = await db
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", currentUserId)
    .select("id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("You can only delete discussions you created.");
  }
}

export async function createCommunityComment({
  db,
  postId,
  text,
  imageUrl,
}: {
  db: SupabaseClient;
  postId: string;
  text: string;
  imageUrl?: string;
}) {
  const uid = await getSessionUserId(db);
  const values = {
    post_id: postId,
    user_name: uid ? "You" : "Guest",
    body: text,
    image_url: imageUrl ?? null,
    author_id: uid,
  };

  const { data: row, error } = await db
    .from("comments")
    .insert(values)
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;

  return commentFromRow(row as CommentRow, uid);
}

export async function deleteCommunityComment(
  db: SupabaseClient,
  commentId: string,
  currentUserId: string
) {
  const { data, error } = await db
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", currentUserId)
    .select("id");

  if (isMissingAuthorIdColumn(error)) {
    throw new Error("Comment ownership is not available for older comments.");
  }

  if (error) throw error;
  if (!data?.length) {
    throw new Error("You can only delete comments you created.");
  }
}

export async function setCommunityPostLike(
  db: SupabaseClient,
  postId: string,
  liked: boolean
) {
  const { data, error } = await db.rpc(
    liked ? "like_community_post" : "unlike_community_post",
    { target_post_id: postId }
  );

  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function uploadCommentImage(
  db: SupabaseClient,
  postId: string,
  file: File
): Promise<string> {
  const validationError = validateCommentImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "jpg";
  const key = `${postId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage.from(COMMENT_BUCKET).upload(key, file);

  if (error) {
    console.error("upload failed:", error.message);
    throw new Error(getUploadErrorMessage(error));
  }

  return db.storage.from(COMMENT_BUCKET).getPublicUrl(key).data.publicUrl;
}
