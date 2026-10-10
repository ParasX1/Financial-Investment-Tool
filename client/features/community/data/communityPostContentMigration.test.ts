// File purpose: Locks the Supabase raw-Markdown storage and length contract.
import fs from "node:fs";
import path from "node:path";

const migration = fs
  .readFileSync(
    path.resolve(
      __dirname,
      "../../../../supabase/migrations/20260724013151_community_post_content_limits.sql",
    ),
    "utf8",
  )
  .toLowerCase();

describe("Community post content migration", () => {
  it("documents raw Markdown and enforces the shared title/body limits", () => {
    expect(migration).toContain("comment on column public.posts.body");
    expect(migration).toContain("raw markdown");
    expect(migration).toContain("posts_title_length_check");
    expect(migration).toMatch(/char_length\(btrim\(title\)\)[\s\S]*300/);
    expect(migration).toContain("posts_body_length_check");
    expect(migration).toMatch(/char_length\(body\)[\s\S]*40000/);
  });

  it("keeps the existing plain-text body column instead of adding HTML storage", () => {
    expect(migration).not.toMatch(/add column[^;]*(html|json|ast)/);
    expect(migration).not.toContain("security definer");
  });
});
