import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function sourceFilesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);

    if (statSync(path).isDirectory()) return sourceFilesUnder(path);
    if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return [];

    return [path];
  });
}

const clientRoot = join(__dirname, "..", "..");

describe("news module boundaries", () => {
  it("keeps neutral news contracts independent from the client service layer", () => {
    const serviceImports = sourceFilesUnder(__dirname)
      .filter((path) => path !== __filename)
      .filter((path) => readFileSync(path, "utf8").includes("@/services/news"));

    expect(serviceImports).toEqual([]);
  });

  it("owns the browser client in the neutral news seam", () => {
    const marketNewsClient = join(__dirname, "marketNewsClient.ts");
    const allowedBrowserClientImports = new Set([
      __filename,
      marketNewsClient,
      join(__dirname, "marketNewsClient.test.ts"),
    ]);
    const legacyClient = join(clientRoot, "services", "news.ts");
    const consumers = [
      join(clientRoot, "components", "NewsCardComponent.tsx"),
      join(
        clientRoot,
        "features",
        "market-news",
        "hooks",
        "useMarketNewsArticles.ts",
      ),
    ];

    expect(existsSync(marketNewsClient)).toBe(true);
    expect(existsSync(legacyClient)).toBe(false);
    expect(readFileSync(marketNewsClient, "utf8")).toContain(
      'from "@/lib/news/contracts"',
    );
    const neutralModulesImportingBrowserClient = sourceFilesUnder(
      __dirname,
    ).filter(
      (path) =>
        !allowedBrowserClientImports.has(path) &&
        readFileSync(path, "utf8").includes("marketNewsClient"),
    );

    expect(neutralModulesImportingBrowserClient).toEqual([]);
    consumers.forEach((path) => {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("@/lib/news/marketNewsClient");
      expect(source).not.toContain("@/services/news");
    });
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
