// Stable Community repository facade. Current-schema Supabase access and
// legacy migration compatibility remain separate implementation boundaries.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeCommunityTickers,
  validateCommunityTickers,
} from "../lib/communityTickers";
import {
  createCurrentCommunityPostWithTickers,
  insertCurrentCommunityCommentRow,
  loadCurrentCommentImagePathRowsForPost,
  loadCurrentCommunityCommentRows,
  loadCurrentCommunityPostRows,
  selectCurrentCommentDeleteContext,
  selectCurrentPostDeleteContext,
} from "./communityCurrentRepository";
import {
  insertLegacyCompatibleCommunityCommentRow,
  insertLegacyCompatibleCommunityPostRow,
  isLegacyCommunityCommentSchemaError,
  isLegacyCommunityPostSchemaError,
  isMissingAtomicCommunityPostFunction,
  loadLegacyCommunityCommentRows,
  loadLegacyCommunityPostRows,
  selectLegacyCommentDeleteContext,
  selectLegacyPostDeleteContext,
} from "./communityLegacyCompatibility";
import type {
  CommunityCommentInsert,
  CommunityPostDraft,
} from "./communityRepositoryContract";

export {
  deleteCommunityCommentRow,
  deleteCommunityPostRow,
  insertCommunityPostReportRow,
  selectLikedPostRows,
  selectSavedPostRows,
  setCommunityPostLikeValue,
  setCommunityPostSavedValue,
} from "./communityCurrentRepository";
export { isMissingAuthorIdColumn } from "./communityLegacyCompatibility";
export type {
  CommentDeleteContext,
  PostDeleteContext,
} from "./communityRepositoryContract";

const MULTI_TICKER_MIGRATION_ERROR =
  "A Community database update is required before multiple tickers can be published.";
const COMMENT_CREATE_ERROR =
  "Could not create comment with the current Community schema.";

export async function loadCommunityPostRows(db: SupabaseClient) {
  const currentResult = await loadCurrentCommunityPostRows(db);
  if (!isLegacyCommunityPostSchemaError(currentResult.error)) {
    return currentResult;
  }

  return loadLegacyCommunityPostRows(db, currentResult.error);
}

export async function loadCommunityCommentRows(
  db: SupabaseClient,
  postIds: string[],
) {
  const currentResult = await loadCurrentCommunityCommentRows(db, postIds);
  if (!isLegacyCommunityCommentSchemaError(currentResult.error)) {
    return currentResult;
  }

  return loadLegacyCommunityCommentRows(db, postIds);
}

export async function selectPostDeleteContext(
  db: SupabaseClient,
  postId: string,
) {
  const currentResult = await selectCurrentPostDeleteContext(db, postId);
  if (!isLegacyCommunityCommentSchemaError(currentResult.error)) {
    return currentResult;
  }

  return selectLegacyPostDeleteContext(db, postId);
}

export async function selectCommentDeleteContext(
  db: SupabaseClient,
  commentId: string,
) {
  const currentResult = await selectCurrentCommentDeleteContext(db, commentId);
  if (!isLegacyCommunityCommentSchemaError(currentResult.error)) {
    return currentResult;
  }

  return selectLegacyCommentDeleteContext(db, commentId);
}

export async function loadCommentImagePathRowsForPost(
  db: SupabaseClient,
  postId: string,
) {
  const result = await loadCurrentCommentImagePathRowsForPost(db, postId);
  if (isLegacyCommunityCommentSchemaError(result.error)) return [];
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function insertCommunityPostRow(
  db: SupabaseClient,
  postDraft: CommunityPostDraft,
  uid: string,
) {
  const requestedTickers =
    postDraft.tickers ?? (postDraft.symbol ? [postDraft.symbol] : []);
  const tickerValidationError = validateCommunityTickers(requestedTickers);
  if (tickerValidationError) throw new Error(tickerValidationError);
  const tickers = normalizeCommunityTickers(requestedTickers);

  const currentResult = await createCurrentCommunityPostWithTickers(
    db,
    postDraft,
    tickers,
  );

  if (currentResult) {
    const currentRow = Array.isArray(currentResult.data)
      ? currentResult.data[0]
      : currentResult.data;

    if (!currentResult.error && currentRow) {
      return {
        ...currentRow,
        post_tickers: tickers.map((symbol, position) => ({ symbol, position })),
      };
    }
    if (!currentResult.error) {
      throw new Error("Could not create the Community post transaction.");
    }
    if (!isMissingAtomicCommunityPostFunction(currentResult.error)) {
      throw currentResult.error;
    }
  }

  if (tickers.length > 1) throw new Error(MULTI_TICKER_MIGRATION_ERROR);
  return insertLegacyCompatibleCommunityPostRow(db, postDraft, uid);
}

export async function insertCommunityCommentRow({
  db,
  ...input
}: CommunityCommentInsert & { db: SupabaseClient }) {
  const currentResult = await insertCurrentCommunityCommentRow(db, input);

  if (!currentResult.error && currentResult.data) return currentResult.data;
  if (
    currentResult.error &&
    !isLegacyCommunityCommentSchemaError(currentResult.error)
  ) {
    throw currentResult.error;
  }
  if (input.imageUrl || input.imagePath) throw new Error(COMMENT_CREATE_ERROR);

  const legacyResult = await insertLegacyCompatibleCommunityCommentRow(
    db,
    input,
  );
  if (!legacyResult.error && legacyResult.data) return legacyResult.data;
  if (
    legacyResult.error &&
    !isLegacyCommunityCommentSchemaError(legacyResult.error)
  ) {
    throw legacyResult.error;
  }

  throw new Error(COMMENT_CREATE_ERROR);
}
