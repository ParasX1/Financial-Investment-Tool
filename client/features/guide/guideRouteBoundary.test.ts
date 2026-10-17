import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as guide from "./index";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Guide route feature boundary", () => {
  it("exposes one route-ready screen from the feature public API", () => {
    expect(guide.GuideScreen).toEqual(expect.any(Function));
    expect(Object.keys(guide)).toEqual(["GuideScreen"]);
  });

  it("keeps the Next route thin and behind the feature public API", () => {
    const routeSource = source("pages/Guide.tsx");

    expect(routeSource).toContain("GuideScreen");
    expect(routeSource).toMatch(/from\s+["']@\/features\/guide["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/guide\//);
  });
});
