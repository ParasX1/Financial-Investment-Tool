import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeHero } from "./HomeHero";

describe("HomeHero", () => {
  it("server-renders the purpose, primary action and native product anchor", () => {
    const markup = renderToStaticMarkup(
      <HomeHero
        authLoading={false}
        signedIn={false}
        onGetStarted={jest.fn()}
      />,
    );
    expect(markup).toMatch(
      /Your portfolio\.\s*<span[^>]*>A clearer perspective\./,
    );
    expect(markup).toContain(
      "Explore returns and risk, keep an eye on companies, and put market news in context.",
    );
    expect(markup).toContain("Get started");
    expect(markup).toContain('href="#product"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<canvas");
  });
});
