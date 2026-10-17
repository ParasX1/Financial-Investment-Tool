import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const migration = readFileSync(
  join(
    process.cwd(),
    "..",
    "supabase",
    "migrations",
    "20260718131804_community_research_loop.sql",
  ),
  "utf8",
).toLowerCase();

describe("Community research loop migration contract", () => {
  it("stores explicit author context without granting generated fields", () => {
    expect(migration).toContain("add column if not exists post_type text");
    expect(migration).toContain("add column if not exists time_frame text");
    expect(migration).toContain("add column if not exists symbol text");
    expect(migration).toContain("add column if not exists source_url text");
    expect(migration).toContain("posts_post_type_check");
    expect(migration).toContain("posts_time_frame_check");
    expect(migration).toContain("posts_symbol_check");
    expect(migration).toContain("posts_source_url_check");
    expect(migration).toMatch(
      /grant insert \(\s*title, body, tags, image_url, image_path, author_id,\s*post_type, time_frame, symbol, source_url\s*\)\s+on table public\.posts to authenticated/,
    );
    expect(migration).not.toMatch(/grant insert \([^)]*votes[^)]*\)/);
    expect(migration).not.toMatch(/grant insert \([^)]*created_at[^)]*\)/);
  });

  it("keeps saved posts private and separate from likes", () => {
    expect(migration).toContain("create table if not exists public.post_saves");
    expect(migration).toContain("primary key (user_id, post_id)");
    expect(migration).toContain(
      "alter table public.post_saves enable row level security",
    );
    expect(migration).toMatch(/post_saves[\s\S]*for select\s+to authenticated/);
    expect(migration).toMatch(/post_saves[\s\S]*for insert\s+to authenticated/);
    expect(migration).toMatch(/post_saves[\s\S]*for delete\s+to authenticated/);
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain(
      "grant insert (post_id) on table public.post_saves to authenticated",
    );
    expect(migration).not.toMatch(/grant[^;]*post_saves[^;]*\bto anon\b/);
  });

  it("creates a real, private moderation queue with minimal client grants", () => {
    expect(migration).toContain("create table if not exists public.post_reports");
    expect(migration).toContain("unique (reporter_id, post_id)");
    expect(migration).toContain("post_reports_reason_check");
    expect(migration).toContain("post_reports_status_check");
    expect(migration).toContain(
      "alter table public.post_reports enable row level security",
    );
    expect(migration).toMatch(/post_reports[\s\S]*for select\s+to authenticated/);
    expect(migration).toMatch(/post_reports[\s\S]*for insert\s+to authenticated/);
    expect(migration).not.toMatch(/post_reports[\s\S]*for (?:update|delete)\s+to authenticated/);
    expect(migration).toContain(
      "grant insert (post_id, reason, details) on table public.post_reports to authenticated",
    );
    expect(migration).not.toMatch(/grant[^;]*post_reports[^;]*\bto anon\b/);
  });

  it("adds foreign-key indexes and optimizes the existing like policy", () => {
    expect(migration).toContain("post_saves_post_id_idx");
    expect(migration).toContain("post_reports_post_id_idx");
    expect(migration).toContain("post_likes_user_id_idx");
    expect(migration).toContain(
      'drop policy if exists "community likes are user-readable" on public.post_likes',
    );
    expect(migration).toMatch(
      /create policy "community likes are user-readable"[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/,
    );
  });
});
