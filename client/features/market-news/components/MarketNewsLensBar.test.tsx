import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketNewsLensBar } from "./MarketNewsLensBar";

describe("MarketNewsLensBar", () => {
  it("disables empty non-active signal filters", () => {
    const html = renderToStaticMarkup(
      <MarketNewsLensBar
        activeLensId="all"
        options={[
          {
            count: 1,
            description: "Every headline.",
            id: "all",
            label: "All",
            selectable: true,
          },
          {
            count: 0,
            description: "Stories linked to symbols you already follow.",
            id: "watchlist",
            label: "My watchlist",
            selectable: false,
          },
        ]}
        onLensChange={() => undefined}
      />,
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("No My watchlist stories in this view");
  });

  it("hides empty advanced signals until the provider returns matches", () => {
    const html = renderToStaticMarkup(
      <MarketNewsLensBar
        activeLensId="all"
        options={[
          {
            count: 4,
            description: "Every headline.",
            id: "all",
            label: "All",
            selectable: true,
          },
          {
            count: 0,
            description: "Stories linked to symbols you already follow.",
            id: "watchlist",
            label: "My watchlist",
            selectable: false,
          },
          {
            count: 0,
            description: "Headlines with explicit market symbols attached.",
            id: "ticker-linked",
            label: "Company-linked",
            selectable: false,
          },
          {
            count: 0,
            description: "Provider stories with a strong match score.",
            id: "high-relevance",
            label: "Best matches",
            selectable: false,
          },
          {
            count: 1,
            description: "Positive sentiment stories.",
            id: "positive",
            label: "Opportunities",
            selectable: true,
          },
        ]}
        onLensChange={() => undefined}
      />,
    );

    expect(html).toContain("All");
    expect(html).toContain("My watchlist");
    expect(html).toContain("Company-linked");
    expect(html).toContain("Opportunities");
    expect(html).not.toContain("Best matches");
  });
});
