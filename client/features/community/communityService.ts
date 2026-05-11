import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_POSTS } from "./constants";
import { removeCommunityImages, uniqueImagePaths } from "./communityStorage";
import type {
  CommentEntry,
  CommentRow,
  DBPost,
  DiscussionPostInput,
  PostUI,
} from "./types";
import {
  commentFromRow,
  normalizeDiscussionDraft,
  postFromRow,
} from "./utils";

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

function requireSessionUserId(uid: string | null, action: string) {
  if (!uid) throw new Error(`Sign in to ${action}.`);
  return uid;
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
  currentUserId?: string | null,
): Promise<{
  posts: PostUI[];
  comments: CommentEntry[];
  likedPostIds: string[];
  commentsError?: string;
  likesError?: string;
}> {
  const activeUserId =
    currentUserId === undefined ? await getSessionUserId(db) : currentUserId;

  const { data: rows, error } = await loadCommunityPostRows(db);

  if (error) throw error;

  const dbPosts: PostUI[] = rows
    ? rows.map((row: DBPost) => postFromRow(row, activeUserId))
    : [];
  const posts: PostUI[] = dbPosts.length ? dbPosts : DEMO_POSTS;

  if (!dbPosts.length) {
    return { posts, comments: [], likedPostIds: [] };
  }

  const postIds = dbPosts.map((post) => post.id);
  const commentsQuery = await loadCommunityCommentRows(db, postIds);

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

async function loadCommunityPostRows(db: SupabaseClient) {
  const selects = [
    POST_SELECT,
    POST_SELECT_WITHOUT_IMAGE_PATH,
    POST_SELECT_WITHOUT_IMAGE,
    POST_SELECT_WITHOUT_TAGS,
    LEGACY_POST_SELECT,
  ];
  let latestResult: any;

  for (const columns of selects) {
    latestResult = await db
      .from("posts")
      .select(columns)
      .order("created_at", { ascending: false });

    if (!isMissingExpectedPostColumn(latestResult.error)) return latestResult;
  }

  return latestResult!;
}

async function loadCommunityCommentRows(db: SupabaseClient, postIds: string[]) {
  const selects = [COMMENT_SELECT, COMMENT_SELECT_WITHOUT_IMAGE_PATH];
  let latestResult: any;

  for (const columns of selects) {
    latestResult = await db
      .from("comments")
      .select(columns)
      .in("post_id", postIds)
      .order("created_at", { ascending: false });

    if (!isMissingExpectedCommentColumn(latestResult.error)) {
      return latestResult;
    }
  }

  return latestResult!;
}

async function selectPostDeleteContext(db: SupabaseClient, postId: string) {
  const result = await db
    .from("posts")
    .select("author_id, image_path")
    .eq("id", postId)
    .single();

  if (!isMissingColumn(result.error, "image_path")) return result;

  const fallback = await db
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  return {
    data: fallback.data
      ? { ...(fallback.data as Record<string, unknown>), image_path: null }
      : fallback.data,
    error: fallback.error,
  };
}

async function selectCommentDeleteContext(
  db: SupabaseClient,
  commentId: string,
) {
  const result = await db
    .from("comments")
    .select("author_id, post_id, image_path")
    .eq("id", commentId)
    .single();

  if (!isMissingColumn(result.error, "image_path")) return result;

  const fallback = await db
    .from("comments")
    .select("author_id, post_id")
    .eq("id", commentId)
    .single();

  return {
    data: fallback.data
      ? { ...(fallback.data as Record<string, unknown>), image_path: null }
      : fallback.data,
    error: fallback.error,
  };
}

async function loadCommentImagePathsForPost(
  db: SupabaseClient,
  postId: string,
) {
  const result = await db
    .from("comments")
    .select("image_path")
    .eq("post_id", postId);

  if (isMissingColumn(result.error, "image_path")) return [];
  if (result.error) throw result.error;

  return uniqueImagePaths(
    (result.data ?? []).map((row: any) => row.image_path as string | null),
  );
}

async function canDeleteCommentFromContext(
  ownerRow: Record<string, unknown>,
  currentUserId: string,
) {
  return ownerRow.author_id === currentUserId;
}

async function loadLikedPostIds(
  db: SupabaseClient,
  postIds: string[],
  currentUserId: string | null,
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
  draft: DiscussionPostInput,
): Promise<PostUI> {
  const uid = requireSessionUserId(
    await getSessionUserId(db),
    "create a discussion",
  );
  const postDraft = {
    ...normalizeDiscussionDraft(draft),
    imageUrl: draft.imageUrl ?? null,
    imagePath: draft.imagePath ?? null,
  };

  const hasImage = Boolean(postDraft.imageUrl || postDraft.imagePath);
  const fullSchemaAttempt = {
    values: {
      title: postDraft.title,
      body: postDraft.body,
      tags: postDraft.tags,
      image_url: postDraft.imageUrl,
      image_path: postDraft.imagePath,
      votes: 0,
      author_id: uid,
    },
    select: POST_SELECT,
  };
  const legacyAttempts = [
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        tags: postDraft.tags,
        image_url: postDraft.imageUrl,
        votes: 0,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_IMAGE_PATH,
    },
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        tags: postDraft.tags,
        votes: 0,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_IMAGE,
    },
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        votes: 0,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_TAGS,
    },
    {
      values: {
        title: `${postDraft.title}\n\n${postDraft.body}`,
        votes: 0,
        author_id: uid,
      },
      select: LEGACY_POST_SELECT,
    },
  ];
  const attempts = hasImage
    ? [fullSchemaAttempt]
    : [fullSchemaAttempt, ...legacyAttempts];

  for (const attempt of attempts) {
    const { data: row, error } = await db
      .from("posts")
      .insert(attempt.values)
      .select(attempt.select)
      .single();

    if (isMissingExpectedPostColumn(error)) continue;
    if (error) throw error;

    return postFromRow(row as unknown as DBPost, uid);
  }

  throw new Error("Could not create post with the current Community schema.");
}

