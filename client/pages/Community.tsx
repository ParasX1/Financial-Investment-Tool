"use client";

import * as React from "react";
import Sidebar from "@/components/sidebar";
import communityStyles from "@/styles/community.module.css";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ThumbUpOffAltRoundedIcon from "@mui/icons-material/ThumbUpOffAltRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (process.env as any).NEXT_PUBLIC_ANON ||
    "";

  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: true } });
}

const supabase = getSupabaseClient();
const COMMENT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "comment-images";

type SeedPost = {
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

type DBPost = {
  id: string;
  title: string;
  votes: number;
  created_at: string;
  author_id: string | null;
};

type PostUI = SeedPost & {
  fromDB?: boolean;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_name: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

type CommentUI = {
  id: string;
  user: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
};

type NewComment = {
  text: string;
  file?: File | null;
  previewUrl?: string | null;
};

type FeedbackTone = "error" | "success" | "info";

type FeedbackMessage = {
  id: string;
  tone: FeedbackTone;
  title: string;
  message?: string;
};

type PendingDelete =
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

type CommentEntry = {
  postId: string;
  comment: CommentUI;
};

type CommentsState = {
  byPost: Record<string, CommentUI[]>;
  counts: Record<string, number>;
  seenIds: Record<string, true>;
};

type CommentsAction =
  | { type: "reset"; posts: PostUI[]; comments?: CommentEntry[] }
  | { type: "ensurePost"; postId: string; initialCount?: number }
  | { type: "removePost"; postId: string }
  | { type: "addComment"; postId: string; comment: CommentUI }
  | { type: "removeComment"; postId: string; commentId: string };

const now = Date.now();

const DEMO_POSTS: SeedPost[] = [
  {
    id: "demo-quant-queen",
    user: "QuantQueen",
    initials: "QQ",
    title: "Backtesting Results: Momentum + Mean Reversion Hybrid",
    body:
      "Ran a 10-year backtest on a combined momentum and mean reversion strategy. Sharpe ratio of 2.1 with max drawdown under 15%. Details inside…",
    votes: 426,
    time: "2 days ago",
    sortTime: now - 1000 * 60 * 60 * 24 * 2,
    tags: ["Quantitative", "Backtesting", "Strategy"],
    commentCount: 117,
    avatarGradient: "linear-gradient(135deg, #3158ff 0%, #9333ea 100%)",
  },
  {
    id: "demo-tech-bull",
    user: "TechBull",
    initials: "TB",
    title: "Portfolio Review: My Tech-Heavy Strategy for 2026",
    body:
      "Sharing my current portfolio allocation and reasoning. 70% tech, 20% growth, 10% cash. Open to feedback and discussion.",
    votes: 312,
    time: "1 day ago",
    sortTime: now - 1000 * 60 * 60 * 24,
    tags: ["Portfolio", "Technology", "Strategy"],
    commentCount: 94,
    avatarGradient: "linear-gradient(135deg, #2563eb 0%, #a855f7 100%)",
  },
  {
    id: "demo-investor-pro",
    user: "InvestorPro",
    initials: "IP",
    title: "Deep Dive: Why NVDA's Valuation is Still Justified",
    body:
      "After analyzing the latest earnings report and forward guidance, I believe NVDA's current P/E ratio is sustainable given their AI dominance. Here's my analysis…",
    votes: 247,
    time: "3 hours ago",
    sortTime: now - 1000 * 60 * 60 * 3,
    tags: ["NVDA", "Analysis", "AI"],
    commentCount: 68,
    avatarGradient: "linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)",
  },
  {
    id: "demo-value-hunter",
    user: "ValueHunter",
    initials: "VH",
    title: "Small Cap Watchlist: Three Names With Strong Cash Flow",
    body:
      "Screened for low leverage, widening margins, and insider ownership. These are not recommendations, but the setup is worth a closer look.",
    votes: 189,
    time: "6 hours ago",
    sortTime: now - 1000 * 60 * 60 * 6,
    tags: ["Small Cap", "Valuation", "Watchlist"],
    commentCount: 42,
    avatarGradient: "linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)",
  },
];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const MAX_COMMENT_IMAGE_BYTES = 5 * 1024 * 1024;
const COMMENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const COMMENT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function feedbackToneClasses(tone: FeedbackTone) {
  if (tone === "error") {
    return "border-rose-500/35 bg-rose-500/10 text-rose-100";
  }

  if (tone === "success") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-100";
  }

  return "border-blue-500/35 bg-blue-500/10 text-blue-100";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }

  if (typeof error === "string" && error.trim()) return error.trim();

  return fallback;
}

function getUploadErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Could not upload image.");

  if (message.toLowerCase().includes("row-level security")) {
    return "Image upload is blocked by the Supabase Storage policy for this bucket.";
  }

  return message;
}

function validateCommentImage(file: File) {
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

function initials(name: string) {
  return (
    name
      ?.trim()
      ?.split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("") || "?"
  ).toUpperCase();
}

function toRelativeTime(value: string) {
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

function splitPostCopy(raw: string) {
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

function inferTags(text: string) {
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

function postFromRow(row: DBPost): PostUI {
  const copy = splitPostCopy(row.title);
  const user = row.author_id ? "You" : "Guest";

  return {
    id: row.id,
    user,
    initials: initials(user),
    title: copy.title,
    body: copy.body,
    votes: row.votes ?? 0,
    time: toRelativeTime(row.created_at),
    sortTime: new Date(row.created_at).getTime(),
    tags: inferTags(row.title),
    commentCount: 0,
    avatarGradient: "linear-gradient(135deg, #1d4ed8 0%, #9333ea 100%)",
    fromDB: true,
  };
}

function commentFromRow(row: CommentRow): CommentUI {
  return {
    id: row.id,
    user: row.user_name,
    text: row.body,
    createdAt: row.created_at,
    imageUrl: row.image_url ?? undefined,
  };
}

function createCommentsState(
  posts: PostUI[],
  comments: CommentEntry[] = []
): CommentsState {
  const byPost: Record<string, CommentUI[]> = Object.fromEntries(
    posts.map((post) => [post.id, []])
  );
  const counts: Record<string, number> = Object.fromEntries(
    posts.map((post) => [post.id, post.fromDB ? 0 : post.commentCount])
  );
  const seenIds: Record<string, true> = {};

  comments.forEach(({ postId, comment }) => {
    if (seenIds[comment.id]) return;

    seenIds[comment.id] = true;
    (byPost[postId] ||= []).push(comment);
    counts[postId] = (counts[postId] ?? 0) + 1;
  });

  return { byPost, counts, seenIds };
}

function commentsReducer(
  state: CommentsState,
  action: CommentsAction
): CommentsState {
  switch (action.type) {
    case "reset":
      return createCommentsState(action.posts, action.comments);

    case "ensurePost":
      if (state.byPost[action.postId] && action.postId in state.counts) {
        return state;
      }

      return {
        ...state,
        byPost: { ...state.byPost, [action.postId]: [] },
        counts: {
          ...state.counts,
          [action.postId]: action.initialCount ?? 0,
        },
      };

    case "removePost": {
      const removedComments = state.byPost[action.postId] ?? [];
      const nextByPost = { ...state.byPost };
      const nextCounts = { ...state.counts };
      const nextSeenIds = { ...state.seenIds };

      delete nextByPost[action.postId];
      delete nextCounts[action.postId];
      removedComments.forEach((comment) => {
        delete nextSeenIds[comment.id];
      });

      return {
        byPost: nextByPost,
        counts: nextCounts,
        seenIds: nextSeenIds,
      };
    }

    case "addComment": {
      const current = state.byPost[action.postId] ?? [];

      if (
        state.seenIds[action.comment.id] ||
        current.some((comment) => comment.id === action.comment.id)
      ) {
        return state.seenIds[action.comment.id]
          ? state
          : {
              ...state,
              seenIds: { ...state.seenIds, [action.comment.id]: true },
            };
      }

      return {
        byPost: {
          ...state.byPost,
          [action.postId]: [action.comment, ...current],
        },
        counts: {
          ...state.counts,
          [action.postId]: (state.counts[action.postId] ?? 0) + 1,
        },
        seenIds: { ...state.seenIds, [action.comment.id]: true },
      };
    }

    case "removeComment": {
      const current = state.byPost[action.postId] ?? [];
      const nextComments = current.filter(
        (comment) => comment.id !== action.commentId
      );
      const commentWasPresent = nextComments.length !== current.length;

      if (!commentWasPresent && !state.seenIds[action.commentId]) {
        return state;
      }

      const nextSeenIds = { ...state.seenIds };
      delete nextSeenIds[action.commentId];

      return {
        byPost: commentWasPresent
          ? { ...state.byPost, [action.postId]: nextComments }
          : state.byPost,
        counts: commentWasPresent
          ? {
              ...state.counts,
              [action.postId]: Math.max(
                0,
                (state.counts[action.postId] ?? 1) - 1
              ),
            }
          : state.counts,
        seenIds: nextSeenIds,
      };
    }

    default:
      return state;
  }
}

function CommunityNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-blue-500/10 px-4 py-3 text-sm text-blue-100",
        communityStyles.noticeBorder
      )}
    >
      {children}
    </div>
  );
}

