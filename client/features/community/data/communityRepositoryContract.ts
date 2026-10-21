import type { CommentRow, DBPost, DiscussionPostInput } from "../types";

export const CREATE_POST_WITH_TICKERS_RPC =
  "create_community_post_with_tickers";

export const CURRENT_COMMENT_SELECT =
  "id, post_id, user_name, body, image_url, image_path, created_at, author_id";

export const CURRENT_POST_SELECT_WITHOUT_TICKERS =
  "id, title, body, tags, post_type, time_frame, symbol, source_url, image_url, image_path, votes, created_at, author_id";

export const CURRENT_POST_SELECT = `${CURRENT_POST_SELECT_WITHOUT_TICKERS}, post_tickers(symbol, position)`;

export type CommunityQueryResult<T> = {
  data: T | null;
  error: unknown;
};

export type CommunityInsertAttempt = {
  values: Readonly<Record<string, unknown>>;
  select: string;
};

export type CommunityPostDraft = DiscussionPostInput & {
  imageUrl: string | null;
  imagePath: string | null;
};

export type CommunityCommentInsert = {
  postId: string;
  text: string;
  imageUrl?: string;
  imagePath?: string;
  uid: string;
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

export type CurrentPostCreateResult = CommunityQueryResult<DBPost | DBPost[]>;
export type CurrentCommentCreateResult = CommunityQueryResult<CommentRow>;