export async function deleteCommunityPost(
  db: SupabaseClient,
  postId: string,
  currentUserId: string,
) {
  const { data: ownerRow, error: ownerError } = await selectPostDeleteContext(
    db,
    postId,
  );

  if (ownerError) throw ownerError;

  if (!ownerRow || (ownerRow as any).author_id !== currentUserId) {
    throw new Error("You can only delete discussions you created.");
  }

  const imagePaths = uniqueImagePaths([
    (ownerRow as any).image_path,
    ...(await loadCommentImagePathsForPost(db, postId)),
  ]);

  await removeCommunityImages(db, imagePaths);

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
  imagePath,
}: {
  db: SupabaseClient;
  postId: string;
  text: string;
  imageUrl?: string;
  imagePath?: string;
}) {
  const uid = requireSessionUserId(await getSessionUserId(db), "comment");
  const hasImage = Boolean(imageUrl || imagePath);
  const fullSchemaAttempt = {
    values: {
      post_id: postId,
      user_name: uid ? "You" : "Guest",
      body: text,
      image_url: imageUrl ?? null,
      image_path: imagePath ?? null,
      author_id: uid,
    },
    select: COMMENT_SELECT,
  };
  const legacyAttempt = {
    values: {
      post_id: postId,
      user_name: uid ? "You" : "Guest",
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
    const { data: row, error } = await db
      .from("comments")
      .insert(attempt.values)
      .select(attempt.select)
      .single();

    if (isMissingExpectedCommentColumn(error)) continue;
    if (error) throw error;

    return commentFromRow(row as unknown as CommentRow, uid);
  }

  throw new Error(
    "Could not create comment with the current Community schema.",
  );
}

export async function deleteCommunityComment(
  db: SupabaseClient,
  commentId: string,
  currentUserId: string,
) {
  const { data: ownerRow, error: ownerError } =
    await selectCommentDeleteContext(db, commentId);

  if (isMissingAuthorIdColumn(ownerError)) {
    throw new Error("Comment ownership is not available for older comments.");
  }

  if (ownerError) throw ownerError;
  if (
    !ownerRow ||
    !(await canDeleteCommentFromContext(
      ownerRow as Record<string, unknown>,
      currentUserId,
    ))
  ) {
    throw new Error("You can only delete comments you created.");
  }

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

  await removeCommunityImages(db, [(ownerRow as any).image_path]);
}

export async function setCommunityPostLike(
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
