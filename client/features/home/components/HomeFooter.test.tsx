import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homeFooterGroups } from "../data/homeContent";
import { HomeFooter } from "./HomeFooter";

describe("HomeFooter", () => {
  it("describes the product as analytics and research rather than holdings management", () => {
    const markup = renderToStaticMarkup(
      <HomeFooter
        groups={homeFooterGroups}
        loading={false}
        signedIn={false}
        onSignIn={jest.fn()}
      />,
    );

    expect(markup).toMatch(/portfolio analytics/i);
    expect(markup).toMatch(/market research/i);
    expect(markup).not.toMatch(/portfolio management/i);
  });
});
