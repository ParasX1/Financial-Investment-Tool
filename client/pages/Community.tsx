// // app/community/page.tsx  (or pages/community.tsx for Pages Router)
// "use client";

// import * as React from "react";
// import Sidebar from "@/components/sidebar";

// type Post = {
//   id: string;
//   user: string;
//   title: string;
//   votes: number;
//   comments: number;
//   time: string; // e.g. "1d ago"
//   // image?: string; // intentionally unused to avoid broken UI
// };

// const INITIAL_POSTS: Post[] = [
//   {
//     id: "a",
//     user: "user A",
//     title: "Far too many people are pursuing a career in finance",
//     votes: 936,
//     comments: 441,
//     time: "1d ago",
//   },
//   {
//     id: "b",
//     user: "user B",
//     title: "Finance Bro Starterpack",
//     votes: 354,
//     comments: 49,
//     time: "6y ago",
//   },
//   {
//     id: "c",
//     user: "user C",
//     title: "Should have studied finance",
//     votes: 8500,
//     comments: 430,
//     time: "4mo ago",
//   },
//   {
//     id: "d",
//     user: "user D",
//     title: "9 years into my finance career. How to make more money?",
//     votes: 166,
//     comments: 135,
//     time: "1y ago",
//   },
// ];

// function classNames(...xs: (string | false | null | undefined)[]) {
//   return xs.filter(Boolean).join(" ");
// }

// function Avatar({ name }: { name: string }) {
//   const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
//   return (
//     <div
//       aria-hidden
//       className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-sky-500 text-white font-bold"
//       title={name}
//     >
//       {initial}
//     </div>
//   );
// }

// function Stat({ label, value }: { label: string; value: number }) {
//   return (
//     <div className="text-sm text-zinc-300">
//       <span className="font-semibold text-white">{value.toLocaleString()}</span>{" "}
//       {label}
//     </div>
//   );
// }

// function PostCard({ p }: { p: Post }) {
//   return (
//     <article
//       tabIndex={0}
//       className="group rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow transition
//                  hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
//     >
//       <div className="flex items-start gap-4">
//         <Avatar name={p.user} />

//         <div className="min-w-0 flex-1">
//           <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
//             <span>Posted by <span className="text-zinc-300">{p.user}</span></span>
//             <span aria-hidden>·</span>
//             <time>{p.time}</time>
//           </div>

//           <h2 className="text-lg font-semibold leading-snug text-white">
//             {p.title}
//           </h2>

//           <div className="mt-3 flex items-center gap-4">
//             <Stat label="votes" value={p.votes} />
//             <Stat label="comments" value={p.comments} />
//           </div>
//         </div>
//       </div>
//     </article>
//   );
// }

// export default function CommunityPage() {
//   const [q, setQ] = React.useState("");
//   const [sort, setSort] = React.useState<"top" | "new">("top");

//   const filtered = React.useMemo(() => {
//     const base = INITIAL_POSTS.filter(
//       (p) =>
//         p.title.toLowerCase().includes(q.toLowerCase()) ||
//         p.user.toLowerCase().includes(q.toLowerCase())
//     );
//     if (sort === "top") return [...base].sort((a, b) => b.votes - a.votes);
//     return base; // pretend recency; replace with timestamp sort when you add real data
//   }, [q, sort]);

//   return (
//     <div className="flex min-h-screen bg-zinc-950 text-white">
//       {/* Sidebar from your project */}
//       <Sidebar />

//       <main className="mx-auto w-full max-w-5xl p-6">
//         <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//           <h1 className="text-3xl font-bold tracking-tight">Community</h1>

//           <div className="flex w-full max-w-xl items-center gap-2 sm:w-auto">
//             <label className="sr-only" htmlFor="sort">Sort</label>
//             <select
//               id="sort"
//               className="w-28 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
//               value={sort}
//               onChange={(e) => setSort(e.target.value as "top" | "new")}
//             >
//               <option value="top">Top</option>
//               <option value="new">New</option>
//             </select>

//             <div className="relative flex-1 sm:w-64">
//               <label htmlFor="q" className="sr-only">Search posts</label>
//               <input
//                 id="q"
//                 value={q}
//                 onChange={(e) => setQ(e.target.value)}
//                 placeholder="Search…"
//                 className={classNames(
//                   "w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm",
//                   "placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60"
//                 )}
//               />
//             </div>
//           </div>
//         </header>

//         <section className="space-y-4">
//           {filtered.length === 0 ? (
//             <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-8 text-center text-zinc-400">
//               No posts match your search.
//             </div>
//           ) : (
//             filtered.map((p) => <PostCard key={p.id} p={p} />)
//           )}
//         </section>
//       </main>
//     </div>
//   );
// }

