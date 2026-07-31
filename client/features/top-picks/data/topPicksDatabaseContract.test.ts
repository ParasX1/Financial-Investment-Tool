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

describe("Top Picks database contract", () => {
  it("versions private preferences with constrained values and owner-only RLS", () => {
    const migration = readMigration(
      "_create_top_picks_preferences.sql",
    ).toLowerCase();

    expect(migration).toContain("create table public.top_picks_prefs");
    expect(migration).toContain("user_id uuid primary key");
    expect(migration).toContain(
      "alter table public.top_picks_prefs enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.top_picks_prefs from anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update on table public.top_picks_prefs to authenticated",
    );
    expect(migration).not.toMatch(/\bgrant\b[^;]*\bdelete\b/);
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(
      4,
    );
    expect(migration).toContain("check (page_size in (10, 25, 50, 100))");
  });

  it("seeds the established Australia-first equity universe idempotently", () => {
    const migration = readMigration("_seed_top_picks_universe.sql");

    [
      "ANZ.AX",
      "BHP.AX",
      "CBA.AX",
      "CSL.AX",
      "MQG.AX",
      "NAB.AX",
      "RIO.AX",
      "TLS.AX",
      "WBC.AX",
      "WES.AX",
      "WOW.AX",
      "XRO.AX",
    ].forEach((symbol) => expect(migration).toContain(`'${symbol}'`));

    expect(migration).toContain("where not exists");
    expect(migration).toContain(
      "upper(btrim(existing.symbol)) = universe.symbol",
    );
  });
});
