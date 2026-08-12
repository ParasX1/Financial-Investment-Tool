import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const readClientSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const userPageEntrypoints = [
  "Community.tsx",
  "CommunityCreate.tsx",
  "Guide.tsx",
  "Help.tsx",
  "MarketNews.tsx",
  "Portfolio.tsx",
  "Profile.tsx",
  "QuantAnalysis.tsx",
  "TopPicks.tsx",
  "Watchlist.tsx",
  "dashboardView.tsx",
  "index.tsx",
] as const;

const openingTagContaining = (source: string, uniqueText: string) => {
  const textIndex = source.indexOf(uniqueText);
  expect(textIndex).toBeGreaterThanOrEqual(0);

  const openingTagStart = source.lastIndexOf("<", textIndex);
  const openingTagEnd = source.indexOf(">", openingTagStart);
  expect(openingTagStart).toBeGreaterThanOrEqual(0);
  expect(openingTagEnd).toBeGreaterThan(openingTagStart);

  return source.slice(openingTagStart, openingTagEnd + 1);
};

const cssBlock = (source: string, selector: string) => {
  const blockStart = source.indexOf(`${selector} {`);
  expect(blockStart).toBeGreaterThanOrEqual(0);

  const blockEnd = source.indexOf("}", blockStart);
  expect(blockEnd).toBeGreaterThan(blockStart);

  return source.slice(blockStart, blockEnd + 1);
};

