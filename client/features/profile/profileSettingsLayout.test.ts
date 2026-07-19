import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const readClientSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const cssBlock = (source: string, selector: string) => {
  const blockStart = source.indexOf(`${selector} {`);
  expect(blockStart).toBeGreaterThanOrEqual(0);

  const blockEnd = source.indexOf("}", blockStart);
  expect(blockEnd).toBeGreaterThan(blockStart);

  return source.slice(blockStart, blockEnd + 1);
};

describe("profile settings layout contract", () => {
  it("keeps the account settings cards top-aligned instead of stretching rows", () => {
    const styles = readClientSource("features/profile/styles/profile.module.css");

    expect(cssBlock(styles, ".settingsGrid")).toContain("align-items: start;");
  });

  it("groups each setting row into icon, content, and actions", () => {
    const source = readClientSource(
      "features/profile/components/ProfileSettingRow.tsx",
    );
    const styles = readClientSource("features/profile/styles/profile.module.css");

    expect(source).toContain("styles.settingContent");
    expect(source).toContain("styles.settingValue");
    expect(cssBlock(styles, ".settingContent")).toContain("display: grid;");
    expect(cssBlock(styles, ".settingActions")).toContain(
      "justify-self: end;",
    );
  });
});
