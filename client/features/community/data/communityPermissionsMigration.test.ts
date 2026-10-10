import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const migration = readFileSync(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "supabase",
    "migrations",
    "20260717110000_harden_community_feed_permissions.sql",
  ),
  "utf8",
).toLowerCase();

describe("Community feed permission migration contract", () => {
  it("removes broad table capabilities before granting the minimal feed API", () => {
    expect(migration).toContain(
      "revoke all on table public.posts from public, anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.comments from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select on table public.posts, public.comments to anon",
    );
    expect(migration).toContain(
      "grant select, delete on table public.posts, public.comments to authenticated",
    );
    expect(migration).toMatch(
      /grant insert \(title, body, tags, image_url, image_path, author_id\)\s+on table public\.posts to authenticated/,
    );
    expect(migration).toMatch(
      /grant insert \(post_id, body, image_url, image_path, author_id\)\s+on table public\.comments to authenticated/,
    );
    expect(migration).not.toMatch(
      /grant\s+(?:select,\s*)?insert(?:,\s*delete)?\s+on table public\.(?:posts|comments)/,
    );
    expect(migration).not.toMatch(/grant insert \([^)]*votes[^)]*\)/);
    expect(migration).not.toMatch(/grant insert \([^)]*created_at[^)]*\)/);
    expect(migration).not.toMatch(/grant insert \([^)]*user_name[^)]*\)/);
    expect(migration).not.toMatch(
      /grant[^;]*truncate[^;]*(anon|authenticated)/,
    );
  });

  it("keeps destructive policies authenticated and removes anonymous definer access", () => {
    expect(migration).toContain(
      'create policy "community post authors can delete"',
    );
    expect(migration).toMatch(/for\s+delete\s+to\s+authenticated/);
    expect(migration).toContain(
      "revoke execute on function public.like_community_post(uuid) from public, anon",
    );
    expect(migration).toContain(
      "revoke execute on function public.unlike_community_post(uuid) from public, anon",
    );
  });

  it("removes the storage listing policy for the public image bucket", () => {
    expect(migration).toContain(
      'drop policy if exists "community comment images are readable" on storage.objects',
    );
    expect(migration).not.toContain(
      'create policy "community comment images are readable"',
    );
  });
});
