import {
  COMMENT_IMAGE_EXTENSIONS,
  COMMENT_IMAGE_TYPES,
  MAX_COMMENT_IMAGE_BYTES,
  POST_BODY_PREVIEW_MIN_WORD_BOUNDARY,
} from "./constants";
import type {
  CommentRow,
  CommentUI,
  DBPost,
  DiscussionDraft,
  PostUI,
} from "./types";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
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

export function validateCommentImage(file: File) {
  if (!COMMENT_IMAGE_TYPES.includes(file.type)) {
    return "Attach a JPG, PNG, WebP, or GIF image.";
  }

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !COMMENT_IMAGE_EXTENSIONS.includes(extension)) {
    return "Attach a JPG, PNG, WebP, or GIF image.";
  }

  if (file.size > MAX_COMMENT_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }

  return null;
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

export function normalizeDiscussionDraft(draft: DiscussionDraft): DiscussionDraft {
  return {
    title: draft.title.trim().replace(/\s+/g, " "),
    body: draft.body.trim(),
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

export function inferTags(text: string) {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  if (lower.includes("portfolio")) tags.push("Portfolio");
  if (lower.includes("strategy")) tags.push("Strategy");
  if (lower.includes("nvda") || lower.includes("nvidia")) tags.push("NVDA");
  if (lower.includes("ai")) tags.push("AI");
  if (lower.includes("backtest")) tags.push("Backtesting");
  if (lower.includes("valuation")) tags.push("Valuation");
  if (lower.includes("cash")) tags.push("Cash Flow");

  return tags.length ? tags.slice(0, 3) : ["Discussion", "Market View"];
}

export function postFromRow(row: DBPost, currentUserId?: string | null): PostUI {
  const fallbackCopy = splitPostCopy(row.title);
  const body = row.body?.trim() || fallbackCopy.body;
  const title = row.body === undefined || row.body === null
    ? fallbackCopy.title
    : row.title.trim() || fallbackCopy.title;
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
    tags: inferTags(`${title} ${body}`),
    commentCount: 0,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
    fromDB: true,
    authorId: row.author_id,
  };
}

export function commentFromRow(
  row: CommentRow,
  currentUserId?: string | null
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
    authorId: row.author_id ?? null,
    fromDB: true,
  };
}

export function createLocalPost(draft: DiscussionDraft): PostUI {
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
    tags: inferTags(`${copy.title} ${copy.body}`),
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
