import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as home from "./index";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Home route feature boundary", () => {
  it("exposes one route-ready screen from the feature public API", () => {
    expect(home.HomeScreen).toEqual(expect.any(Function));
    expect(Object.keys(home)).toEqual(["HomeScreen"]);
  });

  it("keeps the Next route thin and behind the feature public API", () => {
    const routeSource = source("pages/index.tsx");

    expect(routeSource).toContain("HomeScreen");
    expect(routeSource).toMatch(/from\s+["']@\/features\/home["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/home\//);
    expect(routeSource).not.toContain("homeMetadata");
  });
});
