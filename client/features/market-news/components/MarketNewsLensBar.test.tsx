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
    expect(html).toContain("Every headline.");
    expect(html).toContain("No My watchlist stories in this view");
  });

  it("shows only trustworthy watchlist and ticker filters", () => {
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
            label: "Ticker stories",
            selectable: false,
          },
        ]}
        onLensChange={() => undefined}
      />,
    );

    expect(html).toContain("All");
    expect(html).toContain("My watchlist");
    expect(html).toContain("Ticker stories");
    expect(html).toContain("explicit ticker links");
    expect(html).not.toContain("Ticker stories stories");
    expect(html).not.toContain("High relevance");
    expect(html).not.toContain("Opportunities");
  });
});
