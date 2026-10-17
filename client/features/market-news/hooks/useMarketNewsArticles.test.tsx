import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveMarketNewsTopic } from "../lib/marketNewsNavigation";
import { useMarketNewsArticles } from "./useMarketNewsArticles";

function HookProbe({ enabled }: { enabled: boolean }) {
  const state = useMarketNewsArticles({
    enabled,
    limit: 12,
    refreshKey: 0,
    searchQuery: "",
    tickerSymbol: "",
    topic: resolveMarketNewsTopic("cost-of-living"),
  });

  return (
    <span
      data-article-count={state.articles.length}
      data-loading={state.loading ? "yes" : "no"}
    />
  );
}

describe("useMarketNewsArticles", () => {
  it("keeps the first enabled render in loading state until the fetch effect runs", () => {
    const html = renderToStaticMarkup(<HookProbe enabled />);

    expect(html).toContain('data-loading="yes"');
    expect(html).toContain('data-article-count="0"');
  });

  it("keeps disabled route-gated renders in loading state", () => {
    const html = renderToStaticMarkup(<HookProbe enabled={false} />);

    expect(html).toContain('data-loading="yes"');
  });
});
