import { describe, expect, it } from "@jest/globals";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
);

const readMigration = (suffix: string) => {
  const matches = readdirSync(migrationsDirectory).filter((fileName) =>
    fileName.endsWith(suffix),
  );

  expect(matches).toHaveLength(1);
  return readFileSync(join(migrationsDirectory, matches[0]), "utf8");
};

describe("Portfolio preferences database contract", () => {
  it("versions private preferences with least-privilege owner-only RLS", () => {
    const migration = readMigration(
      "_create_portfolio_preferences.sql",
    ).toLowerCase();

    expect(migration).toContain(
      "create table if not exists public.portfolio_prefs",
    );
    expect(migration).toContain("user_id uuid primary key");
    expect(migration).toContain("references auth.users(id) on delete cascade");
    expect(migration).toMatch(
      /tags\s+text\[\][^,;]*default\s+'\{\}'::text\[\]/,
    );
    expect(migration).toMatch(
      /updated_at\s+(?:timestamptz|timestamp with time zone)/,
    );
    expect(migration).toContain(
      "existing public.portfolio_prefs rows require a non-null user_id",
    );
    expect(migration).toContain(
      "alter table public.portfolio_prefs enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.portfolio_prefs from anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update on table public.portfolio_prefs to authenticated",
    );
    expect(migration).not.toMatch(/\bgrant\b[^;]*\bdelete\b/);
    expect(migration.match(/\bcreate policy\b/g)).toHaveLength(3);
    expect(migration).toContain('create policy "portfolio_prefs_select_own"');
    expect(migration).toContain('create policy "portfolio_prefs_insert_own"');
    expect(migration).toContain('create policy "portfolio_prefs_update_own"');
    expect(migration).toContain("for select");
    expect(migration).toContain("for insert");
    expect(migration).toContain("for update");
    expect(migration).not.toContain("for all");
    expect(migration).not.toContain("for delete");
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(
      4,
    );
  });
});
