// File purpose: Maps database and local draft records into Community UI post and comment models.
import { createCommunityId } from "./id";
import {
  normalizeCommunityPostType,
  normalizeCommunitySourceUrl,
  normalizeCommunitySymbol,
  normalizeCommunityTimeFrame,
} from "./communityPostMetadata";
import type {
  CommentRow,
  CommentUI,
  DBPost,
  DiscussionPostInput,
  PostUI,
} from "../types";
import { initials, toRelativeTime } from "./communityFormat";
import { normalizeDiscussionDraft } from "./communityDraft";
import { inferTags, normalizeSelectedTags } from "./smartTags";
import {
  mergeCommunityTickerSymbols,
  normalizeCommunityTickers,
} from "./communityTickers";

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

export function postFromRow(
  row: DBPost,
  currentUserId?: string | null,
): PostUI {
  const fallbackCopy = splitPostCopy(row.title);
  const hasBodyColumn = row.body !== undefined && row.body !== null;
  const body = hasBodyColumn ? (row.body?.trim() ?? "") : fallbackCopy.body;
  const title = !hasBodyColumn
    ? fallbackCopy.title
    : row.title.trim() || fallbackCopy.title;
  const savedTags = Array.isArray(row.tags)
    ? normalizeSelectedTags(row.tags)
    : null;
  const structuredTickers = normalizeCommunityTickers(
    [...(row.post_tickers ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ticker) => ticker.symbol),
  );
  const tickers = structuredTickers.length
    ? structuredTickers
    : mergeCommunityTickerSymbols([], row.symbol);
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
    postType: normalizeCommunityPostType(row.post_type),
    timeFrame: normalizeCommunityTimeFrame(row.time_frame),
    tickers,
    symbol: tickers[0] ?? normalizeCommunitySymbol(row.symbol),
    sourceUrl: normalizeCommunitySourceUrl(row.source_url),
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
  const user = row.author_id
    ? row.author_id === currentUserId
      ? "You"
      : "Member"
    : row.user_name?.trim() || "Guest";

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
    id: `local-${createCommunityId()}`,
    user: "You",
    initials: "YU",
    title: copy.title || "Untitled discussion",
    body: copy.body,
    votes: 0,
    time: "just now",
    sortTime: Date.now(),
    tags: copy.tags,
    postType: copy.postType,
    timeFrame: copy.timeFrame,
    tickers: copy.tickers,
    symbol: copy.symbol,
    sourceUrl: copy.sourceUrl,
    imageUrl: draft.imageUrl ?? undefined,
    imagePath: draft.imagePath ?? undefined,
    commentCount: 0,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
  };
}

export function createLocalComment(text: string): CommentUI {
  return {
    id: `local-comment-${createCommunityId()}`,
    user: "You",
    text,
    createdAt: new Date().toISOString(),
  };
}
