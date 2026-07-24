// File purpose: Locks the persisted Community post-image URL/path integrity contract.
import fs from "node:fs";
import path from "node:path";

const migration = fs
  .readFileSync(
    path.resolve(
      __dirname,
      "../../../../supabase/migrations/20260724015410_community_image_path_integrity.sql",
    ),
    "utf8",
  )
  .toLowerCase();

describe("Community post image reference migration", () => {
  it("stores only a validated post storage path", () => {
    expect(migration).toContain("posts_image_reference_check");
    expect(migration).toMatch(/image_url is null[\s\S]*image_path is null/);
    expect(migration).toContain("^posts/");
  });

  it("stores only a validated comment storage path", () => {
    expect(migration).toContain("comments_image_reference_check");
    expect(migration).toMatch(/image_url is null[\s\S]*\^comments\//);
    expect(migration).toContain("jpg|jpeg|png|webp|gif");
    expect(migration).not.toContain("security definer");
  });

  it("recovers legacy paths without assuming one project host or bucket", () => {
    expect(migration).toContain("storage/v1/object/public/");
    expect(migration).not.toContain("supabase.co");
    expect(migration).not.toContain("comment-images");
  });
});
