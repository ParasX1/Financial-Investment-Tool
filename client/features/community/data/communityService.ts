// File purpose: Coordinates Community business operations between repository, mapping, auth, and storage cleanup.
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDiscussionDraft } from "../lib/communityDraft";
import {
  validateCommunityCommentImageReference,
  validateCommunityPostImageReference,
} from "../lib/communityImageUrls";
import { validateCommunityPostContent } from "../lib/communityValidation";
import { getErrorMessage } from "../lib/communityErrors";
import { commentFromRow, postFromRow } from "../lib/communityMappers";
import { validateCommunityResearchDraft } from "../lib/communityPostMetadata";
import {
  deleteCommunityCommentRow,
  deleteCommunityPostRow,
  insertCommunityCommentRow,
  insertCommunityPostReportRow,
  insertCommunityPostRow,
  isMissingAuthorIdColumn,
  loadCommentImagePathRowsForPost,
  loadCommunityCommentRows,
  loadCommunityPostRows,
  selectCommentDeleteContext,
  selectLikedPostRows,
  selectSavedPostRows,
  selectPostDeleteContext,
  setCommunityPostLikeValue,
  setCommunityPostSavedValue,
  type CommentDeleteContext,
} from "./communityRepository";
import { removeCommunityImages, uniqueImagePaths } from "./communityStorage";
import type {
  CommentEntry,
  CommunityReportReason,
  DiscussionPostInput,
  PostUI,
} from "../types";

const COMMUNITY_REPORT_REASONS = new Set<CommunityReportReason>([
  "spam_or_scam",
  "misleading_financial_claim",
  "market_manipulation",
  "harassment",
  "other",
]);

async function getSessionUserId(db: SupabaseClient) {
  const { data } = await db.auth.getSession();
  return data.session?.user.id ?? null;
}

function requireSessionUserId(uid: string | null, action: string) {
  if (!uid) throw new Error(`Sign in to ${action}.`);
  return uid;
}

export async function loadCommunityData(
  db: SupabaseClient,
  currentUserId?: string | null,
): Promise<{
  posts: PostUI[];
  comments: CommentEntry[];
  likedPostIds: string[];
  savedPostIds: string[];
  commentsError?: string;
  likesError?: string;
  savesError?: string;
}> {
  const activeUserId =
    currentUserId === undefined ? await getSessionUserId(db) : currentUserId;

  const { data: rows, error } = await loadCommunityPostRows(db);

  if (error) throw error;

  const dbPosts: PostUI[] = rows
    ? rows.map((row) => postFromRow(row, activeUserId))
    : [];
  const posts: PostUI[] = dbPosts;

  if (!dbPosts.length) {
    return { posts, comments: [], likedPostIds: [], savedPostIds: [] };
  }

  const postIds = dbPosts.map((post) => post.id);
  const commentsQuery = await loadCommunityCommentRows(db, postIds);

  const { data: allComments, error: commentsError } = commentsQuery;
  const [likedPostIds, savedPostIds] = await Promise.all([
    loadLikedPostIds(db, postIds, activeUserId),
    loadSavedPostIds(db, postIds, activeUserId),
  ]);

  if (commentsError) {
    console.error(
      "load comments failed:",
      getErrorMessage(commentsError, "Unknown comments load error."),
    );
    return {
      posts,
      comments: [],
      likedPostIds: likedPostIds.ids,
      savedPostIds: savedPostIds.ids,
      commentsError: "Posts loaded, but comments could not be loaded.",
      likesError: likedPostIds.error,
      savesError: savedPostIds.error,
    };
  }

  return {
    posts,
    comments: (allComments ?? []).map((row) => ({
      postId: row.post_id,
      comment: commentFromRow(row, activeUserId),
    })),
    likedPostIds: likedPostIds.ids,
    savedPostIds: savedPostIds.ids,
    likesError: likedPostIds.error,
    savesError: savedPostIds.error,
  };
}

async function loadCommentImagePathsForPost(
  db: SupabaseClient,
  postId: string,
) {
  const rows = await loadCommentImagePathRowsForPost(db, postId);
  return uniqueImagePaths(rows.map((row) => row.image_path));
}

function canDeleteCommentFromContext(
  ownerRow: Pick<CommentDeleteContext, "author_id">,
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

  const { data, error } = await selectLikedPostRows(db, postIds, currentUserId);

  if (error) {
    console.error(
      "load likes failed:",
      getErrorMessage(error, "Unknown likes load error."),
    );
    return {
      ids: [] as string[],
      error: "Posts loaded, but saved like state could not be loaded.",
    };
  }

  return { ids: (data ?? []).map((row) => row.post_id) };
}

async function loadSavedPostIds(
  db: SupabaseClient,
  postIds: string[],
  currentUserId: string | null,
) {
  if (!currentUserId || !postIds.length) {
    return { ids: [] as string[] };
  }

  const { data, error } = await selectSavedPostRows(db, postIds, currentUserId);

  if (error) {
    console.error(
      "load saves failed:",
      getErrorMessage(error, "Unknown saved-posts load error."),
    );
    return {
      ids: [] as string[],
      error: "Posts loaded, but saved discussions could not be loaded.",
    };
  }

  return { ids: (data ?? []).map((row) => row.post_id) };
}