function StatusMessage({
  tone,
  title,
  children,
}: {
  tone: FeedbackTone;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        feedbackToneClasses(tone)
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm opacity-90">{children}</div> : null}
    </div>
  );
}

function FeedbackStack({
  items,
  onDismiss,
}: {
  items: FeedbackMessage[];
  onDismiss: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="mt-4 space-y-3" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
            feedbackToneClasses(item.tone)
          )}
          role={item.tone === "error" ? "alert" : "status"}
        >
          <div className="min-w-0">
            <p className="font-semibold">{item.title}</p>
            {item.message ? (
              <p className={cn("mt-1 opacity-90", communityStyles.wrapAnywhere)}>
                {item.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-80 transition-colors hover:bg-white/10 hover:opacity-100",
              FOCUS_VISIBLE
            )}
            aria-label={`Dismiss ${item.title}`}
          >
            <CloseRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

function LoadingDiscussions() {
  return (
    <div
      className={cn(
        "rounded-xl bg-[#07080b] px-4 py-5 sm:px-7 sm:py-6",
        communityStyles.panelBorder
      )}
      role="status"
      aria-label="Loading community discussions"
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-full", communityStyles.skeleton)} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={cn("h-3 w-28 rounded", communityStyles.skeleton)} />
          <div className={cn("h-3 w-20 rounded", communityStyles.skeleton)} />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className={cn("h-5 w-3/4 rounded", communityStyles.skeleton)} />
        <div className={cn("h-3 w-full rounded", communityStyles.skeleton)} />
        <div className={cn("h-3 w-5/6 rounded", communityStyles.skeleton)} />
      </div>
      <p className="mt-5 text-sm text-slate-500">Loading latest discussions…</p>
    </div>
  );
}

function DeleteConfirmDialog({
  pending,
  busy,
  onCancel,
  onConfirm,
}: {
  pending: PendingDelete | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!pending) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [pending]);

  if (!pending) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) {
      onCancel();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 px-4"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full max-w-[420px] rounded-xl bg-[#08090d] p-5 text-white shadow-2xl",
          communityStyles.panelBorder
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {pending.title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-300">
          {pending.message}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_VISIBLE
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_VISIBLE
            )}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentForm({
  onSubmit,
  busy = false,
}: {
  onSubmit: (data: NewComment) => Promise<void> | void;
  busy?: boolean;
}) {
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const commentInputId = React.useId();

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  function handleFile(nextFile?: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!nextFile) {
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    const validationError = validateCommentImage(nextFile);
    if (validationError) {
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !text.trim()) return;

    setErrorMessage(null);

    try {
      await onSubmit({ text: text.trim(), file, previewUrl });
      setText("");
      handleFile(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not post reply."));
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn("rounded-lg bg-[#0d0e13] p-3", communityStyles.softBorder)}
    >
      <label htmlFor={commentInputId} className="sr-only">
        Add a comment
      </label>
      <textarea
        id={commentInputId}
        name="community-comment"
        autoComplete="off"
        disabled={busy}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Add to the discussion…"
        rows={3}
        className={cn(
          "w-full resize-none rounded-md bg-[#16171d] px-3 py-3 text-sm text-slate-100",
          communityStyles.softBorder,
          "placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        )}
      />

      {previewUrl ? (
        <div
          className={cn(
            "mt-3 overflow-hidden rounded-md bg-black/30",
            communityStyles.softBorder
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected comment attachment"
            width={640}
            height={360}
            className="max-h-60 w-full object-contain"
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <input
          ref={fileInput}
          type="file"
          accept={COMMENT_IMAGE_TYPES.join(",")}
          className="hidden"
          disabled={busy}
          onChange={(event) => handleFile(event.currentTarget.files?.[0] ?? null)}
        />
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className={cn(
              "grid h-9 w-9 touch-manipulation place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100",
              "disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_VISIBLE
            )}
            title="Attach image"
            aria-label="Attach image"
          >
            <ImageOutlinedIcon fontSize="small" aria-hidden="true" />
          </button>

          {file ? (
            <button
              type="button"
              onClick={() => handleFile(null)}
              disabled={busy}
              className={cn(
                "inline-flex min-w-0 touch-manipulation items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 transition-colors hover:border-rose-400/50 hover:text-rose-200",
                "disabled:cursor-not-allowed disabled:opacity-50",
                communityStyles.softBorder,
                FOCUS_VISIBLE
              )}
              title="Remove attachment"
              aria-label={`Remove attachment ${file.name}`}
            >
              <span className="truncate">{file.name}</span>
              <CloseRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy || !text.trim()}
          className={cn(
            "inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors",
            "hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
            FOCUS_VISIBLE
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {busy ? "Posting…" : "Reply"}
        </button>
      </div>

      {errorMessage ? (
        <p
          className={cn(
            "mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100",
            communityStyles.wrapAnywhere
          )}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}

function CommentList({
  items,
  onDelete,
}: {
  items: CommentUI[];
  onDelete?: (id: string) => Promise<void> | void;
}) {
  if (!items.length) {
    return (
      <div
        className={cn(
          "rounded-lg bg-[#0d0e13] px-4 py-4 text-sm text-slate-400",
          communityStyles.softBorder
        )}
      >
        No comments yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((comment) => (
        <li
          key={comment.id}
          className={cn("rounded-lg bg-[#0d0e13] p-4", communityStyles.softBorder)}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#20222b] text-[11px] font-bold text-slate-200">
                {initials(comment.user)}
              </div>
              <span className="min-w-0 truncate font-semibold text-slate-200">
                {comment.user}
              </span>
              <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-slate-700" />
              <time dateTime={comment.createdAt}>{toRelativeTime(comment.createdAt)}</time>
            </div>

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className={cn(
                  "grid h-8 w-8 shrink-0 touch-manipulation place-items-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-200",
                  FOCUS_VISIBLE
                )}
                title="Delete comment"
                aria-label="Delete comment"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-6 text-slate-200",
              communityStyles.wrapAnywhere
            )}
          >
            {comment.text}
          </p>

          {comment.imageUrl ? (
            <div
              className={cn(
                "mt-3 overflow-hidden rounded-md bg-black/30",
                communityStyles.softBorder
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comment.imageUrl}
                alt="Comment attachment"
                width={720}
                height={420}
                loading="lazy"
                className="max-h-80 w-full object-contain"
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PostCard({
  post,
  comments,
  count,
  liked,
  onAddComment,
  onDeleteComment,
  onDeletePost,
  onToggleLike,
}: {
  post: PostUI;
  comments: CommentUI[];
  count: number;
  liked: boolean;
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onToggleLike: (postId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const commentsId = React.useId();
  const formattedVotes = post.votes.toLocaleString();
  const commentLabel = `${count.toLocaleString()} ${
    count === 1 ? "comment" : "comments"
  }`;
  const commentButtonLabel = `${open ? "Hide" : "Show"} ${commentLabel}`;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl bg-[#07080b] px-4 py-5 transition-colors duration-200 hover:border-[#34384a] sm:px-7 sm:py-6",
        communityStyles.panelBorder
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white"
              style={{ background: post.avatarGradient }}
            >
              {post.initials}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="min-w-0 truncate font-semibold text-white">
                {post.user}
              </span>
              <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-slate-700" />
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <AccessTimeRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
                {post.time}
              </span>
            </div>
          </div>

          {post.fromDB && onDeletePost ? (
            <button
              type="button"
              onClick={() => onDeletePost(post.id)}
              className={cn(
                "grid h-9 w-9 shrink-0 touch-manipulation place-items-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-200",
                FOCUS_VISIBLE
              )}
              title="Delete post"
              aria-label="Delete post"
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 19 }} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <h2
          className={cn(
            "mt-3 text-lg font-bold leading-snug text-white",
            communityStyles.wrapAnywhere
          )}
        >
          {post.title}
        </h2>

        <p
          className={cn(
            "mt-3 max-w-3xl text-[15px] leading-7 text-slate-300",
            communityStyles.wrapAnywhere
          )}
        >
          {post.body}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded-md bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-300",
                communityStyles.tagBorder,
                communityStyles.wrapAnywhere
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100",
              open && "bg-white/5 text-slate-100",
              FOCUS_VISIBLE
            )}
            aria-expanded={open}
            aria-controls={commentsId}
            aria-label={`${commentButtonLabel} for ${post.title}`}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 19 }} aria-hidden="true" />
            <span aria-live="polite">{commentButtonLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            className={cn(
              "inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors",
              liked
                ? "bg-blue-600/15 text-blue-200"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              FOCUS_VISIBLE
            )}
            aria-pressed={liked}
            aria-label={`${liked ? "Unlike" : "Like"} post. ${formattedVotes} votes`}
          >
            {liked ? (
              <ThumbUpRoundedIcon sx={{ fontSize: 19 }} aria-hidden="true" />
            ) : (
              <ThumbUpOffAltRoundedIcon sx={{ fontSize: 19 }} aria-hidden="true" />
            )}
            <span className="tabular-nums" aria-live="polite">
              {formattedVotes}
            </span>
          </button>
        </div>

        {open ? (
          <div
            id={commentsId}
            className={cn("mt-5 space-y-4 pt-5", communityStyles.dividerTop)}
          >
            <CommentList
              items={comments}
              onDelete={(commentId) => onDeleteComment(commentId, post.id)}
            />
            <CommentForm
              busy={busy}
              onSubmit={async (data) => {
                try {
                  setBusy(true);
                  await onAddComment(post.id, data);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({ query }: { query: string }) {
  const hasSearch = Boolean(query.trim());

  return (
    <div
      className={cn(
        "rounded-xl bg-[#07080b] px-6 py-12 text-center text-sm text-slate-400",
        communityStyles.panelBorder
      )}
    >
      <p className="font-semibold text-slate-200">
        {hasSearch ? "No discussions match your search." : "No discussions yet."}
      </p>
      <p className="mt-2">
        {hasSearch
          ? "Try a different keyword or clear the search field."
          : "Start a discussion to create the first community post."}
      </p>
    </div>
  );
}

function CommunityMain({ supabase }: { supabase: SupabaseClient | null }) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"top" | "new">("top");
  const [draft, setDraft] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [loadingCommunity, setLoadingCommunity] = React.useState(Boolean(supabase));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackMessage[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [posts, setPosts] = React.useState<PostUI[]>(DEMO_POSTS);
  const [likedPostIds, setLikedPostIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [commentsState, dispatchComments] = React.useReducer(
    commentsReducer,
    DEMO_POSTS,
    createCommentsState
  );

  const pushFeedback = React.useCallback(
    (message: Omit<FeedbackMessage, "id">) => {
      const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFeedback((previous) => [...previous.slice(-2), { id, ...message }]);
    },
    []
  );

  const dismissFeedback = React.useCallback((id: string) => {
    setFeedback((previous) => previous.filter((item) => item.id !== id));
  }, []);

  React.useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoadingCommunity(false);
      return;
    }
    const activeClient: SupabaseClient = client;

    let mounted = true;

    async function loadCommunity(db: SupabaseClient) {
      setLoadingCommunity(true);
      setLoadError(null);

      try {
        const { data: rows, error } = await db
          .from("posts")
          .select("id, title, votes, created_at, author_id")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const dbPosts: PostUI[] = rows
          ? rows.map((row: DBPost) => postFromRow(row))
          : [];

        const combined: PostUI[] = dbPosts.length ? [...dbPosts, ...DEMO_POSTS] : [];
        if (!mounted) return;

        setPosts(combined);
        dispatchComments({ type: "reset", posts: combined });

        if (!dbPosts.length) return;

        const { data: allComments, error: commentsError } = await db
          .from("comments")
          .select("id, post_id, user_name, body, image_url, created_at")
          .in(
            "post_id",
            dbPosts.map((post) => post.id)
          )
          .order("created_at", { ascending: false });

        if (!mounted) return;

        if (commentsError) {
          console.error("load comments failed:", commentsError.message);
          setLoadError("Posts loaded, but comments could not be loaded.");
          return;
        }

        dispatchComments({
          type: "reset",
          posts: combined,
          comments: (allComments ?? []).map((row: CommentRow) => ({
            postId: row.post_id,
            comment: commentFromRow(row),
          })),
        });
      } catch (error) {
        console.error("load community failed:", error);
        if (!mounted) return;

        setPosts(DEMO_POSTS);
        dispatchComments({ type: "reset", posts: DEMO_POSTS });
        setLoadError(
          getErrorMessage(
            error,
            "Could not load latest community posts. Showing demo discussions."
          )
        );
      } finally {
        if (mounted) setLoadingCommunity(false);
      }
    }

    loadCommunity(activeClient);

    return () => {
      mounted = false;
    };
  }, [supabase]);

  React.useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel("comments-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const row = payload.new as CommentRow;
          dispatchComments({
            type: "addComment",
            postId: row.post_id,
            comment: commentFromRow(row),
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [supabase]);

  const filteredPosts = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = normalizedQuery
      ? posts.filter((post) =>
          [
            post.user,
            post.title,
            post.body,
            ...post.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : posts;

    if (sort === "top") {
      return [...base].sort((a, b) => b.votes - a.votes);
    }

    return [...base].sort((a, b) => b.sortTime - a.sortTime);
  }, [posts, query, sort]);

  async function uploadImage(postId: string, file: File): Promise<string | undefined> {
    if (!supabase) return undefined;

    const validationError = validateCommentImage(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()!.toLowerCase()
      : "jpg";
    const key = `${postId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(COMMENT_BUCKET).upload(key, file);

    if (error) {
      console.error("upload failed:", error.message);
      throw new Error(getUploadErrorMessage(error));
    }

    return supabase.storage.from(COMMENT_BUCKET).getPublicUrl(key).data.publicUrl;
  }

  async function handleCreatePost() {
    const text = draft.trim();
    if (!text || creating) return;

    setCreating(true);

    try {
      if (!supabase) {
        const localPost: PostUI = {
          id: `local-${crypto.randomUUID()}`,
          user: "You",
          initials: "YU",
          ...splitPostCopy(text),
          votes: 0,
          time: "just now",
          sortTime: Date.now(),
          tags: inferTags(text),
          commentCount: 0,
          avatarGradient: "linear-gradient(135deg, #1d4ed8 0%, #9333ea 100%)",
        };

        setPosts((previous) => [localPost, ...previous]);
        dispatchComments({
          type: "ensurePost",
          postId: localPost.id,
          initialCount: 0,
        });
        setDraft("");
        return;
      }

      const { data: userResult } = await supabase.auth.getUser();
      const uid = userResult?.user?.id ?? null;

      const { data: row, error } = await supabase
        .from("posts")
        .insert({
          title: text,
          votes: 0,
          author_id: uid,
        })
        .select("id, title, votes, created_at, author_id")
        .single();

      if (error) throw error;

      const newPost = postFromRow(row as DBPost);
      setPosts((previous) => [newPost, ...previous]);
      dispatchComments({
        type: "ensurePost",
        postId: newPost.id,
        initialCount: 0,
      });
      setDraft("");
    } catch (error: any) {
      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Post failed",
        message: getErrorMessage(error, "Could not create post."),
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePost(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target?.fromDB || !supabase) {
      setPosts((previous) => previous.filter((post) => post.id !== postId));
      dispatchComments({ type: "removePost", postId });
      setLikedPostIds((previous) => {
        if (!previous.has(postId)) return previous;
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
      return;
    }

    try {
      await supabase.from("comments").delete().eq("post_id", postId);
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      setPosts((previous) => previous.filter((post) => post.id !== postId));
      dispatchComments({ type: "removePost", postId });
      setLikedPostIds((previous) => {
        if (!previous.has(postId)) return previous;
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
    } catch (error: any) {
      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Delete failed",
        message: getErrorMessage(error, "Could not delete post."),
      });
      throw error;
    }
  }

  async function handleAddComment(postId: string, data: NewComment) {
    const target = posts.find((post) => post.id === postId);

    if (!target?.fromDB || !supabase) {
      const localComment: CommentUI = {
        id: `local-comment-${crypto.randomUUID()}`,
        user: "You",
        text: data.text,
        createdAt: new Date().toISOString(),
      };

      dispatchComments({ type: "addComment", postId, comment: localComment });
      return;
    }

    try {
      const imageUrl = data.file ? await uploadImage(postId, data.file) : undefined;

      const { data: row, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_name: "You",
          body: data.text,
          image_url: imageUrl ?? null,
        })
        .select("id, post_id, user_name, body, image_url, created_at")
        .single();

      if (error) throw error;

      dispatchComments({
        type: "addComment",
        postId,
        comment: commentFromRow(row as CommentRow),
      });
    } catch (error: any) {
      console.error(error);
      throw new Error(getErrorMessage(error, "Could not post comment."));
    }
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    if (commentId.startsWith("local-comment-") || !supabase) {
      dispatchComments({ type: "removeComment", postId, commentId });
      return;
    }

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;

      dispatchComments({ type: "removeComment", postId, commentId });
    } catch (error: any) {
      console.error(error);
      pushFeedback({
        tone: "error",
        title: "Delete failed",
        message: getErrorMessage(error, "Could not delete comment."),
      });
      throw error;
    }
  }

  async function handleToggleLike(postId: string) {
    const target = posts.find((post) => post.id === postId);
    if (!target) return;

    const wasLiked = likedPostIds.has(postId);
    const delta = wasLiked ? -1 : 1;
    const nextVotes = Math.max(0, target.votes + delta);

    setLikedPostIds((previous) => {
      const next = new Set(previous);
      if (wasLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, votes: Math.max(0, post.votes + delta) }
          : post
      )
    );

    if (!target.fromDB || !supabase) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({ votes: nextVotes })
        .eq("id", postId);

      if (error) throw error;
    } catch (error: any) {
      console.error(error);
      setLikedPostIds((previous) => {
        const next = new Set(previous);
        if (wasLiked) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? { ...post, votes: Math.max(0, post.votes - delta) }
            : post
        )
      );
      pushFeedback({
        tone: "error",
        title: "Like was not saved",
        message: getErrorMessage(error, "Could not update like."),
      });
    }
  }

  function requestDeletePost(postId: string) {
    const target = posts.find((post) => post.id === postId);
    setPendingDelete({
      type: "post",
      postId,
      title: "Delete discussion?",
      message: `This will remove "${
        target?.title ?? "this discussion"
      }" and its comments from the community.`,
    });
  }

  function requestDeleteComment(commentId: string, postId: string) {
    setPendingDelete({
      type: "comment",
      commentId,
      postId,
      title: "Delete comment?",
      message: "This comment will be removed from the discussion.",
    });
  }

  async function confirmPendingDelete() {
    const target = pendingDelete;
    if (!target || deleting) return;

    setDeleting(true);

    try {
      if (target.type === "post") {
        await handleDeletePost(target.postId);
      } else {
        await handleDeleteComment(target.commentId, target.postId);
      }

      setPendingDelete(null);
    } catch {
      // The action handler already reports the failure in the feedback area.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main
      id="community-main"
      tabIndex={-1}
      className="ml-[50px] mr-3 box-border min-h-screen overflow-x-hidden bg-black px-3 py-7 text-white sm:mr-0 sm:px-8 sm:py-9 lg:px-10"
    >
      <div
        className="mx-auto min-w-0 max-w-[960px]"
        style={{ width: "min(100%, calc(100vw - 90px))" }}
      >
        <header>
          <h1 className="text-balance text-[28px] font-extrabold leading-tight tracking-normal text-white sm:text-[30px]">
            Community
          </h1>
          <p className="mt-2 max-w-[34rem] text-pretty text-[15px] text-slate-300">
            Connect with fellow investors and share market insights
          </p>
        </header>

        <section
          className={cn(
            "mt-7 rounded-xl bg-[#08090d] p-4 sm:p-6",
            communityStyles.panelBorder
          )}
          aria-busy={creating}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-extrabold text-white">
              YU
            </div>

            <div className="min-w-0 flex-1">
              <label htmlFor="community-draft" className="sr-only">
                Share your investment insights
              </label>
              <textarea
                id="community-draft"
                name="community-draft"
                autoComplete="off"
                disabled={creating}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Share your investment insights…"
                rows={4}
                className={cn(
                  "min-h-[112px] w-full resize-none rounded-lg bg-[#191a20] px-4 py-4 text-[15px] leading-6 text-slate-100 sm:min-h-[98px]",
                  communityStyles.inputBorder,
                  "placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                )}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pl-0 sm:pl-14">
            <button
              type="button"
              className={cn(
                "grid h-10 w-10 touch-manipulation place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200",
                FOCUS_VISIBLE
              )}
              title="Image attachments are available in replies"
              aria-label="Image attachments are available in replies"
            >
              <ImageOutlinedIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleCreatePost}
              disabled={creating || !draft.trim()}
              className={cn(
                "inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 text-sm font-bold text-white transition-colors",
                "hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50",
                FOCUS_VISIBLE
              )}
            >
              <SendRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
              {creating ? "Posting…" : "Post"}
            </button>
          </div>
        </section>

        {!supabase ? (
          <div className="mt-4">
            <CommunityNotice>
              Supabase environment variables are missing, so new posts and
              comments stay local until the page refreshes.
            </CommunityNotice>
          </div>
        ) : null}

        <FeedbackStack items={feedback} onDismiss={dismissFeedback} />

        {loadError ? (
          <div className="mt-4">
            <StatusMessage tone="error" title="Community data did not fully load">
              {loadError}
            </StatusMessage>
          </div>
        ) : null}

        <section className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="community-search" className="sr-only">
              Search discussions
            </label>
            <SearchRoundedIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              sx={{ fontSize: 20 }}
              aria-hidden="true"
            />
            <input
              id="community-search"
              name="community-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search discussions…"
              className={cn(
                "h-[46px] w-full rounded-lg bg-[#191a20] pl-11 pr-4 text-[15px] text-slate-100",
                communityStyles.panelBorder,
                "placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              )}
            />
          </div>

          <div
            className={cn(
              "grid h-[46px] w-full grid-cols-2 rounded-lg bg-[#08090d] p-1 sm:w-[134px]",
              communityStyles.panelBorder
            )}
            role="group"
            aria-label="Sort discussions"
          >
            {(["top", "new"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSort(option)}
                aria-pressed={sort === option}
                className={cn(
                  "touch-manipulation rounded-md text-sm font-bold capitalize transition-colors",
                  sort === option
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                  FOCUS_VISIBLE
                )}
              >
                {option === "top" ? "Top" : "New"}
              </button>
            ))}
          </div>
        </section>

        <section
          className="mt-6 space-y-4"
          aria-label="Community discussions"
          aria-busy={loadingCommunity}
        >
          {loadingCommunity ? (
            <LoadingDiscussions />
          ) : filteredPosts.length ? (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                comments={commentsState.byPost[post.id] ?? []}
                count={commentsState.counts[post.id] ?? post.commentCount}
                liked={likedPostIds.has(post.id)}
                onAddComment={handleAddComment}
                onDeleteComment={requestDeleteComment}
                onDeletePost={
                  post.fromDB || post.id.startsWith("local-")
                    ? requestDeletePost
                    : undefined
                }
                onToggleLike={handleToggleLike}
              />
            ))
          ) : (
            <EmptyState query={query} />
          )}
        </section>
      </div>

      <DeleteConfirmDialog
        pending={pendingDelete}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmPendingDelete}
      />
    </main>
  );
}

export default function CommunityPage() {
  return (
    <>
      <style jsx global>{`
        html,
        body,
        #__next {
          background: #000;
          color-scheme: dark;
          min-height: 100%;
        }

        body {
          overflow-x: hidden;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden bg-black">
        <a href="#community-main" className={communityStyles.skipLink}>
          Skip to community content
        </a>
        <Sidebar />
        <CommunityMain supabase={supabase} />
      </div>
    </>
  );
}
