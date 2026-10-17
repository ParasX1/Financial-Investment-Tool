import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function sourceFilesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);

    if (statSync(path).isDirectory()) return sourceFilesUnder(path);
    if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return [];

    return [path];
  });
}

describe("neutral news ownership", () => {
  it("does not reach upward into application features", () => {
    const featureImports = sourceFilesUnder(__dirname)
      .filter((path) => path !== __filename && !path.includes(".test."))
      .filter((path) => readFileSync(path, "utf8").includes("@/features/"));

    expect(featureImports).toEqual([]);
  });
});
