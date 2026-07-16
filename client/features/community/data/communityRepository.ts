// File purpose: Encapsulates Community Supabase table queries, schema fallback reads, inserts, deletes, and like RPC calls.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentRow, DBPost, DiscussionPostInput } from "../types";

const COMMENT_SELECT =
  "id, post_id, user_name, body, image_url, image_path, created_at, author_id";
const COMMENT_SELECT_WITHOUT_IMAGE_PATH =
  "id, post_id, user_name, body, image_url, created_at, author_id";
const POST_SELECT =
  "id, title, body, tags, image_url, image_path, votes, created_at, author_id";
const POST_SELECT_WITHOUT_IMAGE_PATH =
  "id, title, body, tags, image_url, votes, created_at, author_id";
const POST_SELECT_WITHOUT_IMAGE =
  "id, title, body, tags, votes, created_at, author_id";
const POST_SELECT_WITHOUT_TAGS =
  "id, title, body, votes, created_at, author_id";
const LEGACY_POST_SELECT = "id, title, votes, created_at, author_id";

type CommunityQueryResult<T> = {
  data: T | null;
  error: unknown;
};

type CommunityInsertAttempt = {
  values: Record<string, unknown>;
  select: string;
};

export type PostDeleteContext = {
  author_id: string | null;
  image_path: string | null;
};

export type CommentDeleteContext = {
  author_id?: string | null;
  post_id?: string | null;
  image_path: string | null;
};

export function isMissingAuthorIdColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const details = error as { code?: string; message?: string };
  return (
    details.code === "42703" &&
    Boolean(details.message?.toLowerCase().includes("author_id"))
  );
}

function isMissingColumn(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") return false;

  const details = error as { code?: string; message?: string };
  const message = details.message?.toLowerCase() ?? "";
  const column = columnName.toLowerCase();

  return (
    Boolean(message.includes(column)) &&
    (details.code === "42703" ||
      details.code === "PGRST204" ||
      message.includes("column") ||
      message.includes("schema cache"))
  );
}

function isMissingExpectedPostColumn(error: unknown) {
  return (
    isMissingColumn(error, "image_path") ||
    isMissingColumn(error, "image_url") ||
    isMissingColumn(error, "tags") ||
    isMissingColumn(error, "body")
  );
}

function isMissingExpectedCommentColumn(error: unknown) {
  return isMissingColumn(error, "image_path");
}

export async function loadCommunityPostRows(db: SupabaseClient) {
  const selects = [
    POST_SELECT,
    POST_SELECT_WITHOUT_IMAGE_PATH,
    POST_SELECT_WITHOUT_IMAGE,
    POST_SELECT_WITHOUT_TAGS,
    LEGACY_POST_SELECT,
  ];
  let latestResult: CommunityQueryResult<DBPost[]> | null = null;

  for (const columns of selects) {
    latestResult = (await db
      .from("posts")
      .select(columns)
      .order("created_at", { ascending: false })) as CommunityQueryResult<
      DBPost[]
    >;

    if (!isMissingExpectedPostColumn(latestResult.error)) return latestResult;
  }

  return latestResult!;
}

export async function loadCommunityCommentRows(
  db: SupabaseClient,
  postIds: string[],
) {
  const selects = [COMMENT_SELECT, COMMENT_SELECT_WITHOUT_IMAGE_PATH];
  let latestResult: CommunityQueryResult<CommentRow[]> | null = null;

  for (const columns of selects) {
    latestResult = (await db
      .from("comments")
      .select(columns)
      .in("post_id", postIds)
      .order("created_at", { ascending: false })) as CommunityQueryResult<
      CommentRow[]
    >;

    if (!isMissingExpectedCommentColumn(latestResult.error)) {
      return latestResult;
    }
  }

  return latestResult!;
}

export async function selectPostDeleteContext(
  db: SupabaseClient,
  postId: string,
) {
  const result = (await db
    .from("posts")
    .select("author_id, image_path")
    .eq("id", postId)
    .single()) as CommunityQueryResult<PostDeleteContext>;

  if (!isMissingColumn(result.error, "image_path")) return result;

  const fallback = (await db
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single()) as CommunityQueryResult<Omit<PostDeleteContext, "image_path">>;

  return {
    data: fallback.data ? { ...fallback.data, image_path: null } : null,
    error: fallback.error,
  };
}

