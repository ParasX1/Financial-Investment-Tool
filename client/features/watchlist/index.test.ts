import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as watchlist from "./index";

describe("watchlist feature public API", () => {
  it("keeps the root entry focused on the route-ready screen", () => {
    expect(watchlist.WatchlistMain).toEqual(expect.any(Function));
    expect(Object.keys(watchlist)).toEqual(["WatchlistMain"]);
  });

  it("keeps the Next route behind the feature public API", () => {
    const routeSource = readFileSync(
      join(__dirname, "..", "..", "pages", "Watchlist.tsx"),
      "utf8",
    );

    expect(routeSource).toMatch(/from\s+["']@\/features\/watchlist["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/watchlist\//);
  });
});
