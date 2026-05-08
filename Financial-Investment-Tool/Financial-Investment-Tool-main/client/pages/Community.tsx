"use client";

import * as React from "react";
import Sidebar from "@/components/sidebar";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ────────────────────────────────────────────────────────────────────────────
   Supabase init (accepts NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_ANON)
──────────────────────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */
type SeedPost = { id: string; user: string; title: string; votes: number; time: string };
type DBPost = { id: string; title: string; votes: number; created_at: string; author_id: string | null };
type PostUI = { id: string; user: string; title: string; votes: number; time: string; fromDB?: boolean };

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

type NewComment = { text: string; file?: File | null; previewUrl?: string | null };

/* ────────────────────────────────────────────────────────────────────────────
   Seeded demo posts (display only)
──────────────────────────────────────────────────────────────────────────── */
const DEMO_POSTS: SeedPost[] = [
  { id: "a", user: "user A", title: "Far too many people are pursuing a career in finance", votes: 936, time: "1d ago" },
  { id: "b", user: "user B", title: "Finance Bro Starterpack", votes: 354, time: "6y ago" },
  { id: "c", user: "user C", title: "Should have studied finance", votes: 8500, time: "4mo ago" },
  { id: "d", user: "user D", title: "9 years into my finance career. How to make more money?", votes: 166, time: "1y ago" },
];

/* ────────────────────────────────────────────────────────────────────────────
   Small UI helpers
──────────────────────────────────────────────────────────────────────────── */
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function initials(name: string) {
  return (name?.trim()?.split(/\s+/).map(w => w[0]).slice(0, 2).join("") || "?").toUpperCase();
}

