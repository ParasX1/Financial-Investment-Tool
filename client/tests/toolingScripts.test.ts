import { readFileSync } from "node:fs";
import { join } from "node:path";

const clientRoot = join(__dirname, "..");

describe("client tooling scripts", () => {
  it("cleans generated artifacts without deleting installed dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(join(clientRoot, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
    const cleaner = readFileSync(
      join(clientRoot, "scripts", "clean-artifacts.mjs"),
      "utf8",
    );

    expect(packageJson.scripts.clean).toBe("node scripts/clean-artifacts.mjs");
    expect(packageJson.scripts.reinstall).toBe("npm ci");
    expect(packageJson.scripts.rebuild).toBe("npm run clean && npm run build");
    expect(cleaner).toContain('".next"');
    expect(cleaner).toContain('"coverage"');
    expect(cleaner).toContain('"playwright-report"');
    expect(cleaner).toContain('"test-results"');
    expect(cleaner).not.toContain('"node_modules"');
  });

  it("keeps test and formatting tools out of runtime dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(join(clientRoot, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJson.dependencies).not.toHaveProperty("clean");
    expect(packageJson.dependencies).not.toHaveProperty("jest");
    expect(packageJson.dependencies).not.toHaveProperty("prettier");
    expect(packageJson.devDependencies).toMatchObject({
      "@types/jest": "29.5.14",
      jest: "^29.7.0",
      prettier: "3.6.2",
    });
  });
});
