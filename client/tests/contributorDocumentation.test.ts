import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "../..");

const readRepositoryFile = (fileName: string) =>
  readFileSync(join(repositoryRoot, fileName), "utf8");

describe("contributor documentation", () => {
  it("maintains the canonical contributor guide in English", () => {
    const englishGuide = readRepositoryFile("CONTRIBUTING.md");
    expect(englishGuide).toContain(
      "# Contributing to Financial-Investment-Tool",
    );
    expect(englishGuide).toContain("maintained in English");
    expect(englishGuide).not.toMatch(/\p{Script=Han}/u);
  });

  it.each(["CONTRIBUTING.md"])(
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
      readRepositoryFile("README.md"),
      readRepositoryFile("client/README.md"),
    ].join("\n");

    expect(documentation).not.toMatch(/password is in (?:the )?discord/i);
    expect(documentation).not.toMatch(/superbase/i);
  });

  it("links the canonical guide from the repository entry points", () => {
    const rootReadme = readRepositoryFile("README.md");
    const clientReadme = readRepositoryFile("client/README.md");

    expect(rootReadme).toContain("[contributor guide](CONTRIBUTING.md)");
    expect(clientReadme).toContain("[contributor guide](../CONTRIBUTING.md)");
  });

  it.each([
    "README.md",
    "client/README.md",
    "CONTRIBUTING.md",
    ".github/pull_request_template.md",
    "docs/branch-workflow.md",
  ])("%s keeps its local Markdown links valid", (fileName) => {
    const documentation = readRepositoryFile(fileName);
    for (const match of documentation.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      const localPath = resolve(
        repositoryRoot,
        dirname(fileName),
        decodeURIComponent(target),
      );
      expect({
        source: fileName,
        target,
        exists: existsSync(localPath),
      }).toEqual({
        source: fileName,
        target,
        exists: true,
      });
    }
  });
});
