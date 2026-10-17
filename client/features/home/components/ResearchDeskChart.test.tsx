import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

let loadingError: Error | null = null;
jest.doMock("next/dynamic", () => ({
  __esModule: true,
  default: (
    _loader: unknown,
    options: {
      ssr: boolean;
      loading: (state: { error: Error | null }) => React.ReactNode;
    },
  ) => {
    expect(options.ssr).toBe(false);
    return () => options.loading({ error: loadingError });
  },
}));
const { HomePortfolioPreview } = jest.requireActual<
  typeof import("./HomePortfolioPreview")
>("./HomePortfolioPreview");

describe("Research chart loading fallback", () => {
  afterEach(() => {
    loadingError = null;
  });

  it("keeps source values and semantic tables in server HTML while charts are deferred", () => {
    const markup = renderToStaticMarkup(<HomePortfolioPreview />);
    expect(markup.match(/Chart available with JavaScript\./g)).toHaveLength(3);
    expect(markup.match(/<table/g)).toHaveLength(3);
    expect(markup).toContain("+4.59%");
    expect(markup).toContain("21.6%");
    expect(markup).toContain("-2.9%");
  });

  it("retains all metric data if a chart chunk fails without showing an internal error", () => {
    loadingError = new Error("Private chunk internals");
    const markup = renderToStaticMarkup(<HomePortfolioPreview />);
    expect(markup.match(/Chart unavailable\./g)).toHaveLength(3);
    expect(markup.match(/<table/g)).toHaveLength(3);
    expect(markup).toContain("+5.09%");
    expect(markup).toContain("17.21%");
    expect(markup).toContain("-2.43%");
    expect(markup).not.toContain("Private chunk internals");
  });
});
