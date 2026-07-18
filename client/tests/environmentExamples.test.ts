import fs from "fs";
import path from "path";

const clientRoot = process.cwd();
const repositoryRoot = path.resolve(clientRoot, "..");

const readText = (filePath: string) => fs.readFileSync(filePath, "utf8");

describe("environment example contracts", () => {
  it("uses canonical placeholders for the Next.js application", () => {
    const example = readText(path.join(clientRoot, ".env.example"));

    expect(example).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url",
    );
    expect(example).toContain(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key",
    );
    expect(example).not.toContain("NEXT_PUBLIC_ANON=");
    expect(example).not.toMatch(/https:\/\/[a-z]{20}\.supabase\.co/i);
    expect(example).not.toMatch(/eyJhbGciOi/);
  });

  it("documents a separate Flask server configuration", () => {
    const example = readText(
      path.join(repositoryRoot, "server", ".env.example"),
    );

    expect(example).toContain("SUPABASE_URL=your_supabase_project_url");
    expect(example).toContain("SUPABASE_KEY=your_supabase_publishable_key");
    expect(example).not.toMatch(/sb_publishable_[A-Za-z0-9_-]+/);
  });
});
