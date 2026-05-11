import {
  COMMUNITY_IMAGE_EXTENSIONS,
  COMMUNITY_IMAGE_TYPES,
  MAX_COMMUNITY_IMAGE_BYTES,
  POST_BODY_PREVIEW_MIN_WORD_BOUNDARY,
} from "./constants";
import type {
  CommentRow,
  CommentUI,
  CommentsState,
  CommunityFeedCounts,
  CommunityFeedView,
  DBPost,
  DiscussionDraft,
  DiscussionPostInput,
  PostUI,
} from "./types";
import { inferTags, normalizeSelectedTags } from "./smartTags";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(
      (error as { message?: unknown }).message ?? "",
    ).trim();
    if (message) return message;
  }

  if (typeof error === "string" && error.trim()) return error.trim();

  return fallback;
}

export function getUploadErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Could not upload image.");

  if (message.toLowerCase().includes("row-level security")) {
    return "Image upload is blocked by the Supabase Storage policy for this bucket.";
  }

  return message;
}

export function validateCommunityImage(file: File) {
  if (!COMMUNITY_IMAGE_TYPES.includes(file.type)) {
    return "Attach a JPG, PNG, WebP, or GIF image.";
  }

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !COMMUNITY_IMAGE_EXTENSIONS.includes(extension)) {
    return "Attach a JPG, PNG, WebP, or GIF image.";
  }

  if (file.size > MAX_COMMUNITY_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }

  return null;
}

export function validateCommentImage(file: File) {
  return validateCommunityImage(file);
}

export function initials(name: string) {
  return (
    name
      ?.trim()
      ?.split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("") || "?"
  ).toUpperCase();
}

export function toRelativeTime(value: string) {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return value;

  const diff = Math.max(0, Date.now() - date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(value).toLocaleDateString();
}

export function splitPostCopy(raw: string) {
  const paragraphs = raw
    .trim()
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return {
      title: paragraphs[0].replace(/\s+/g, " "),
      body: paragraphs.slice(1).join("\n\n"),
    };
  }

  const clean = raw.trim().replace(/\s+/g, " ");
  if (!clean) {
    return {
      title: "Untitled discussion",
      body: "Open for feedback and discussion.",
    };
  }

  if (clean.length <= 92) {
    return {
      title: clean,
      body: "Open for feedback and discussion from the community.",
    };
  }

  return {
    title: `${clean.slice(0, 89).trim()}…`,
    body: clean,
  };
}

export function normalizeDiscussionDraft(
  draft: Pick<DiscussionDraft, "title" | "body" | "tags">,
): DiscussionPostInput {
  const title = draft.title.trim().replace(/\s+/g, " ");
  const body = draft.body.trim();

  return {
    title,
    body,
    tags: normalizeSelectedTags(draft.tags),
  };
}

export function getExpandableText(text: string, maxChars: number) {
  const clean = text.trim();

  if (clean.length <= maxChars) {
    return {
      shouldCollapse: false,
      preview: clean,
    };
  }

  const slice = clean.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const lastLineBreak = slice.lastIndexOf("\n");
  const boundary = Math.max(lastSpace, lastLineBreak);
  const end =
    boundary >= POST_BODY_PREVIEW_MIN_WORD_BOUNDARY ? boundary : maxChars;

  return {
    shouldCollapse: true,
    preview: `${clean.slice(0, end).trimEnd()}...`,
  };
}

export function postFromRow(
  row: DBPost,
  currentUserId?: string | null,
): PostUI {
  const fallbackCopy = splitPostCopy(row.title);
  const body = row.body?.trim() || fallbackCopy.body;
  const title =
    row.body === undefined || row.body === null
      ? fallbackCopy.title
      : row.title.trim() || fallbackCopy.title;
  const savedTags = Array.isArray(row.tags)
    ? normalizeSelectedTags(row.tags)
    : null;
  const user = row.author_id
    ? row.author_id === currentUserId
      ? "You"
      : "Member"
    : "Guest";

  return {
    id: row.id,
    user,
    initials: initials(user),
    title,
    body,
    votes: row.votes ?? 0,
    time: toRelativeTime(row.created_at),
    sortTime: new Date(row.created_at).getTime(),
    tags: savedTags ?? inferTags(`${title} ${body}`),
    imageUrl: row.image_url ?? undefined,
    imagePath: row.image_path ?? undefined,
    commentCount: 0,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
    fromDB: true,
    authorId: row.author_id,
  };
}