export async function selectCommentDeleteContext(
  db: SupabaseClient,
  commentId: string,
) {
  const result = (await db
    .from("comments")
    .select("author_id, post_id, image_path")
    .eq("id", commentId)
    .single()) as CommunityQueryResult<CommentDeleteContext>;

  if (!isMissingColumn(result.error, "image_path")) return result;

  const fallback = (await db
    .from("comments")
    .select("author_id, post_id")
    .eq("id", commentId)
    .single()) as CommunityQueryResult<
    Omit<CommentDeleteContext, "image_path">
  >;

  return {
    data: fallback.data ? { ...fallback.data, image_path: null } : null,
    error: fallback.error,
  };
}

export async function loadCommentImagePathRowsForPost(
  db: SupabaseClient,
  postId: string,
) {
  const result = (await db
    .from("comments")
    .select("image_path")
    .eq("post_id", postId)) as CommunityQueryResult<
    Array<{ image_path?: string | null }>
  >;

  if (isMissingColumn(result.error, "image_path")) return [];
  if (result.error) throw result.error;

  return result.data ?? [];
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

export async function insertCommunityPostRow(
  db: SupabaseClient,
  postDraft: DiscussionPostInput & {
    imageUrl: string | null;
    imagePath: string | null;
  },
  uid: string,
) {
  const hasImage = Boolean(postDraft.imageUrl || postDraft.imagePath);
  const fullSchemaAttempt: CommunityInsertAttempt = {
    values: {
      title: postDraft.title,
      body: postDraft.body,
      tags: postDraft.tags,
      image_url: postDraft.imageUrl,
      image_path: postDraft.imagePath,
      author_id: uid,
    },
    select: POST_SELECT,
  };
  const legacyAttempts: CommunityInsertAttempt[] = [
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        tags: postDraft.tags,
        image_url: postDraft.imageUrl,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_IMAGE_PATH,
    },
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        tags: postDraft.tags,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_IMAGE,
    },
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_TAGS,
    },
    {
      values: {
        title: `${postDraft.title}\n\n${postDraft.body}`,
        author_id: uid,
      },
      select: LEGACY_POST_SELECT,
    },
  ];
  const attempts = hasImage
    ? [fullSchemaAttempt]
    : [fullSchemaAttempt, ...legacyAttempts];

  for (const attempt of attempts) {
    const { data: row, error } = (await db
      .from("posts")
      .insert(attempt.values)
      .select(attempt.select)
      .single()) as CommunityQueryResult<DBPost>;

    if (isMissingExpectedPostColumn(error)) continue;
    if (error) throw error;
    if (row) return row;
  }

  throw new Error("Could not create post with the current Community schema.");
}

export async function insertCommunityCommentRow({
  db,
  postId,
  text,
  imageUrl,
  imagePath,
  uid,
}: {
  db: SupabaseClient;
  postId: string;
  text: string;
  imageUrl?: string;
  imagePath?: string;
  uid: string;
}) {
  const hasImage = Boolean(imageUrl || imagePath);
  const fullSchemaAttempt: CommunityInsertAttempt = {
    values: {
      post_id: postId,
      body: text,
      image_url: imageUrl ?? null,
      image_path: imagePath ?? null,
      author_id: uid,
    },
    select: COMMENT_SELECT,
  };
  const legacyAttempt: CommunityInsertAttempt = {
    values: {
      post_id: postId,
      body: text,
      image_url: imageUrl ?? null,
      author_id: uid,
    },
    select: COMMENT_SELECT_WITHOUT_IMAGE_PATH,
  };

  const attempts = hasImage
    ? [fullSchemaAttempt]
    : [fullSchemaAttempt, legacyAttempt];

  for (const attempt of attempts) {
    const { data: row, error } = (await db
      .from("comments")
      .insert(attempt.values)
      .select(attempt.select)
      .single()) as CommunityQueryResult<CommentRow>;

    if (isMissingExpectedCommentColumn(error)) continue;
    if (error) throw error;
    if (row) return row;
  }

  throw new Error(
    "Could not create comment with the current Community schema.",
  );
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
