import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { FitLogo } from "./FitLogo";
import signature from "./fitSignatureGeometry.json";

function readGeometry(svg: string) {
  return {
    paths: [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(
      (match) => match[1],
    ),
    dot: svg
      .match(/<circle\b[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"/)
      ?.slice(1)
      .map(Number),
  };
}

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

  it("shares the complete signature geometry with the public vector", () => {
    const markup = renderToStaticMarkup(<FitLogo />);
    const asset = readFileSync(
      join(__dirname, "../../public/brand/fit-mark.svg"),
      "utf8",
    );
    expect(readGeometry(markup).paths).toHaveLength(2);
    expect(readGeometry(markup).dot).toHaveLength(3);
    expect(readGeometry(asset)).toEqual(readGeometry(markup));
    expect(asset).toContain('viewBox="0 0 32 32"');
  });

  it("uses an explicit optical signature variant for the favicon", () => {
    const asset = readFileSync(
      join(__dirname, "../../public/brand/fit-favicon.svg"),
      "utf8",
    );
    const markup = renderToStaticMarkup(<FitLogo />);

    expect(asset).toContain('data-optical-size="small"');
    expect(asset.match(/<path\b/g)).toHaveLength(2);
    expect(asset.match(/<circle\b/g)).toHaveLength(1);
    expect(asset).toContain('viewBox="0 0 32 32"');
    expect(readGeometry(asset)).toEqual({
      paths: signature.small.paths,
      dot: Object.values(signature.small.dot),
    });
    expect(readGeometry(asset).paths).not.toEqual(readGeometry(markup).paths);
    expect(signature.small.dot.r).toBeGreaterThan(signature.standard.dot.r);
    expect(asset).not.toMatch(/<image\b|\bhref=/);
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

  it.each([16, 32])(
    "renders the current optical signature in the %s pixel ICO fallback",
    async (size) => {
      const icon = readFileSync(join(__dirname, "../../public/favicon.ico"));
      const vector = readFileSync(
        join(__dirname, "../../public/brand/fit-favicon.svg"),
      );
      const expected = await sharp(vector)
        .resize(size, size)
        .ensureAlpha()
        .raw()
        .toBuffer();
      const index = size === 16 ? 0 : 1;
      const offset = icon.readUInt32LE(6 + index * 16 + 12) + 40;
      let totalDifference = 0;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dibPixel = offset + ((size - 1 - y) * size + x) * 4;
          const rgbaPixel = (y * size + x) * 4;
          for (const [channel, dibChannel] of [2, 1, 0, 3].entries()) {
            totalDifference += Math.abs(
              icon[dibPixel + dibChannel] - expected[rgbaPixel + channel],
            );
          }
        }
      }

      // Allow sub-byte average rasterizer variation across supported platforms.
      expect(totalDifference / expected.length).toBeLessThan(0.5);
    },
  );
});
