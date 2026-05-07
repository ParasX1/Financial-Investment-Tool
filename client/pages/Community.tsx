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

const now = Date.now();

const DEMO_POSTS: SeedPost[] = [
  {
    id: "demo-quant-queen",
    user: "QuantQueen",
    initials: "QQ",
    title: "Backtesting Results: Momentum + Mean Reversion Hybrid",
    body:
      "Ran a 10-year backtest on a combined momentum and mean reversion strategy. Sharpe ratio of 2.1 with max drawdown under 15%. Details inside...",
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
      "After analyzing the latest earnings report and forward guidance, I believe NVDA's current P/E ratio is sustainable given their AI dominance. Here's my analysis...",
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
    title: `${clean.slice(0, 89).trim()}...`,
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
  const fileInput = React.useRef<HTMLInputElement | null>(null);

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
      return;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    await onSubmit({ text: text.trim(), file, previewUrl });
    setText("");
    handleFile(null);
  }

  return (
    <form
      onSubmit={submit}
      className={cn("rounded-lg bg-[#0d0e13] p-3", communityStyles.softBorder)}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Add to the discussion..."
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
            className="max-h-60 w-full object-contain"
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.currentTarget.files?.[0] ?? null)}
        />
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
            title="Attach image"
            aria-label="Attach image"
          >
            <ImageOutlinedIcon fontSize="small" />
          </button>

          {file ? (
            <button
              type="button"
              onClick={() => handleFile(null)}
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200",
                communityStyles.softBorder
              )}
              title="Remove attachment"
            >
              <span className="truncate">{file.name}</span>
              <CloseRoundedIcon sx={{ fontSize: 15 }} />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy || !text.trim()}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition",
            "hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 16 }} />
          {busy ? "Posting" : "Reply"}
        </button>
      </div>
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
              <span className="truncate font-semibold text-slate-200">{comment.user}</span>
              <span aria-hidden className="text-slate-600">
                *
              </span>
              <time dateTime={comment.createdAt}>{toRelativeTime(comment.createdAt)}</time>
            </div>

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-200"
                title="Delete comment"
                aria-label="Delete comment"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
              </button>
            ) : null}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
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
  onAddComment,
  onDeleteComment,
  onDeletePost,
}: {
  post: PostUI;
  comments: CommentUI[];
  count: number;
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <article
      className={cn(
        "rounded-xl bg-[#07080b] px-5 py-6 transition duration-200 hover:border-[#34384a] sm:px-7",
        communityStyles.panelBorder
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-5">
        <div className="flex items-center gap-3 sm:flex-col sm:items-start">
          <div className="grid h-9 w-9 place-items-center rounded-md text-slate-400">
            <ThumbUpOffAltRoundedIcon sx={{ fontSize: 24 }} />
          </div>
          <div className="min-w-[44px] text-center text-sm font-bold text-white sm:text-left">
            {post.votes.toLocaleString()}
          </div>
        </div>

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
                <span className="font-semibold text-white">{post.user}</span>
                <span aria-hidden className="text-slate-600">
                  *
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <AccessTimeRoundedIcon sx={{ fontSize: 15 }} />
                  {post.time}
                </span>
              </div>
            </div>

            {post.fromDB && onDeletePost ? (
              <button
                type="button"
                onClick={() => onDeletePost(post.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-200"
                title="Delete post"
                aria-label="Delete post"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 19 }} />
              </button>
            ) : null}
          </div>

          <h2 className="mt-3 text-lg font-bold leading-snug text-white">
            {post.title}
          </h2>

          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
            {post.body}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-md bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-300",
                  communityStyles.tagBorder
                )}
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-5 inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-400 transition hover:text-slate-100"
            aria-expanded={open}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 19 }} />
            {count.toLocaleString()} comments
          </button>

          {open ? (
            <div className={cn("mt-5 space-y-4 pt-5", communityStyles.dividerTop)}>
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
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div
      className={cn(
        "rounded-xl bg-[#07080b] px-6 py-12 text-center text-sm text-slate-400",
        communityStyles.panelBorder
      )}
    >
      No discussions match your search.
    </div>
  );
}

