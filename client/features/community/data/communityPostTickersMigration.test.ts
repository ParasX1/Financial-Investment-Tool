import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../../../supabase/migrations/20260719030238_community_post_tickers.sql",
  ),
  "utf8",
);

describe("Community post tickers migration", () => {
  it("stores at most four ordered, unique tickers and backfills the legacy primary symbol", () => {
    expect(migration).toContain("create table public.post_tickers");
    expect(migration).toMatch(/position smallint not null/);
    expect(migration).toMatch(/position between 0 and 3/);
    expect(migration).toMatch(/primary key \(post_id, symbol\)/);
    expect(migration).toMatch(/unique \(post_id, position\)/);
    expect(migration).toMatch(/select id, symbol, 0\s+from public\.posts/s);
    expect(migration).toContain("create index post_tickers_symbol_idx");
  });

  it("exposes public reads but lets only the post author add ticker rows", () => {
    expect(migration).toContain(
      "alter table public.post_tickers enable row level security",
    );
    expect(migration).toMatch(
      /for select\s+to anon, authenticated\s+using \(true\)/s,
    );
    expect(migration).toMatch(
      /for insert\s+to authenticated\s+with check \([\s\S]*auth\.uid\(\)[\s\S]*posts\.author_id/s,
    );
    expect(migration).toMatch(
      /grant insert \(post_id, symbol, position\)\s+on table public\.post_tickers to authenticated/s,
    );
    expect(migration).not.toMatch(/grant (?:all|update|delete).*to anon/i);
  });
});
