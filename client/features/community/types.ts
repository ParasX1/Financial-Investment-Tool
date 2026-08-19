// File purpose: Defines shared Community TypeScript contracts for posts, comments, feeds, and UI state.
export type CommunityFeedView =
  | "top"
  | "new"
  | "my-posts"
  | "saved"
  | "liked"
  | "commented";

export type CommunityPostType =
  | "question"
  | "analysis"
  | "news"
  | "portfolio"
  | "discussion";

export type CommunityTimeFrame = "short" | "medium" | "long";

export type CommunityReportReason =
  | "spam_or_scam"
  | "misleading_financial_claim"
  | "market_manipulation"
  | "harassment"
  | "other";

export type CommunityFeedCounts = Record<CommunityFeedView, number>;

export type CommunityTopTimeRange =
  | "all-time"
  | "past-year"
  | "past-month"
  | "past-week"
  | "today"
  | "past-hour";

export type DiscussionDraft = {
  title: string;
  body: string;
  tags: string[];
  postType: CommunityPostType | "";
  timeFrame: CommunityTimeFrame | "";
  tickers: string[];
  tickerInput: string;
  sourceUrl: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
};

export type DiscussionDraftField = "title" | "body";

export type DiscussionDraftMetadataField =
  | "postType"
  | "timeFrame"
  | "tickerInput"
  | "sourceUrl";

export type DiscussionPostInput = {
  title: string;
  body: string;
  tags: string[];
  postType: CommunityPostType;
  timeFrame: CommunityTimeFrame | null;
  tickers: string[];
  symbol: string | null;
  sourceUrl: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
};

export type SeedPost = {
  id: string;
  user: string;
  initials: string;
  title: string;
  body: string;
  votes: number;
  time: string;
  sortTime: number;
  tags: string[];
  postType?: CommunityPostType;
  timeFrame?: CommunityTimeFrame | null;
  tickers?: string[];
  symbol?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  commentCount: number;
  avatarGradient: string;
};

export type DBPost = {
  id: string;
  title: string;
  body?: string | null;
  tags?: string[] | null;
  post_type?: string | null;
  time_frame?: string | null;
  symbol?: string | null;
  post_tickers?: Array<{
    symbol?: string | null;
    position?: number | null;
  }> | null;
  source_url?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  votes: number;
  created_at: string;
  author_id: string | null;
};

export type PostUI = SeedPost & {
  fromDB?: boolean;
  authorId?: string | null;
};

export type CommentRow = {
  id: string;
  post_id: string;
  user_name: string | null;
  body: string;
  image_url: string | null;
  image_path?: string | null;
  created_at: string;
  author_id?: string | null;
};

export type CommentUI = {
  id: string;
  user: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
  imagePath?: string;
  authorId?: string | null;
  fromDB?: boolean;
};

export type NewComment = {
  text: string;
  file?: File | null;
  previewUrl?: string | null;
};

export type FeedbackTone = "error" | "success" | "info";

export type FeedbackMessage = {
  id: string;
  tone: FeedbackTone;
  title: string;
  message?: string;
};

export type PendingDelete =
  | {
      type: "post";
      postId: string;
      title: string;
      message: string;
    }
  | {
      type: "comment";
      postId: string;
      commentId: string;
      title: string;
      message: string;
    };

export type CommentEntry = {
  postId: string;
  comment: CommentUI;
};

export type CommentsState = {
  byPost: Record<string, CommentUI[]>;
  counts: Record<string, number>;
  seenIds: Record<string, true>;
};

export type CommentsAction =
  | { type: "reset"; posts: PostUI[]; comments?: CommentEntry[] }
  | { type: "ensurePost"; postId: string; initialCount?: number }
  | { type: "removePost"; postId: string }
  | { type: "addComment"; postId: string; comment: CommentUI }
  | { type: "removeComment"; postId: string; commentId: string };
