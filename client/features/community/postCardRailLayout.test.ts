import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";

const css = fs.readFileSync(
  path.join(__dirname, "styles", "community.module.css"),
  "utf8",
);

function ruleFor(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "s"),
  );

  expect(match).not.toBeNull();
  return match?.[1] ?? "";
}

describe("Community post context rail layout", () => {
  it("lets ticker and topic badges use their content width and wrap", () => {
    const tagCluster = ruleFor(".postTagCluster");

    expect(tagCluster).toMatch(/display:\s*flex/);
    expect(tagCluster).toMatch(/flex-wrap:\s*wrap/);
  });

  it("uses one horizontal engagement row with flexible comments and compact actions", () => {
    const engagementGrid = ruleFor(".postEngagementGrid");

    expect(engagementGrid).toMatch(/display:\s*grid/);
    expect(engagementGrid).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+repeat\(2,\s*minmax\(3rem,\s*auto\)\)/,
    );
  });
});