describe("site-wide page background contract", () => {
  it("defines the Top Picks glow once as the shared page background token", () => {
    const globals = readClientSource("styles/globals.css");
    const tokenDefinitions = globals.match(/--fit-page-background\s*:/g) ?? [];
    const tokenMatch = globals.match(/--fit-page-background:\s*([\s\S]*?);/);

    expect(tokenDefinitions).toHaveLength(1);
    expect(tokenMatch).not.toBeNull();
    const tokenValue = tokenMatch?.[1] ?? "";
    expect(tokenValue).toContain("circle at 20% 0%");
    expect(tokenValue).toContain("rgba(83, 103, 255, 0.12)");
    expect(tokenValue).toContain("transparent 34rem");
    expect(tokenValue).toContain("var(--fit-color-page-bg)");
  });

  it("keeps the root scrollbar track on the shared dark canvas", () => {
    const globals = readClientSource("styles/globals.css");

    expect(cssBlock(globals, "html")).toContain(
      "scrollbar-color: var(--fit-color-text-label) var(--fit-color-page-bg);",
    );
    expect(cssBlock(globals, "html::-webkit-scrollbar-track")).toContain(
      "background: var(--fit-color-page-bg);",
    );
  });

  it("requires every user page entrypoint to stay in the background manifest", () => {
    const actualEntrypoints = readdirSync(join(process.cwd(), "pages"), {
      withFileTypes: true,
    })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".tsx") &&
          !entry.name.startsWith("_"),
      )
      .map((entry) => entry.name)
      .sort();

    expect(actualEntrypoints).toEqual([...userPageEntrypoints].sort());
  });

  it("makes the shared FIT page shell use the site background token", () => {
    const primitives = readClientSource("components/shared/uiPrimitives.ts");
    const pageShell = readClientSource("components/shared/FitPageShell.tsx");

    expect(primitives).toContain('page: "fit-page-background text-white"');
    expect(pageShell).toContain("background: var(--fit-page-background);");
    expect(pageShell).toContain(
      "background-color: var(--fit-color-page-bg) !important;",
    );
  });

  it.each([
    ["features/top-picks/screens/TopPicksScreen.tsx", 'component="main"'],
  ])("uses the shared background on the visible main in %s", (path, marker) => {
    const source = readClientSource(path);
    const mainTag = openingTagContaining(source, marker);

    expect(mainTag).toContain("var(--fit-page-background)");
  });

  it("keeps the Portfolio route thin and its feature shell on the shared background", () => {
    const route = readClientSource("pages/Portfolio.tsx");
    const legacyAlias = readClientSource("pages/dashboardView.tsx");
    const screen = readClientSource(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );
    const styles = readClientSource(
      "features/portfolio/styles/PortfolioWorkspaceShell.module.css",
    );

    expect(route).toContain("export default PortfolioScreen");
    expect(legacyAlias).toContain('export { default } from "./Portfolio"');
    expect(screen).toContain("className={styles.page}");
    expect(cssBlock(styles, ".page")).toContain("var(--fit-page-background)");
  });

  it("uses the shared background and glow on the standalone Home shell", () => {
    const homeStyles = readClientSource("features/home/styles/home.module.css");

    expect(cssBlock(homeStyles, ".shell")).toContain(
      "background: var(--fit-page-background);",
    );
    expect(cssBlock(homeStyles, ".heroShade")).toContain(
      "var(--home-brand-glow)",
    );
  });

  it("keeps shared-shell page mains transparent so the glow stays visible", () => {
    const learningLayout = readClientSource(
      "components/learning/LearningPageLayout.tsx",
    );
    const communityDesign = readClientSource("features/community/design.ts");
    const profileStyles = readClientSource(
      "features/profile/styles/profile.module.css",
    );
    const marketNewsStyles = readClientSource(
      "features/market-news/styles/marketNews.module.css",
    );
    const watchlistStyles = readClientSource(
      "features/watchlist/styles/watchlist.module.css",
    );

    expect(openingTagContaining(learningLayout, "id={mainId}")).toContain(
      "bg-transparent",
    );
    expect(communityDesign).toMatch(/page:\s*["`][^"`]*bg-transparent/);
    expect(cssBlock(profileStyles, ".page")).toContain(
      "background: transparent;",
    );
    expect(cssBlock(marketNewsStyles, ".page")).toContain(
      "background: transparent;",
    );
    expect(cssBlock(watchlistStyles, ".page")).toContain(
      "background: transparent;",
    );
  });

  it("binds every shared-shell route to its tested page canvas", () => {
    const guide = readClientSource("features/guide/screens/GuideScreen.tsx");
    const help = readClientSource("features/help/screens/HelpScreen.tsx");
    const homeScreen = readClientSource("features/home/screens/HomeScreen.tsx");
    const communityLayout = readClientSource(
      "features/community/components/CommunityLayout.tsx",
    );
    const communityFeedScreen = readClientSource(
      "features/community/screens/CommunityFeedScreen.tsx",
    );
    const communityCreateScreen = readClientSource(
      "features/community/screens/CommunityCreateScreen.tsx",
    );
    const communityShell = readClientSource(
      "features/community/components/CommunityPageShell.tsx",
    );
    const learningLayout = readClientSource(
      "components/learning/LearningPageLayout.tsx",
    );
    const watchlistRoute = readClientSource("pages/Watchlist.tsx");
    const watchlistMain = readClientSource(
      "features/watchlist/components/WatchlistMain.tsx",
    );

    expect(homeScreen).toContain("className={styles.shell}");
    expect(guide).toContain("<LearningPageLayout");
    expect(help).toContain("<LearningPageLayout");
    expect(learningLayout).toContain("<FitPageShell");
    expect(communityShell).toContain("<FitPageShell");
    expect(communityLayout).toContain("className={communityUi.page}");
    expect(communityFeedScreen).toContain("<CommunityLayout");
    expect(communityCreateScreen).toContain("<CommunityLayout");
    expect(watchlistRoute).toContain("<WatchlistMain");
    expect(watchlistMain).toContain("<FitPageShell");
    expect(watchlistMain).toContain("className={styles.page}");

    ["pages/Community.tsx", "pages/CommunityCreate.tsx"].forEach((path) => {
      expect(readClientSource(path)).toContain("<CommunityPageShell");
    });

    [
      ["pages/Profile.tsx", "<ProfileMain"],
      ["pages/MarketNews.tsx", "<MarketNewsMain"],
      ["pages/TopPicks.tsx", "TopPicksScreen"],
    ].forEach(([path, marker]) => {
      expect(readClientSource(path)).toContain(marker);
    });

    [
      "features/profile/components/ProfileMain.tsx",
      "features/market-news/components/MarketNewsMain.tsx",
    ].forEach((path) => {
      const source = readClientSource(path);

      expect(source).toContain("<FitPageShell");
      expect(source).toContain("className={styles.page}");
    });
  });

  it("keeps shared-shell wrapper styles from covering the page glow", () => {
    [
      ["components/learning/LearningPageLayout.module.css", ".root"],
      ["features/profile/styles/profile.module.css", ".shell"],
      ["features/market-news/styles/marketNews.module.css", ".shell"],
    ].forEach(([path, selector]) => {
      expect(cssBlock(readClientSource(path), selector)).not.toMatch(
        /(?:^|\n)\s*background(?:-color)?\s*:/,
      );
    });
  });
});
