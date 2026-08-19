import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketNewsSparkline } from "./MarketNewsSparkline";

describe("MarketNewsSparkline", () => {
  it("renders a dashed previous-close reference line with the price path", () => {
    const html = renderToStaticMarkup(
      <MarketNewsSparkline
        data={[10, 12, 11, 14]}
        height={32}
        previousClose={9}
        width={90}
      />,
    );

    expect(html).toContain("sparklineReferenceLine");
    expect(html).toContain("sparklinePath");
    expect(html).toContain("sparklinePositivePath");
    expect(html).toContain("stroke-dasharray");
  });

  it("colors price movement above previous close green and below previous close red", () => {
    const html = renderToStaticMarkup(
      <MarketNewsSparkline
        data={[100, 102, 99, 101]}
        height={32}
        previousClose={100}
        width={90}
      />,
    );

    expect(html).toContain("sparklinePositivePath");
    expect(html).toContain("sparklineNegativePath");
    expect(html).toContain("clip-path");
  });

  it("omits the dashed reference line when previous close is unavailable", () => {
    const html = renderToStaticMarkup(
      <MarketNewsSparkline data={[10, 12, 11, 14]} height={32} width={90} />,
    );

    expect(html).not.toContain("sparklineReferenceLine");
    expect(html).not.toContain("sparklinePositivePath");
    expect(html).not.toContain("sparklineNegativePath");
    expect(html).toContain("sparklinePath");
  });
});
