import { renderToStaticMarkup } from "react-dom/server";
import {
  PortfolioEmptyState,
  PortfolioErrorState,
  PortfolioLoadingState,
} from "./PortfolioStates";

describe("Portfolio analysis states", () => {
  it("renders actionable and accessible loading, empty, and error states", () => {
    const loading = renderToStaticMarkup(
      <PortfolioLoadingState metricLabel="Cumulative return" />,
    );
    const empty = renderToStaticMarkup(<PortfolioEmptyState />);
    const error = renderToStaticMarkup(
      <PortfolioErrorState
        message="Market data is temporarily unavailable."
        onRetry={() => undefined}
      />,
    );

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading Cumulative return");
    expect(empty).toContain("Choose up to five stocks");
    expect(error).toContain('role="alert"');
    expect(error).toContain("Try again");
  });
});
