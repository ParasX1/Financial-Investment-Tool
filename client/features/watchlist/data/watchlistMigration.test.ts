import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const migration = readFileSync(
  join(
    process.cwd(),
    "..",
    "supabase",
    "migrations",
    "20260714173009_watchlist_research_queue.sql",
  ),
  "utf8",
);

describe("watchlist Supabase migration contract", () => {
  it("protects each CRUD operation with authenticated ownership policies", () => {
    expect(migration).toContain(
      "alter table public.user_watchlist enable row level security",
    );
    expect(migration.match(/to authenticated/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration).toContain("for select");
    expect(migration).toContain("for insert");
    expect(migration).toContain("for update");
    expect(migration).toContain("for delete");
    expect(migration).toContain("(select auth.uid()) = user_id");
  });

  it("uses atomic invoker RPCs for reordering and compacting after removal", () => {
    expect(migration).toContain(
      "function public.reorder_watchlist(ordered_symbols text[])",
    );
    expect(migration).toContain(
      "function public.remove_watchlist_item(item_symbol text)",
    );
    expect(migration.match(/security invoker/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("set position = position - 1");
    expect(migration).toContain("unique (user_id, position)");
  });

  it("does not grant anonymous access to the table or mutation RPCs", () => {
    expect(migration).toContain("revoke all on table public.user_watchlist");
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(
      /grant .*user_watchlist[\s\S]*\bto anon\b/i,
    );
    expect(migration).toContain("from public, anon");
  });

  it("explicitly exposes the protected table and RPCs to authenticated clients", () => {
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.user_watchlist",
    );
    expect(migration).toContain("to authenticated, service_role");
    expect(migration).toMatch(
      /grant execute on function public\.reorder_watchlist\(text\[\]\)\s+to authenticated;/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.remove_watchlist_item\(text\)\s+to authenticated;/,
    );
  });

  it("reconciles normalized duplicates and position gaps before constraints", () => {
    const cleanupIndex = migration.indexOf("delete from public.user_watchlist");
    const normalizeIndex = migration.search(
      /set\s+symbol = upper\(btrim\(symbol\)\)/,
    );
    const constraintIndex = migration.indexOf("user_watchlist_symbol_check");

    expect(migration).toContain("row_number() over");
    expect(migration).toContain("partition by user_id, upper(btrim(symbol))");
    expect(migration).toContain("set position = ranked.position");
    expect(cleanupIndex).toBeGreaterThanOrEqual(0);
    expect(normalizeIndex).toBeGreaterThan(cleanupIndex);
    expect(constraintIndex).toBeGreaterThan(normalizeIndex);
  });
});
