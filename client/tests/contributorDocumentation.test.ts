import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "../..");

const readRepositoryFile = (fileName: string) =>
  readFileSync(join(repositoryRoot, fileName), "utf8");

describe("contributor documentation", () => {
  it("keeps English and Chinese contributor guides linked to each other", () => {
    const englishGuide = readRepositoryFile("CONTRIBUTING.md");
    const chineseGuide = readRepositoryFile("CONTRIBUTING.zh-CN.md");

    expect(englishGuide).toContain("[简体中文](CONTRIBUTING.zh-CN.md)");
    expect(chineseGuide).toContain("[English](CONTRIBUTING.md)");
  });

  it.each(["CONTRIBUTING.md", "CONTRIBUTING.zh-CN.md"])(
    "%s maps the codebase and directs common changes",
    (fileName) => {
      const guide = readRepositoryFile(fileName);

      expect(guide).toContain("client/features");
      expect(guide).toContain("client/pages/api");
      expect(guide).toContain("server/src/routes");
      expect(guide).toContain("server/src/analytics");
      expect(guide).toContain("supabase/migrations");
      expect(guide).toContain("npm run test:e2e");
      expect(guide).toContain("python -m pytest");
      expect(guide).toContain("supabase db reset");
    },
  );

  it("does not direct contributors to shared passwords or misspell Supabase", () => {
    const documentation = [
      readRepositoryFile("CONTRIBUTING.md"),
      readRepositoryFile("CONTRIBUTING.zh-CN.md"),
      readRepositoryFile("README.md"),
      readRepositoryFile("client/README.md"),
    ].join("\n");

    expect(documentation).not.toMatch(/password is in (?:the )?discord/i);
    expect(documentation).not.toMatch(/superbase/i);
  });

  it("links both canonical guides from the repository entry points", () => {
    const rootReadme = readRepositoryFile("README.md");
    const clientReadme = readRepositoryFile("client/README.md");

    expect(rootReadme).toContain(
      "[English contributor guide](CONTRIBUTING.md)",
    );
    expect(rootReadme).toContain("[中文贡献指南](CONTRIBUTING.zh-CN.md)");
    expect(clientReadme).toContain(
      "[English contributor guide](../CONTRIBUTING.md)",
    );
    expect(clientReadme).toContain("[中文贡献指南](../CONTRIBUTING.zh-CN.md)");
  });
});