function CommunityMain({ supabase }: { supabase: SupabaseClient | null }) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"top" | "new">("top");
  const [draft, setDraft] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [posts, setPosts] = React.useState<PostUI[]>(DEMO_POSTS);
  const [commentsByPost, setCommentsByPost] = React.useState<
    Record<string, CommentUI[]>
  >({});
  const [counts, setCounts] = React.useState<Record<string, number>>(
    Object.fromEntries(DEMO_POSTS.map((post) => [post.id, post.commentCount]))
  );

  React.useEffect(() => {
    const client = supabase;
    if (!client) return;
    const activeClient: SupabaseClient = client;

    let mounted = true;

    async function loadCommunity(db: SupabaseClient) {
      const { data: rows, error } = await db
        .from("posts")
        .select("id, title, votes, created_at, author_id")
        .order("created_at", { ascending: false });

      const dbPosts: PostUI[] =
        !error && rows ? rows.map((row: DBPost) => postFromRow(row)) : [];

      const combined: PostUI[] = [...dbPosts, ...DEMO_POSTS];
      if (!mounted) return;

      setPosts(combined);
      setCounts(
        Object.fromEntries(
          combined.map((post) => [post.id, post.fromDB ? 0 : post.commentCount])
        )
      );
      setCommentsByPost(
        Object.fromEntries(combined.map((post) => [post.id, []]))
      );

      if (!dbPosts.length) return;

      const { data: allComments, error: commentsError } = await db
        .from("comments")
        .select("id, post_id, user_name, body, image_url, created_at")
        .in(
          "post_id",
          dbPosts.map((post) => post.id)
        )
        .order("created_at", { ascending: false });

      if (commentsError || !mounted) {
        if (commentsError) console.error("load comments failed:", commentsError.message);
        return;
      }

      const byPost: Record<string, CommentUI[]> = Object.fromEntries(
        combined.map((post) => [post.id, []])
      );
      const nextCounts: Record<string, number> = Object.fromEntries(
        combined.map((post) => [post.id, post.fromDB ? 0 : post.commentCount])
      );

      (allComments ?? []).forEach((row: CommentRow) => {
        const comment: CommentUI = {
          id: row.id,
          user: row.user_name,
          text: row.body,
          createdAt: row.created_at,
          imageUrl: row.image_url ?? undefined,
        };
        (byPost[row.post_id] ||= []).push(comment);
        nextCounts[row.post_id] = (nextCounts[row.post_id] ?? 0) + 1;
      });

      setCommentsByPost(byPost);
      setCounts(nextCounts);
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
          const comment: CommentUI = {
            id: row.id,
            user: row.user_name,
            text: row.body,
            createdAt: row.created_at,
            imageUrl: row.image_url ?? undefined,
          };

          setCommentsByPost((previous) => {
            const current = previous[row.post_id] ?? [];
            if (current.some((item) => item.id === comment.id)) return previous;

            setCounts((previousCounts) => ({
              ...previousCounts,
              [row.post_id]: (previousCounts[row.post_id] ?? 0) + 1,
            }));

            return {
              ...previous,
              [row.post_id]: [comment, ...current],
            };
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

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()!.toLowerCase()
      : "jpg";
    const key = `${postId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(COMMENT_BUCKET).upload(key, file);

    if (error) {
      console.error("upload failed:", error.message);
      alert(`Upload failed: ${error.message}`);
      return undefined;
    }

    return supabase.storage.from(COMMENT_BUCKET).getPublicUrl(key).data.publicUrl;
  }

  async function handleCreatePost() {
    const text = draft.trim();
    if (!text) return;

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
      setCounts((previous) => ({ ...previous, [localPost.id]: 0 }));
      setCommentsByPost((previous) => ({ ...previous, [localPost.id]: [] }));
      setDraft("");
      return;
    }

    setCreating(true);

    try {
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
      setCounts((previous) => ({ ...previous, [newPost.id]: 0 }));
      setCommentsByPost((previous) => ({ ...previous, [newPost.id]: [] }));
      setDraft("");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Could not create post.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post and its comments?")) return;

    const target = posts.find((post) => post.id === postId);
    if (!target?.fromDB || !supabase) {
      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setCounts((previous) => {
        const next = { ...previous };
        delete next[postId];
        return next;
      });
      setCommentsByPost((previous) => {
        const next = { ...previous };
        delete next[postId];
        return next;
      });
      return;
    }

    try {
      await supabase.from("comments").delete().eq("post_id", postId);
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setCounts((previous) => {
        const next = { ...previous };
        delete next[postId];
        return next;
      });
      setCommentsByPost((previous) => {
        const next = { ...previous };
        delete next[postId];
        return next;
      });
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Could not delete post.");
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

      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: [localComment, ...(previous[postId] ?? [])],
      }));
      setCounts((previous) => ({ ...previous, [postId]: (previous[postId] ?? 0) + 1 }));
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

      const comment: CommentUI = {
        id: row.id,
        user: row.user_name,
        text: row.body,
        createdAt: row.created_at,
        imageUrl: row.image_url ?? undefined,
      };

      setCommentsByPost((previous) => {
        const current = previous[postId] ?? [];
        if (current.some((item) => item.id === comment.id)) return previous;

        return {
          ...previous,
          [postId]: [comment, ...current],
        };
      });
      setCounts((previous) => ({ ...previous, [postId]: (previous[postId] ?? 0) + 1 }));
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Could not post comment.");
    }
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    if (commentId.startsWith("local-comment-") || !supabase) {
      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: (previous[postId] ?? []).filter((comment) => comment.id !== commentId),
      }));
      setCounts((previous) => ({
        ...previous,
        [postId]: Math.max(0, (previous[postId] ?? 1) - 1),
      }));
      return;
    }

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;

      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: (previous[postId] ?? []).filter((comment) => comment.id !== commentId),
      }));
      setCounts((previous) => ({
        ...previous,
        [postId]: Math.max(0, (previous[postId] ?? 1) - 1),
      }));
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Could not delete comment.");
    }
  }

  return (
    <main
      className="ml-[50px] min-h-screen bg-black px-4 py-9 text-white sm:px-8 lg:px-10"
      style={{ width: "calc(100% - 50px)" }}
    >
      <div
        className="mx-auto w-full max-w-[960px]"
        style={{ maxWidth: "min(960px, calc(100vw - 82px))" }}
      >
        <header>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-normal text-white">
            Community
          </h1>
          <p className="mt-2 text-[15px] text-slate-300">
            Connect with fellow investors and share market insights
          </p>
        </header>

        <section
          className={cn(
            "mt-7 rounded-xl bg-[#08090d] p-5 sm:p-6",
            communityStyles.panelBorder
          )}
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
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Share your investment insights..."
                rows={4}
                className={cn(
                  "min-h-[98px] w-full resize-none rounded-lg bg-[#191a20] px-4 py-4 text-[15px] leading-6 text-slate-100",
                  communityStyles.inputBorder,
                  "placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                )}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 pl-0 sm:pl-14">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
              title="Image attachments are available in replies"
              aria-label="Image attachments are available in replies"
            >
              <ImageOutlinedIcon />
            </button>

            <button
              type="button"
              onClick={handleCreatePost}
              disabled={creating || !draft.trim()}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 text-sm font-bold text-white transition",
                "hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <SendRoundedIcon sx={{ fontSize: 17 }} />
              {creating ? "Posting" : "Post"}
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

        <section className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="community-search" className="sr-only">
              Search discussions
            </label>
            <SearchRoundedIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              sx={{ fontSize: 20 }}
            />
            <input
              id="community-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search discussions..."
              className={cn(
                "h-[46px] w-full rounded-lg bg-[#191a20] pl-11 pr-4 text-[15px] text-slate-100",
                communityStyles.panelBorder,
                "placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              )}
            />
          </div>

          <div
            className={cn(
              "grid h-[46px] grid-cols-2 rounded-lg bg-[#08090d] p-1 sm:w-[134px]",
              communityStyles.panelBorder
            )}
          >
            {(["top", "new"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSort(option)}
                className={cn(
                  "rounded-md text-sm font-bold capitalize transition",
                  sort === option
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {filteredPosts.length ? (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                comments={commentsByPost[post.id] ?? []}
                count={counts[post.id] ?? post.commentCount}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                onDeletePost={post.fromDB || post.id.startsWith("local-") ? handleDeletePost : undefined}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
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
        }
      `}</style>
      <div className="min-h-screen bg-black">
        <Sidebar />
        <CommunityMain supabase={supabase} />
      </div>
    </>
  );
}
