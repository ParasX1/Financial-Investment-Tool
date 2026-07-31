// Compatibility adapter for Supabase projects that have not applied every
// Community migration. Only known missing-schema errors may enter this path.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentRow, DBPost } from "../types";
import {
  CREATE_POST_WITH_TICKERS_RPC,
  CURRENT_POST_SELECT_WITHOUT_TICKERS,
  type CommentDeleteContext,
  type CommunityCommentInsert,
  type CommunityInsertAttempt,
  type CommunityPostDraft,
  type CommunityQueryResult,
  type PostDeleteContext,
} from "./communityRepositoryContract";

const COMMENT_SELECT_WITHOUT_IMAGE_PATH =
  "id, post_id, user_name, body, image_url, created_at, author_id";
const POST_SELECT_WITHOUT_IMAGE_PATH =
  "id, title, body, tags, post_type, time_frame, symbol, source_url, image_url, votes, created_at, author_id";
const POST_SELECT_WITHOUT_CONTEXT =
  "id, title, body, tags, image_url, image_path, votes, created_at, author_id";
const POST_SELECT_WITHOUT_IMAGE =
  "id, title, body, tags, post_type, time_frame, symbol, source_url, votes, created_at, author_id";
const POST_SELECT_WITHOUT_TAGS =
  "id, title, body, post_type, time_frame, symbol, source_url, votes, created_at, author_id";
const LEGACY_POST_SELECT = "id, title, votes, created_at, author_id";

const LEGACY_POST_COLUMNS = [
  "post_type",
  "time_frame",
  "symbol",
  "source_url",
  "image_path",
  "image_url",
  "tags",
  "body",
] as const;

type ErrorDetails = {
  code?: string;
  message?: string;
};

function getErrorDetails(error: unknown): ErrorDetails | null {
  if (!error || typeof error !== "object") return null;
  return error as ErrorDetails;
}

function isMissingColumn(error: unknown, columnName: string) {
  const details = getErrorDetails(error);
  if (!details) return false;

  const message = details.message?.toLowerCase() ?? "";
  const isKnownMissingColumnCode =
    details.code === "42703" || details.code === "PGRST204";

  return isKnownMissingColumnCode && message.includes(columnName.toLowerCase());
}

function isMissingPostTickersRelation(error: unknown) {
  const details = getErrorDetails(error);
  if (!details) return false;

  const message = details.message?.toLowerCase() ?? "";
  return (
    (details.code === "PGRST200" || details.code === "PGRST205") &&
    message.includes("post_tickers")
  );
}

export function isLegacyCommunityPostSchemaError(error: unknown) {
  return (
    isMissingPostTickersRelation(error) ||
    LEGACY_POST_COLUMNS.some((column) => isMissingColumn(error, column))
  );
}

export function isLegacyCommunityCommentSchemaError(error: unknown) {
  return isMissingColumn(error, "image_path");
}

export function isMissingAtomicCommunityPostFunction(error: unknown) {
  const details = getErrorDetails(error);
  if (!details) return false;

  const message = details.message?.toLowerCase() ?? "";
  return (
    (details.code === "PGRST202" || details.code === "42883") &&
    message.includes(CREATE_POST_WITH_TICKERS_RPC)
  );
}

export function isMissingAuthorIdColumn(error: unknown) {
  return (
    isMissingColumn(error, "author_id") &&
    getErrorDetails(error)?.code === "42703"
  );
}

function isMissingResearchContextColumn(error: unknown) {
  return ["post_type", "time_frame", "symbol", "source_url"].some((column) =>
    isMissingColumn(error, column),
  );
}

