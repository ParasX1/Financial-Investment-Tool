import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as help from "./index";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Help route feature boundary", () => {
  it("exposes one route-ready screen from the feature public API", () => {
    expect(help.HelpScreen).toEqual(expect.any(Function));
    expect(Object.keys(help)).toEqual(["HelpScreen"]);
  });

  it("keeps the Next route thin and behind the feature public API", () => {
    const routeSource = source("pages/Help.tsx");

    expect(routeSource).toContain("HelpScreen");
    expect(routeSource).toMatch(/from\s+["']@\/features\/help["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/help\//);
  });
});
