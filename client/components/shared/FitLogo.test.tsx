import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { FitLogo } from "./FitLogo";

describe("FitLogo public presentation contract", () => {
  it("names a mark-only logo as an image without visible text", () => {
    const markup = renderToStaticMarkup(<FitLogo />);
    expect(markup).toContain('aria-label="FIT"');
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain(">FIT<");
  });

  it("renders a hidden, non-focusable square vector mark", () => {
    const markup = renderToStaticMarkup(<FitLogo />);
    const svg = markup.match(/<svg\b[^>]*>/)?.[0];
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain('viewBox="0 0 32 32"');
  });

  it("keeps the default product wordmark and translation boundary", () => {
    const markup = renderToStaticMarkup(<FitLogo showWordmark />);
    expect(markup).toContain("Financial Investment Tool");
    expect(markup).toContain('translate="no"');
    expect(markup).not.toContain('aria-label="FIT"');
  });

  it("supports a custom wordmark and optional subtitle exactly once", () => {
    const markup = renderToStaticMarkup(
      <FitLogo
        showWordmark
        wordmark="FIT"
        subtitle="Financial Investment Tool"
      />,
    );
    expect(markup.match(/>FIT</g)).toHaveLength(1);
    expect(markup.match(/>Financial Investment Tool</g)).toHaveLength(1);
    expect(markup).not.toContain('role="img"');
  });

  it("omits wordmark and subtitle until explicitly requested", () => {
    const markup = renderToStaticMarkup(
      <FitLogo wordmark="Custom" subtitle="Detail" />,
    );
    expect(markup).not.toContain("Custom");
    expect(markup).not.toContain("Detail");
  });

  it("hides the complete decorative logo inside a named control", () => {
    const markup = renderToStaticMarkup(
      <Link href="/" aria-label="FIT home">
        <FitLogo decorative showWordmark wordmark="FIT" />
      </Link>,
    );
    expect(markup).toMatch(/<span[^>]*aria-hidden="true"/);
    expect(markup).toContain('aria-label="FIT home"');
    expect(markup).not.toContain('aria-label="FIT"');
    expect(markup).not.toContain('role="img"');
  });

  it.each(["compact", "small", "medium", "large"] as const)(
    "preserves the %s size",
    (size) => {
      const markup = renderToStaticMarkup(<FitLogo size={size} />);
      expect(markup).toMatch(new RegExp(`class="[^"]*\\b${size}\\b`));
    },
  );

  it("preserves styling hooks for the root, mark and wordmark", () => {
    const markup = renderToStaticMarkup(
      <FitLogo
        showWordmark
        className="root-hook"
        markClassName="mark-hook"
        wordmarkClassName="wordmark-hook"
      />,
    );
    for (const name of ["root-hook", "mark-hook", "wordmark-hook"])
      expect(markup).toContain(name);
  });

  it("shares the canonical mark geometry with the public vector and favicon", () => {
    const markup = renderToStaticMarkup(<FitLogo />);
    const componentPath = markup.match(/<path d="([^"]+)"/)?.[1];
    expect(componentPath).toBeTruthy();

    for (const file of ["fit-mark.svg", "fit-favicon.svg"]) {
      const asset = readFileSync(
        join(__dirname, "../../public/brand", file),
        "utf8",
      );
      expect(asset).toContain('viewBox="0 0 32 32"');
      expect(asset.match(/<path[\s\S]*?\bd="([^"]+)"/)?.[1]).toBe(
        componentPath,
      );
    }
  });

  it("provides standard square 16 and 32 pixel ICO fallbacks", () => {
    const icon = readFileSync(join(__dirname, "../../public/favicon.ico"));
    expect(icon.readUInt16LE(0)).toBe(0);
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(icon.readUInt16LE(4)).toBe(2);

    for (const [index, size] of [16, 32].entries()) {
      const entry = 6 + index * 16;
      expect(icon[entry]).toBe(size);
      expect(icon[entry + 1]).toBe(size);
      expect(icon.readUInt16LE(entry + 6)).toBe(32);
      const offset = icon.readUInt32LE(entry + 12);
      const bytes = icon.readUInt32LE(entry + 8);
      expect(offset + bytes).toBeLessThanOrEqual(icon.length);
      expect(icon.readUInt32LE(offset)).toBe(40);
      expect(icon.readInt32LE(offset + 4)).toBe(size);
      expect(icon.readInt32LE(offset + 8)).toBe(size * 2);
    }
  });
});
