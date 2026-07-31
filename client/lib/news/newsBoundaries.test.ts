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

describe("news module boundaries", () => {
  it("keeps neutral news contracts independent from the client service layer", () => {
    const serviceImports = sourceFilesUnder(__dirname)
      .filter((path) => path !== __filename)
      .filter((path) => readFileSync(path, "utf8").includes("@/services/news"));

    expect(serviceImports).toEqual([]);
  });

  it("keeps the ticker-strip API route behind the neutral news seam", () => {
    const route = readFileSync(
      join(__dirname, "..", "..", "pages", "api", "market", "ticker-strip.ts"),
      "utf8",
    );

    expect(route).not.toContain("@/features/market-news/lib/");
    expect(route).toContain('from "@/lib/news/tickerStrip"');
  });
});
