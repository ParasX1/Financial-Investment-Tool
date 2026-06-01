import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_POSTS } from "./constants";
import { normalizeDiscussionDraft } from "./communityDraft";
import { getErrorMessage } from "./communityErrors";
import {
  commentFromRow,
  postFromRow,
} from "./communityMappers";
import {
  deleteCommunityCommentRow,
  deleteCommunityPostRow,
  insertCommunityCommentRow,
  insertCommunityPostRow,
  isMissingAuthorIdColumn,
  loadCommentImagePathRowsForPost,
  loadCommunityCommentRows,
  loadCommunityPostRows,
  selectCommentDeleteContext,
  selectLikedPostRows,
  selectPostDeleteContext,
  setCommunityPostLikeValue,
  type CommentDeleteContext,
} from "./communityRepository";
import { removeCommunityImages, uniqueImagePaths } from "./communityStorage";
import type {
  CommentEntry,
  DiscussionPostInput,
  PostUI,
} from "./types";

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
  commentsError?: string;
  likesError?: string;
}> {
  const activeUserId =
    currentUserId === undefined ? await getSessionUserId(db) : currentUserId;

  const { data: rows, error } = await loadCommunityPostRows(db);

  if (error) throw error;

  const dbPosts: PostUI[] = rows
    ? rows.map((row) => postFromRow(row, activeUserId))
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
    console.error(
      "load comments failed:",
      getErrorMessage(commentsError, "Unknown comments load error."),
    );
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
    comments: (allComments ?? []).map((row) => ({
      postId: row.post_id,
      comment: commentFromRow(row, activeUserId),
    })),
    likedPostIds: likedPostIds.ids,
    likesError: likedPostIds.error,
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

  const { data, error } = await selectLikedPostRows(
    db,
    postIds,
    currentUserId,
  );

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

  const row = await insertCommunityPostRow(db, postDraft, uid);
  return postFromRow(row, uid);
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
  const row = await insertCommunityCommentRow({
    db,
    postId,
    text,
    imageUrl,
    imagePath,
    uid,
  });

  return commentFromRow(row, uid);
}

export async function deleteCommunityComment(
  db: SupabaseClient,
  commentId: string,
  currentUserId: string,
) {
  const { data: owner, error: ownerError } =
    await selectCommentDeleteContext(db, commentId);

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
