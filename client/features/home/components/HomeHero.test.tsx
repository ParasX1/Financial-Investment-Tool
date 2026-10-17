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
    expect(markup).toMatch(/<h1[^>]*>Make sense of investing\.<\/h1>/);
    expect(markup).toContain(
      "Compare historical return and risk, keep your notes, and explore market news—with explanations that help the numbers make sense.",
    );
    expect(markup).toContain("Get started");
    expect(markup).toContain('href="#product"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<canvas");
  });
});
