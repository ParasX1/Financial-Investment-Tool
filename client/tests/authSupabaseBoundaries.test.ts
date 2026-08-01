import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

const clientRoot = join(__dirname, "..");
const excludedDirectories = new Set([
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const sourceFiles = (directory: string): string[] => {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
};

describe("auth and Supabase dependency boundaries", () => {
  it("keeps Supabase infrastructure outside the auth feature", () => {
    const authSource = sourceFiles(join(clientRoot, "features", "auth"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(authSource).not.toContain("@/features/auth/lib/supabaseClient");
    expect(authSource).toContain("@/lib/supabase");
  });

  it("forbids legacy component shims and auth-internal client imports", () => {
    const offenders = sourceFiles(clientRoot)
      .filter((path) => path !== __filename)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return [
          "@/components/authContext",
          "@/components/supabase",
          "@/features/auth/lib/supabaseClient",
        ].some((legacyImport) => source.includes(legacyImport));
      })
      .map((path) => relative(clientRoot, path).replaceAll("\\", "/"));

    expect(offenders).toEqual([]);
  });
});
