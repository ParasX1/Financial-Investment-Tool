import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const readClientSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("Watchlist visual contract", () => {
  it("uses one deterministic desktop grid for table headers and rows", () => {
    const styles = readClientSource(
      "features/watchlist/styles/watchlist.module.css",
    );

    expect(styles).toContain("--watchlist-table-columns:");
    expect(styles).toContain(
      "grid-template-columns: var(--watchlist-table-columns);",
    );
    expect(styles).not.toMatch(
      /\.listHeader,\s*\n\.watchlistRow[\s\S]*?grid-template-columns:[^;]*\sauto;/,
    );
  });

  it("moves to an explicit tablet layout before fixed columns can collide", () => {
    const styles = readClientSource(
      "features/watchlist/styles/watchlist.module.css",
    );

    expect(styles).toContain("@media (max-width: 1100px)");
    expect(styles).toMatch(
      /@media \(max-width: 1100px\)[\s\S]*?\.rowActions\s*\{[\s\S]*?grid-column:\s*1 \/ -1;/,
    );
  });
  it("keeps desktop column labels available to assistive technology", () => {
    const styles = readClientSource(
      "features/watchlist/styles/watchlist.module.css",
    );
    const mobileLabelBlock = styles.match(/\.mobileLabel\s*\{([^}]*)\}/)?.[1];

    expect(mobileLabelBlock).toContain("position: absolute");
    expect(mobileLabelBlock).not.toContain("display: none");
    expect(styles).toMatch(
      /@media \(max-width: 1100px\)[\s\S]*?\.mobileLabel\s*\{[\s\S]*?position:\s*static;/,
    );
  });

  it("keeps one concise research-target disclosure for beginners", () => {
    const source = readClientSource(
      "features/watchlist/components/WatchlistMain.tsx",
    );

    expect(source).toContain(
      "Targets are personal references—not alerts or recommendations.",
    );
  });
});
