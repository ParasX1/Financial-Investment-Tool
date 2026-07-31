import { describe, expect, it } from "@jest/globals";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDirectory = join(
  __dirname,
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

describe("Supabase schema health protections", () => {
  it("uses init-plan friendly owner checks for profile writes", () => {
    const migration = readMigration(
      "_improve_profile_rls_and_community_indexes.sql",
    ).toLowerCase();

    expect(migration.match(/\(select auth\.uid\(\)\) = id/g)).toHaveLength(3);
    expect(migration).toContain("for insert\n  to authenticated");
    expect(migration).toContain("for update\n  to authenticated");
  });

  it("indexes Community foreign keys used by joins and cascading deletes", () => {
    const migration = readMigration(
      "_improve_profile_rls_and_community_indexes.sql",
    ).toLowerCase();

    expect(migration).toContain(
      "create index if not exists comments_author_id_idx",
    );
    expect(migration).toContain(
      "create index if not exists comments_post_id_idx",
    );
    expect(migration).toContain(
      "create index if not exists posts_author_id_idx",
    );
  });

  it("keeps atomic Community like RPCs restricted to signed-in users", () => {
    const migration = readMigration(
      "_harden_community_feed_permissions.sql",
    ).toLowerCase();

    expect(migration).toContain(
      "revoke execute on function public.like_community_post(uuid) from public, anon",
    );
    expect(migration).toContain(
      "revoke execute on function public.unlike_community_post(uuid) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.like_community_post(uuid) to authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.unlike_community_post(uuid) to authenticated",
    );
  });
});