export function commentFromRow(
  row: CommentRow,
  currentUserId?: string | null,
): CommentUI {
  const user =
    row.author_id && row.author_id === currentUserId
      ? "You"
      : row.author_id && row.user_name === "You"
        ? "Member"
        : row.user_name;

  return {
    id: row.id,
    user,
    text: row.body,
    createdAt: row.created_at,
    imageUrl: row.image_url ?? undefined,
    imagePath: row.image_path ?? undefined,
    authorId: row.author_id ?? null,
    fromDB: true,
  };
}

export function createLocalPost(draft: DiscussionPostInput): PostUI {
  const copy = normalizeDiscussionDraft(draft);

  return {
    id: `local-${crypto.randomUUID()}`,
    user: "You",
    initials: "YU",
    title: copy.title || "Untitled discussion",
    body: copy.body || "Open for feedback and discussion.",
    votes: 0,
    time: "just now",
    sortTime: Date.now(),
    tags: copy.tags,
    imageUrl: draft.imageUrl ?? undefined,
    imagePath: draft.imagePath ?? undefined,
    commentCount: 0,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
  };
}

export function createLocalComment(text: string): CommentUI {
  return {
    id: `local-comment-${crypto.randomUUID()}`,
    user: "You",
    text,
    createdAt: new Date().toISOString(),
  };
}

export function isDiscussionDraftDirty(draft: DiscussionDraft) {
  return Boolean(
    draft.title.trim() ||
      draft.body.trim() ||
      draft.tags.length ||
      draft.imageFile,
  );
}

function isCurrentUserPost(post: PostUI, currentUserId: string | null) {
  if (currentUserId && post.authorId === currentUserId) return true;
  return !post.fromDB && post.user === "You";
}

function isCurrentUserComment(comment: CommentUI, currentUserId: string | null) {
  if (currentUserId && comment.authorId === currentUserId) return true;
  return !comment.fromDB && comment.user === "You";
}

function hasCurrentUserComment(
  postId: string,
  commentsState: CommentsState,
  currentUserId: string | null,
) {
  return (commentsState.byPost[postId] ?? []).some((comment) =>
    isCurrentUserComment(comment, currentUserId),
  );
}

function matchesCommunitySearch(post: PostUI, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [post.user, post.title, post.body, ...post.tags]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function getCommunityFeedCounts({
  posts,
  likedPostIds,
  commentsState,
  currentUserId,
}: {
  posts: PostUI[];
  likedPostIds: Set<string>;
  commentsState: CommentsState;
  currentUserId: string | null;
}): CommunityFeedCounts {
  return {
    top: posts.length,
    new: posts.length,
    "my-posts": posts.filter((post) =>
      isCurrentUserPost(post, currentUserId),
    ).length,
    liked: posts.filter((post) => likedPostIds.has(post.id)).length,
    commented: posts.filter((post) =>
      hasCurrentUserComment(post.id, commentsState, currentUserId),
    ).length,
  };
}

export function getVisibleCommunityPosts({
  posts,
  query,
  view,
  likedPostIds,
  commentsState,
  currentUserId,
}: {
  posts: PostUI[];
  query: string;
  view: CommunityFeedView;
  likedPostIds: Set<string>;
  commentsState: CommentsState;
  currentUserId: string | null;
}) {
  const matchingPosts = posts.filter((post) =>
    matchesCommunitySearch(post, query),
  );

  const scopedPosts = matchingPosts.filter((post) => {
    if (view === "my-posts") {
      return isCurrentUserPost(post, currentUserId);
    }

    if (view === "liked") {
      return likedPostIds.has(post.id);
    }

    if (view === "commented") {
      return hasCurrentUserComment(post.id, commentsState, currentUserId);
    }

    return true;
  });

  if (view === "top") {
    return [...scopedPosts].sort((a, b) => b.votes - a.votes);
  }

  return [...scopedPosts].sort((a, b) => b.sortTime - a.sortTime);
}
