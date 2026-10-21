import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const clientRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedArtifacts = Object.freeze([
  ".next",
  ".swc",
  "coverage",
  "playwright-report",
  "test-results",
]);

for (const artifact of generatedArtifacts) {
  rmSync(join(clientRoot, artifact), {
    force: true,
    recursive: true,
  });
}
