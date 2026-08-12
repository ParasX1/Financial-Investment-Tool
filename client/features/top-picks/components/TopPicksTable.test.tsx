import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { TopPicksTable } from "./TopPicksTable";

describe("TopPicksTable", () => {
  it("renders an infinite Sortino status as Unbounded", () => {
    const markup = renderToStaticMarkup(
      <TopPicksTable
        rows={[
          {
            symbol: "BOUNDLESS",
            name: "Boundless Corp",
            industry: "Technology",
            ret1y: 0.1,
            sharpe: 1.2,
            sortino: null,
            volatility: 0.2,
            maxDD: -0.1,
            beta: 1,
            alpha: 0.03,
            infoRatio: 0.15,
            metricStatus: { sortino: "infinite" },
          },
        ]}
        loading={false}
        error={null}
        visibleKeys={["symbol", "sortino"]}
        sort={{ key: "sharpe", dir: "desc" }}
        page={1}
        pageSize={25}
        totalPages={1}
        onSortChange={() => undefined}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain("BOUNDLESS");
    expect(markup).toContain("Unbounded");
    expect(markup).toContain(
      'aria-label="Sortino ratio: Sortino ratio using downside deviation; Unbounded means no downside deviation."',
    );
  });
});