/* ────────────────────────────────────────────────────────────────────────────
   Comment form
──────────────────────────────────────────────────────────────────────────── */
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
  const [dragOver, setDragOver] = React.useState(false);

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  function handleFile(f?: File | null) {
    if (!f) {
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit({ text: text.trim(), file, previewUrl });
    setText("");
    handleFile(null);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment…"
        rows={3}
        className={cn(
          "w-full rounded-md border border-zinc-800 bg-zinc-900/80 p-3 text-sm",
          "placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
        )}
      />
      <div
        className={cn(
          "rounded-md border border-dashed p-3 text-sm",
          dragOver ? "border-fuchsia-500/70 bg-fuchsia-500/5" : "border-zinc-800 bg-zinc-900/40"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.currentTarget.files?.[0] ?? null)}
            />
            <span className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700">Upload image</span>
            <span className="text-zinc-400">(optional)</span>
          </label>
          {previewUrl ? (
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="text-xs text-zinc-300 underline hover:text-white"
            >
              Remove image
            </button>
          ) : null}
        </div>
        {previewUrl ? (
          <div className="mt-3 overflow-hidden rounded-md border border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Selected" className="max-h-60 w-full object-contain" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white",
            "disabled:cursor-not-allowed disabled:opacity-60 hover:bg-fuchsia-500"
          )}
        >
          {busy ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Comment list (with delete)
──────────────────────────────────────────────────────────────────────────── */
function CommentList({
  items,
  onDelete,
}: {
  items: CommentUI[];
  onDelete?: (id: string) => Promise<void> | void;
}) {
  if (!items.length)
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
        No comments yet. Be the first!
      </div>
    );
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-200">
                {initials(c.user)}
              </div>
              <span className="text-zinc-300">{c.user}</span>
              <span aria-hidden>·</span>
              <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString()}</time>
            </div>
            {onDelete ? (
              <button
                className="text-xs text-zinc-400 hover:text-rose-300"
                onClick={() => onDelete(c.id)}
                title="Delete comment"
              >
                Delete
              </button>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-100">{c.text}</p>
          {c.imageUrl ? (
            <div className="mt-2 overflow-hidden rounded-md border border-zinc-800 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt="Comment attachment" className="max-h-80 w-full object-contain" />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   A single post card
──────────────────────────────────────────────────────────────────────────── */
function PostCard({
  p,
  comments,
  count,
  onAddComment,
  onDeleteComment,
  onDeletePost,
}: {
  p: PostUI;
  comments: CommentUI[];
  count: number;
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow transition hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-sky-500 text-white font-bold">
          {initials(p.user)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span>
              Posted by <span className="text-zinc-300">{p.user}</span>
            </span>
            <span aria-hidden>·</span>
            <time>{p.time}</time>
            {p.fromDB && onDeletePost ? (
              <>
                <span aria-hidden>·</span>
                <button
                  onClick={() => onDeletePost(p.id)}
                  className="text-rose-300 hover:text-rose-200"
                  title="Delete post"
                >
                  Delete post
                </button>
              </>
            ) : null}
          </div>

          <h2 className="text-lg font-semibold leading-snug text-white">{p.title}</h2>

          <div className="mt-3 flex items-center gap-4 text-sm text-zinc-300">
            <span>
              <span className="font-semibold text-white">{p.votes.toLocaleString()}</span> votes
            </span>
            <span>
              <span className="font-semibold text-white">{count.toLocaleString()}</span> comments
            </span>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-sm text-fuchsia-400 underline-offset-2 hover:underline"
            >
              {open ? "Hide comments" : `View/Add comments (${comments.length})`}
            </button>
          </div>

          {open ? (
            <div className="mt-4 space-y-4">
              <CommentList
                items={comments}
                onDelete={(cid) => onDeleteComment(cid, p.id)}
              />
              <CommentForm
                busy={busy}
                onSubmit={async (data) => {
                  try {
                    setBusy(true);
                    await onAddComment(p.id, data);
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

/* ────────────────────────────────────────────────────────────────────────────
   Cards for env-missing and main (hooks-inside)
──────────────────────────────────────────────────────────────────────────── */
function EnvMissingCard() {
  return (
    <>
      <h1 className="mb-3 text-3xl font-bold tracking-tight">Community</h1>
      <div className="rounded-md border border-red-900/40 bg-red-900/20 p-4 text-sm text-red-200">
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> <em>or</em>{" "}
        <code>NEXT_PUBLIC_ANON</code> in <code>client/.env.local</code>, then restart{" "}
        <code>npm run dev</code>.
      </div>
    </>
  );
}

function CommunityMain({ supabase }: { supabase: SupabaseClient }) {
  // ── State ───────────────────────────────────────────────────────────────
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"top" | "new">("top");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const [posts, setPosts] = React.useState<PostUI[]>([]);
  const [commentsByPost, setCommentsByPost] = React.useState<Record<string, CommentUI[]>>({});
  const [counts, setCounts] = React.useState<Record<string, number>>({});

  // ── Load DB posts + comments ────────────────────────────────────────────
  React.useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase
        .from("posts")
        .select("id, title, votes, created_at, author_id")
        .order("created_at", { ascending: false });

      const dbPosts: PostUI[] =
        !error && rows
          ? rows.map((r: DBPost) => ({
              id: r.id,
              user: r.author_id ? "You" : "Guest",
              title: r.title,
              votes: r.votes ?? 0,
              time: new Date(r.created_at).toLocaleString(),
              fromDB: true,
            }))
          : [];

      const combined: PostUI[] = [
        ...dbPosts,
        ...DEMO_POSTS.map((p) => ({ ...p, fromDB: false } as PostUI)),
      ];
      setPosts(combined);

      const allIds = combined.map((p) => p.id);
      const { data: allComments, error: cErr } = await supabase
        .from("comments")
        .select("id, post_id, user_name, body, image_url, created_at")
        .in("post_id", allIds)
        .order("created_at", { ascending: false });

      if (cErr) {
        console.error("load comments failed:", cErr.message);
        return;
      }

      const byPost: Record<string, CommentUI[]> = {};
      const cts: Record<string, number> = {};
      for (const id of allIds) {
        byPost[id] = [];
        cts[id] = 0;
      }
      (allComments ?? []).forEach((r: CommentRow) => {
        const it: CommentUI = {
          id: r.id,
          user: r.user_name,
          text: r.body,
          createdAt: r.created_at,
          imageUrl: r.image_url ?? undefined,
        };
        (byPost[r.post_id] ||= []).push(it);
        cts[r.post_id] = (cts[r.post_id] ?? 0) + 1;
      });
      setCommentsByPost(byPost);
      setCounts(cts);
    })();
  }, [supabase]);

  // ── Realtime comments inserts ───────────────────────────────────────────
  React.useEffect(() => {
    const ch = supabase
      .channel("comments-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const r = payload.new as CommentRow;
          const it: CommentUI = {
            id: r.id,
            user: r.user_name,
            text: r.body,
            createdAt: r.created_at,
            imageUrl: r.image_url ?? undefined,
          };
          setCommentsByPost((prev) => ({
            ...prev,
            [r.post_id]: [it, ...(prev[r.post_id] ?? [])],
          }));
          setCounts((prev) => ({
            ...prev,
            [r.post_id]: (prev[r.post_id] ?? 0) + 1,
          }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const filteredPosts = React.useMemo(() => {
    const base = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.user.toLowerCase().includes(q.toLowerCase())
    );
    if (sort === "top") return [...base].sort((a, b) => b.votes - a.votes);
    return base;
  }, [posts, q, sort]);

  async function uploadImage(postId: string, file: File): Promise<string | undefined> {
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    const key = `${postId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(COMMENT_BUCKET).upload(key, file);
    if (error) {
      console.error("upload failed:", error.message);
      alert(`Upload failed: ${error.message}`);
      return undefined;
    }
    return supabase.storage.from(COMMENT_BUCKET).getPublicUrl(key).data.publicUrl;
  }

  // ── Create / Delete post ────────────────────────────────────────────────
  async function handleCreatePost() {
    if (!draftTitle.trim()) return;
    setCreating(true);
    try {
      const { data: uRes } = await supabase.auth.getUser();
      const uid = uRes?.user?.id ?? null;

      const { data: row, error } = await supabase
        .from("posts")
        .insert({
          title: draftTitle.trim(),
          votes: 0,
          author_id: uid,
        })
        .select("id, title, votes, created_at, author_id")
        .single();

      if (error) throw error;

      const newUI: PostUI = {
        id: row.id,
        title: row.title,
        votes: row.votes ?? 0,
        time: new Date(row.created_at).toLocaleString(),
        user: row.author_id ? "You" : "Guest",
        fromDB: true,
      };
      setPosts((prev) => [newUI, ...prev]);
      setCounts((prev) => ({ ...prev, [row.id]: 0 }));
      setCommentsByPost((prev) => ({ ...prev, [row.id]: [] }));
      setDraftTitle("");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not create post.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post and its comments?")) return;
    try {
      await supabase.from("comments").delete().eq("post_id", postId);
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));

      setCounts((prev) => {
        const copy = { ...prev };
        delete copy[postId];
        return copy;
      });
      setCommentsByPost((prev) => {
        const copy = { ...prev };
        delete copy[postId];
        return copy;
      });
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not delete post.");
    }
  }

  // ── Add / Delete comment ────────────────────────────────────────────────
  async function handleAddComment(postId: string, data: NewComment) {
    try {
      let imageUrl: string | undefined;
      if (data.file) imageUrl = await uploadImage(postId, data.file);

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

      const it: CommentUI = {
        id: row.id,
        user: row.user_name,
        text: row.body,
        createdAt: row.created_at,
        imageUrl: row.image_url ?? undefined,
      };
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [it, ...(prev[postId] ?? [])],
      }));
      setCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not post comment.");
    }
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
      }));
      setCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 1) - 1) }));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not delete comment.");
    }
  }

  // ── Render (main content) ───────────────────────────────────────────────
  return (
    <>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>

        <div className="flex w-full max-w-xl items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="sort">Sort</label>
          <select
            id="sort"
            className="w-28 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as "top" | "new")}
          >
            <option value="top">Top</option>
            <option value="new">New</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <label htmlFor="q" className="sr-only">Search posts</label>
            <input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className={cn(
                "w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm",
                "placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
              )}
            />
          </div>
        </div>
      </header>

      {/* Create a new post (DB only) */}
      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Create a new post</h2>
        <div className="flex gap-2">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Post title…"
            className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
          />
          <button
            className="rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-fuchsia-500"
            onClick={handleCreatePost}
            disabled={creating || !draftTitle.trim()}
          >
            {creating ? "Posting…" : "Post"}
          </button>
        </div>
      </section>

      {/* Posts list */}
      <section className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-8 text-center text-zinc-400">
            No posts yet.
          </div>
        ) : (
          filteredPosts.map((p) => (
            <PostCard
              key={p.id}
              p={p}
              comments={commentsByPost[p.id] ?? []}
              count={counts[p.id] ?? 0}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onDeletePost={p.fromDB ? handleDeletePost : undefined}
            />
          ))
        )}
      </section>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Outer page: layout + conditional render (no hooks here)
──────────────────────────────────────────────────────────────────────────── */
export default function CommunityPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <Sidebar />
      <main className="mx-auto w-full max-w-5xl p-6">
        {!supabase ? <EnvMissingCard /> : <CommunityMain supabase={supabase} />}
      </main>
    </div>
  );
}
