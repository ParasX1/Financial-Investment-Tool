import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as topPicks from "./index";

const clientRoot = join(__dirname, "..", "..");

const source = (relativePath: string) =>
  readFileSync(join(clientRoot, relativePath), "utf8");

describe("Top Picks feature boundary", () => {
  it("exposes only the route-ready screen from its public API", () => {
    expect(topPicks.TopPicksScreen).toEqual(expect.any(Function));
    expect(Object.keys(topPicks)).toEqual(["TopPicksScreen"]);
  });

  it("keeps the Next route thin and behind the feature public API", () => {
    const routeSource = source("pages/TopPicks.tsx");

    expect(routeSource).toMatch(/from\s+["']@\/features\/top-picks["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/top-picks\//);
  });

  it("uses one Top Picks endpoint instead of orchestrating metric routes", () => {
    const apiSource = source("features/top-picks/api/fetchTopPicks.ts");

    expect(apiSource).toContain("/api/top-picks");
    expect(apiSource).not.toContain("METRICS_BASE");
    expect(apiSource).not.toContain("@/lib/supabase");
  });

  it("uses server pagination and sorting while cancelling stale requests", () => {
    const controllerSource = source(
      "features/top-picks/hooks/useTopPicksController.ts",
    );
    const columnsSource = source("features/top-picks/lib/topPicksColumns.ts");

    expect(controllerSource).toContain("new AbortController()");
    expect(controllerSource).toContain("pageSize,");
    expect(controllerSource).toContain("sortKey: sort.key");
    expect(controllerSource).not.toContain("sortTopPicksRows");
    expect(controllerSource).not.toMatch(/rows\.slice\(/);
    expect(controllerSource).not.toMatch(/rows\.sort\(/);
    expect(columnsSource).not.toContain("sortTopPicksRows");
    expect(columnsSource).not.toContain("sortableMetricValue");
  });

  it("owns preferences behind the canonical auth and Supabase boundaries", () => {
    const repositorySource = source(
      "features/top-picks/data/topPicksPrefsRepository.ts",
    );
    const controllerSource = source(
      "features/top-picks/hooks/useTopPicksController.ts",
    );

    expect(repositorySource).toContain('from "@/lib/supabase"');
    expect(controllerSource).toContain('from "@/features/auth"');
    expect(controllerSource).toContain("preferenceScopeReady");
    expect(controllerSource).toContain("prefsDirty");
  });

  it("removes global service shims after consumers move into the feature", () => {
    expect(existsSync(join(clientRoot, "services/topPicks.ts"))).toBe(false);
    expect(existsSync(join(clientRoot, "services/topPicksPrefs.ts"))).toBe(
      false,
    );
  });

  it("does not expose the dead-end browser email interaction", () => {
    const screenSource = source(
      "features/top-picks/screens/TopPicksScreen.tsx",
    );
    const toolbarSource = source(
      "features/top-picks/components/TopPicksToolbar.tsx",
    );
    const controllerSource = source(
      "features/top-picks/hooks/useTopPicksController.ts",
    );

    expect(
      existsSync(
        join(
          clientRoot,
          "features/top-picks/components/TopPicksEmailDialog.tsx",
        ),
      ),
    ).toBe(false);
    expect(
      `${screenSource}\n${toolbarSource}\n${controllerSource}`,
    ).not.toMatch(/Remember Email|topPicks\.email|EmailDialog/);
  });
});
