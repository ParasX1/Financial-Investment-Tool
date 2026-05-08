export type SortMode = "top" | "new";

export type DiscussionDraft = {
  title: string;
  body: string;
  tags: string[];
};

export type DiscussionDraftField = "title" | "body";

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
  commentCount: number;
  avatarGradient: string;
};

export type DBPost = {
  id: string;
  title: string;
  body?: string | null;
  tags?: string[] | null;
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
  user_name: string;
  body: string;
  image_url: string | null;
  created_at: string;
  author_id?: string | null;
};

export type CommentUI = {
  id: string;
  user: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
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