// FILE: app/community/page.tsx (App Router)
"use client";
import * as React from "react";
import Sidebar from "@/components/sidebar";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────
type Post = {
  id: string;
  user: string;
  title: string;
  votes: number;
  comments: number; // initial count (static demo)
  time: string;
};

export type NewComment = {
  text: string;
  file?: File | null;
  previewUrl?: string | null; // for local preview
};

export type CommentItem = {
  id: string;
  user: string;
  text: string;
  createdAt: string; // ISO
  imageUrl?: string; // using local Object URL for now
};

// ────────────────────────────────────────────────────────────────────────────────
// Demo data
// ────────────────────────────────────────────────────────────────────────────────
const INITIAL_POSTS: Post[] = [
  {
    id: "a",
    user: "user A",
    title: "Far too many people are pursuing a career in finance",
    votes: 936,
    comments: 441,
    time: "1d ago",
  },
  {
    id: "b",
    user: "user B",
    title: "Finance Bro Starterpack",
    votes: 354,
    comments: 49,
    time: "6y ago",
  },
  {
    id: "c",
    user: "user C",
    title: "Should have studied finance",
    votes: 8500,
    comments: 430,
    time: "4mo ago",
  },
  {
    id: "d",
    user: "user D",
    title: "9 years into my finance career. How to make more money?",
    votes: 166,
    comments: 135,
    time: "1y ago",
  },
];

// ────────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────────
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function avatarInitial(name: string) {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

// ────────────────────────────────────────────────────────────────────────────────
// CommentForm – add a text comment and (optionally) an image
// ────────────────────────────────────────────────────────────────────────────────
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

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFile(f?: File | null) {
    if (!f) {
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit({ text: text.trim(), file, previewUrl });
    // reset form
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
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
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
          disabled={busy || !text.trim()}
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

// ────────────────────────────────────────────────────────────────────────────────
// CommentList – simple, clean list
// ────────────────────────────────────────────────────────────────────────────────
function CommentList({ items }: { items: CommentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
        No comments yet. Be the first!
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-200">
              {avatarInitial(c.user)}
            </div>
            <span className="text-zinc-300">{c.user}</span>
            <span aria-hidden>·</span>
            <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString()}</time>
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

// ────────────────────────────────────────────────────────────────────────────────
// PostCard – now includes comments UI
// ────────────────────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-sm text-zinc-300">
      <span className="font-semibold text-white">{value.toLocaleString()}</span> {label}
    </div>
  );
}

function PostCard({
  p,
  comments,
  onAddComment,
}: {
  p: Post;
  comments: CommentItem[];
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <article
      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow transition hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-sky-500 text-white font-bold">
          {avatarInitial(p.user)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span>
              Posted by <span className="text-zinc-300">{p.user}</span>
            </span>
            <span aria-hidden>·</span>
            <time>{p.time}</time>
          </div>

          <h2 className="text-lg font-semibold leading-snug text-white">{p.title}</h2>

          <div className="mt-3 flex items-center gap-4">
            <Stat label="votes" value={p.votes} />
            <Stat label="comments" value={p.comments + comments.length} />
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
              <CommentList items={comments} />
              <CommentForm
                busy={busy}
                onSubmit={async (data) => {
                  try {
                    setBusy(true);
                    // For now we use a local Object URL for the preview as the stored image URL.
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

// ────────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"top" | "new">("top");

  // Local in-memory comment store: Record<postId, CommentItem[]>
  const [store, setStore] = React.useState<Record<string, CommentItem[]>>({});

  const filtered = React.useMemo(() => {
    const base = INITIAL_POSTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.user.toLowerCase().includes(q.toLowerCase())
    );
    if (sort === "top") return [...base].sort((a, b) => b.votes - a.votes);
    return base; // replace with timestamp sort when connected to real data
  }, [q, sort]);

  async function handleAddComment(postId: string, data: NewComment) {
    const id = Math.random().toString(36).slice(2);
    const item: CommentItem = {
      id,
      user: "You",
      text: data.text,
      createdAt: new Date().toISOString(),
      imageUrl: data.previewUrl ?? undefined,
    };
    setStore((prev) => ({ ...prev, [postId]: [item, ...(prev[postId] ?? [])] }));
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="mx-auto w-full max-w-5xl p-6">
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

        <section className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-8 text-center text-zinc-400">
              No posts match your search.
            </div>
          ) : (
            filtered.map((p) => (
              <PostCard
                key={p.id}
                p={p}
                comments={store[p.id] ?? []}
                onAddComment={handleAddComment}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

