import fs from "node:fs";
import path from "node:path";

describe("Quant Studio responsive layout contract", () => {
  const stylesheetPaths = fs
    .readdirSync(__dirname)
    .filter((fileName) => fileName.endsWith(".module.css"))
    .map((fileName) => path.join(__dirname, fileName));
  const stylesheets = stylesheetPaths.map((stylesheetPath) =>
    fs.readFileSync(stylesheetPath, "utf8"),
  );
  const stylesheet = stylesheets.join("\n");

  it("keeps every CSS module within the repository file-size limit", () => {
    const oversizedStylesheets = stylesheetPaths
      .map((stylesheetPath, index) => ({
        fileName: path.basename(stylesheetPath),
        lineCount: stylesheets[index].split(/\r?\n/).length,
      }))
      .filter(({ lineCount }) => lineCount > 800);

    expect(oversizedStylesheets).toEqual([]);
  });

  it("defines desktop, tablet, mobile, focus, and reduced-motion behavior", () => {
    expect(stylesheet).toContain("grid-template-areas");
    expect(stylesheet).toContain("@media (min-width: 1200px)");
    expect(stylesheet).toContain(
      "@media (min-width: 760px) and (max-width: 1199px)",
    );
    expect(stylesheet).toContain("@media (max-width: 759px)");
    expect(stylesheet).toContain("focus-visible");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
