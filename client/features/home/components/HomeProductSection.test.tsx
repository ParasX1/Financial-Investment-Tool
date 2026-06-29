import { renderToStaticMarkup } from "react-dom/server";
import { homeRouteLinks } from "../data/homeContent";
import { HomeProductSection } from "./HomeProductSection";

describe("HomeProductSection", () => {
  it("marks gated product entries before a signed-out user clicks", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        routes={homeRouteLinks}
        signedIn={false}
        onRouteSelect={jest.fn()}
      />,
    );

    expect(markup).toContain("aria-label=\"Portfolio requires sign in\"");
    expect(markup).not.toContain("href=\"/dashboardView\"");
  });

  it("renders product entries as links once the user is signed in", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        routes={homeRouteLinks}
        signedIn
        onRouteSelect={jest.fn()}
      />,
    );

    expect(markup).toContain("href=\"/dashboardView\"");
    expect(markup).toContain("href=\"/MarketNews\"");
    expect(markup).toContain("href=\"/Community\"");
  });
});