export async function createCommunityPost(
  db: SupabaseClient,
  draft: DiscussionPostInput,
  authorId: string,
): Promise<PostUI> {
  const activeUserId = requireSessionUserId(
    await getSessionUserId(db),
    "create a discussion",
  );
  if (activeUserId !== authorId) {
    throw new Error("Your session changed. Please try again.");
  }
  const contentError = validateCommunityPostContent(draft);
  if (contentError) throw new Error(contentError);
  const imageError = validateCommunityPostImageReference(draft);
  if (imageError) throw new Error(imageError);
  const researchContextError = validateCommunityResearchDraft(draft);
  if (researchContextError) throw new Error(researchContextError);

  const postDraft = {
    ...normalizeDiscussionDraft(draft),
    imageUrl: null,
    imagePath: draft.imagePath ?? null,
  };

  const row = await insertCommunityPostRow(db, postDraft, authorId);
  return postFromRow(row, authorId);
}

export async function deleteCommunityPost(
  db: SupabaseClient,
  postId: string,
  currentUserId: string,
) {
  const { data: owner, error: ownerError } = await selectPostDeleteContext(
    db,
    postId,
  );

  if (ownerError) throw ownerError;

  if (!owner || owner.author_id !== currentUserId) {
    throw new Error("You can only delete discussions you created.");
  }

  const imagePaths = uniqueImagePaths([
    owner.image_path,
    ...(await loadCommentImagePathsForPost(db, postId)),
  ]);

  const { data, error } = await deleteCommunityPostRow(
    db,
    postId,
    currentUserId,
  );

  if (error) throw error;
  if (!data?.length) {
    throw new Error("You can only delete discussions you created.");
  }

  await removeCommunityImages(db, imagePaths);
}

export async function createCommunityComment({
  authorId,
  db,
  postId,
  text,
  imageUrl,
  imagePath,
}: {
  authorId: string;
  db: SupabaseClient;
  postId: string;
  text: string;
  imageUrl?: string;
  imagePath?: string;
}) {
  const activeUserId = requireSessionUserId(
    await getSessionUserId(db),
    "comment",
  );
  if (activeUserId !== authorId) {
    throw new Error("Your session changed. Please try again.");
  }
  const imageError = validateCommunityCommentImageReference({
    imageUrl,
    imagePath,
  });
  if (imageError) throw new Error(imageError);

  const row = await insertCommunityCommentRow({
    db,
    postId,
    text,
    imageUrl: undefined,
    imagePath,
    uid: authorId,
  });

  return commentFromRow(row, authorId);
}

export async function deleteCommunityComment(
  db: SupabaseClient,
  commentId: string,
  currentUserId: string,
) {
  const { data: owner, error: ownerError } = await selectCommentDeleteContext(
    db,
    commentId,
  );

  if (isMissingAuthorIdColumn(ownerError)) {
    throw new Error("Comment ownership is not available for older comments.");
  }

  if (ownerError) throw ownerError;
  if (!owner || !canDeleteCommentFromContext(owner, currentUserId)) {
    throw new Error("You can only delete comments you created.");
  }

  const { data, error } = await deleteCommunityCommentRow(
    db,
    commentId,
    currentUserId,
  );

  if (isMissingAuthorIdColumn(error)) {
    throw new Error("Comment ownership is not available for older comments.");
  }

  if (error) throw error;
  if (!data?.length) {
    throw new Error("You can only delete comments you created.");
  }

  await removeCommunityImages(db, [owner.image_path]);
}

export async function setCommunityPostLike(
  db: SupabaseClient,
  postId: string,
  liked: boolean,
) {
  return setCommunityPostLikeValue(db, postId, liked);
}

export async function setCommunityPostSaved(
  db: SupabaseClient,
  postId: string,
  saved: boolean,
  expectedUserId: string,
) {
  const activeUserId = requireSessionUserId(
    await getSessionUserId(db),
    "save a discussion",
  );
  if (activeUserId !== expectedUserId) {
    throw new Error("Your session changed. Please try again.");
  }
  if (!postId.trim()) throw new Error("Choose a discussion to save.");

  await setCommunityPostSavedValue(db, postId, activeUserId, saved);
}

export async function reportCommunityPost(
  db: SupabaseClient,
  input: {
    postId: string;
    reason: CommunityReportReason;
    details?: string | null;
    expectedUserId: string;
  },
) {
  const activeUserId = requireSessionUserId(
    await getSessionUserId(db),
    "report a discussion",
  );
  if (activeUserId !== input.expectedUserId) {
    throw new Error("Your session changed. Please try again.");
  }
  if (!input.postId.trim()) throw new Error("Choose a discussion to report.");
  if (!COMMUNITY_REPORT_REASONS.has(input.reason)) {
    throw new Error("Choose a valid report reason.");
  }

  const details = input.details?.trim() || null;
  if (details && details.length > 500) {
    throw new Error("Report details must be 500 characters or fewer.");
  }

  await insertCommunityPostReportRow(db, {
    postId: input.postId,
    reason: input.reason,
    details,
  });
}
