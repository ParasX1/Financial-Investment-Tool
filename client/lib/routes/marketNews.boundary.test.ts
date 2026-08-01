import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "@jest/globals";

const CLIENT_ROOT = resolve(__dirname, "../..");
const FEATURE_ROOT = resolve(CLIENT_ROOT, "features");
const CONSUMER_SOURCE_ROOTS = [
  resolve(CLIENT_ROOT, "components"),
  resolve(CLIENT_ROOT, "lib"),
  resolve(CLIENT_ROOT, "pages"),
  ...readdirSync(FEATURE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "market-news")
    .map((entry) => resolve(FEATURE_ROOT, entry.name)),
] as const;
const MARKET_NEWS_INTERNAL_IMPORT =
  /(?:from\s+["']|import\s*\(\s*["']|require\(\s*["'])[^"']*features\/market-news\/[^"']*["']/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) return sourceFiles(absolutePath);

    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe("Market News route boundary", () => {
  it("keeps all consumers independent from Market News internals", () => {
    const offenders = CONSUMER_SOURCE_ROOTS.flatMap(sourceFiles)
      .filter((filePath) =>
        MARKET_NEWS_INTERNAL_IMPORT.test(readFileSync(filePath, "utf8")),
      )
      .map((filePath) => relative(CLIENT_ROOT, filePath).replaceAll("\\", "/"));

    expect(offenders).toEqual([]);
  });
});
