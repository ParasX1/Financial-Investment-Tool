import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../../../supabase/migrations/20260719053615_atomic_community_post_tickers.sql",
  ),
  "utf8",
);

describe("Community atomic post creation migration", () => {
  it("writes the post and its ordered tickers in one invoker transaction", () => {
    expect(migration).toContain(
      "create or replace function public.create_community_post_with_tickers",
    );
    expect(migration).toMatch(/returns setof public\.posts/);
    expect(migration).toMatch(/security invoker/);
    expect(migration).toMatch(/insert into public\.posts[\s\S]*returning \*/);
    expect(migration).toMatch(/insert into public\.post_tickers/);
    expect(migration).toMatch(/with ordinality/);
  });

  it("enforces normalized unique max-four tickers and minimal RPC access", () => {
    expect(migration).toMatch(/cardinality\(v_tickers\) > 4/);
    expect(migration).toMatch(/count\(distinct ticker\)/);
    expect(migration).toMatch(/symbol,[\s\S]*v_tickers\[1\]/);
    expect(migration).toMatch(
      /create constraint trigger post_tickers_primary_consistency[\s\S]*deferrable initially deferred/,
    );
    expect(migration).toMatch(
      /ticker\.position = 0[\s\S]*ticker\.symbol = post\.symbol/,
    );
    expect(migration).toMatch(
      /revoke execute on function public\.create_community_post_with_tickers[\s\S]*from public, anon, authenticated/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.create_community_post_with_tickers[\s\S]*to authenticated/,
    );
    expect(migration).not.toContain("security definer");
  });
});
