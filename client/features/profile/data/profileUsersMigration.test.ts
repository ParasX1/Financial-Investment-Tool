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
    "20260717090000_secure_profile_users.sql",
  ),
  "utf8",
).toLowerCase();

describe("profile Users migration contract", () => {
  it("removes public row access and limits reads to the authenticated owner", () => {
    expect(migration).toContain(
      'drop policy if exists "public profiles are viewable by everyone." on public."users"',
    );
    expect(migration).toContain('on public."users" for select');
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("(select auth.uid()) = id");
    expect(migration).not.toContain("using (true)");
  });

  it("keeps row creation trigger-owned and protects both sides of updates", () => {
    expect(migration).not.toContain(
      'create policy "users can insert their own profile."',
    );
    expect(migration).toContain('on public."users" for update');
    expect(migration).toContain("using ((select auth.uid()) = id)");
    expect(migration).toContain("with check ((select auth.uid()) = id)");
  });

  it("revokes anonymous table privileges without granting them back", () => {
    expect(migration).toContain(
      'revoke all on table public."users" from public, anon, authenticated',
    );
    expect(migration).toContain(
      'grant select on table public."users" to authenticated',
    );
    expect(migration).not.toMatch(/grant\s+insert[^;]+public\."users"/);
    expect(migration).toContain(
      "grant update (first_name, last_name, handle, phone, avatar_path, avatar_url)",
    );
    expect(migration).not.toMatch(/grant[^;]+public\."users"[^;]+to anon/);
  });

  it("removes broad avatar listing and public trigger-function execution", () => {
    expect(migration).toContain(
      'alter table public."users" add column if not exists avatar_path text',
    );
    expect(migration).toContain(
      'drop policy if exists "avatar images are publicly readable." on storage.objects',
    );
    expect(migration).toContain("owner_id = (select auth.uid())::text");
    expect(migration).toContain(
      "name = (select auth.uid())::text || '/avatar'",
    );
    expect(migration).toContain(
      'drop policy if exists "users can upload their own avatar images." on storage.objects',
    );
    expect(migration).toContain(
      "revoke execute on function public.handle_new_user() from public, anon, authenticated",
    );
  });

  it("rebuilds the auth trigger with a fixed search path and trusted email", () => {
    expect(migration).toContain(
      "create or replace function public.handle_new_user() returns trigger",
    );
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('insert into public."users"');
    expect(migration).toContain("new.email");
    expect(migration).not.toContain("new.raw_user_meta_data ->> 'email'");
    expect(migration).toContain("from auth.users");
    expect(migration).toContain("on conflict (id) do nothing");
  });
});
