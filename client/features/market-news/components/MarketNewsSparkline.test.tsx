import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketNewsSparkline } from "./MarketNewsSparkline";

describe("MarketNewsSparkline", () => {
  it("renders a dashed reference line with the price path", () => {
    const html = renderToStaticMarkup(
      <MarketNewsSparkline data={[10, 12, 11, 14]} height={32} width={90} />,
    );

    expect(html).toContain("sparklineReferenceLine");
    expect(html).toContain("sparklinePath");
    expect(html).toContain("stroke-dasharray");
  });
});
