import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homePreviewMetrics } from "../data/homeContent";
import { HomePortfolioPreview } from "./HomePortfolioPreview";

describe("HomePortfolioPreview", () => {
  it("labels the illustration and metric descriptions in server-rendered HTML", () => {
    const markup = renderToStaticMarkup(<HomePortfolioPreview />);

    expect(markup).toContain('aria-labelledby="home-preview-title"');
    expect(markup).toContain("Illustrative view");
    expect(markup).toContain("No account data or calculated results.");
    expect(markup).toContain("Rebased return");
    expect(markup).toContain("Alpha, VaR and sampled opportunities");
    expect(markup).toContain("<dl");
    for (const metric of homePreviewMetrics) {
      expect(markup).toContain(`<dt>${metric.label}</dt>`);
      expect(markup).toContain(`<dd>${metric.classification}</dd>`);
    }
  });

  it("keeps chart geometry decorative and labels out of SVG", () => {
    const markup = renderToStaticMarkup(<HomePortfolioPreview />);
    const plot = markup.match(/<svg[\s\S]*?<\/svg>/)?.[0];

    expect(plot).toContain('aria-hidden="true"');
    expect(plot).not.toContain("<text");
    expect(markup).not.toContain("<canvas");
    expect(markup).not.toMatch(/\+\d+(?:\.\d+)?%|guaranteed|live account/i);
  });
});