export async function loadLegacyCommunityPostRows(
  db: SupabaseClient,
  initialError: unknown,
) {
  const selects = [
    ...(isMissingPostTickersRelation(initialError)
      ? [CURRENT_POST_SELECT_WITHOUT_TICKERS]
      : []),
    POST_SELECT_WITHOUT_IMAGE_PATH,
    POST_SELECT_WITHOUT_CONTEXT,
    POST_SELECT_WITHOUT_IMAGE,
    POST_SELECT_WITHOUT_TAGS,
    LEGACY_POST_SELECT,
  ];
  let latestResult: CommunityQueryResult<DBPost[]> = {
    data: null,
    error: initialError,
  };

  for (const columns of selects) {
    latestResult = (await db
      .from("posts")
      .select(columns)
      .order("created_at", { ascending: false })) as CommunityQueryResult<
      DBPost[]
    >;

    if (!isLegacyCommunityPostSchemaError(latestResult.error)) {
      return latestResult;
    }
  }

  return latestResult;
}

export async function loadLegacyCommunityCommentRows(
  db: SupabaseClient,
  postIds: string[],
) {
  return (await db
    .from("comments")
    .select(COMMENT_SELECT_WITHOUT_IMAGE_PATH)
    .in("post_id", postIds)
    .order("created_at", { ascending: false })) as CommunityQueryResult<
    CommentRow[]
  >;
}

export async function selectLegacyPostDeleteContext(
  db: SupabaseClient,
  postId: string,
): Promise<CommunityQueryResult<PostDeleteContext>> {
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

export async function selectLegacyCommentDeleteContext(
  db: SupabaseClient,
  commentId: string,
): Promise<CommunityQueryResult<CommentDeleteContext>> {
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

function createLegacyPostInsertAttempts(
  postDraft: CommunityPostDraft,
  uid: string,
): CommunityInsertAttempt[] {
  const currentSchemaAttempt: CommunityInsertAttempt = {
    values: {
      title: postDraft.title,
      body: postDraft.body,
      tags: postDraft.tags,
      post_type: postDraft.postType,
      time_frame: postDraft.timeFrame,
      symbol: postDraft.symbol,
      source_url: postDraft.sourceUrl,
      image_url: postDraft.imageUrl,
      image_path: postDraft.imagePath,
      author_id: uid,
    },
    select: CURRENT_POST_SELECT_WITHOUT_TICKERS,
  };

  if (postDraft.imageUrl || postDraft.imagePath) {
    return [currentSchemaAttempt];
  }

  return [
    currentSchemaAttempt,
    {
      values: {
        title: postDraft.title,
        body: postDraft.body,
        tags: postDraft.tags,
        post_type: postDraft.postType,
        time_frame: postDraft.timeFrame,
        symbol: postDraft.symbol,
        source_url: postDraft.sourceUrl,
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
        image_url: postDraft.imageUrl,
        author_id: uid,
      },
      select: POST_SELECT_WITHOUT_CONTEXT,
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
}

export async function insertLegacyCompatibleCommunityPostRow(
  db: SupabaseClient,
  postDraft: CommunityPostDraft,
  uid: string,
) {
  const hasExplicitResearchContext =
    postDraft.postType !== "discussion" ||
    Boolean(postDraft.timeFrame || postDraft.symbol || postDraft.sourceUrl);

  for (const attempt of createLegacyPostInsertAttempts(postDraft, uid)) {
    const { data: row, error } = (await db
      .from("posts")
      .insert(attempt.values)
      .select(attempt.select)
      .single()) as CommunityQueryResult<DBPost>;

    if (hasExplicitResearchContext && isMissingResearchContextColumn(error)) {
      throw new Error(
        "A Community database update is required before this research context can be published.",
      );
    }
    if (isLegacyCommunityPostSchemaError(error)) continue;
    if (error) throw error;
    if (row) return row;
  }

  throw new Error("Could not create post with the current Community schema.");
}

export async function insertLegacyCompatibleCommunityCommentRow(
  db: SupabaseClient,
  input: CommunityCommentInsert,
) {
  return (await db
    .from("comments")
    .insert({
      post_id: input.postId,
      body: input.text,
      image_url: input.imageUrl ?? null,
      author_id: input.uid,
    })
    .select(COMMENT_SELECT_WITHOUT_IMAGE_PATH)
    .single()) as CommunityQueryResult<CommentRow>;
}
