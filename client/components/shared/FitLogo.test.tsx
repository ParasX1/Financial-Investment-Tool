import { renderToStaticMarkup } from "react-dom/server";
import { FitLogo } from "./FitLogo";

describe("FitLogo", () => {
  it("renders the shared FIT mark", () => {
    const markup = renderToStaticMarkup(<FitLogo />);

    expect(markup).toContain("FIT");
    expect(markup).toContain("aria-label=\"FIT\"");
  });

  it("can include the product wordmark", () => {
    const markup = renderToStaticMarkup(<FitLogo showWordmark />);

    expect(markup).toContain("FIT");
    expect(markup).toContain("Financial Investment Tool");
  });

  it("can be decorative inside an already labelled control", () => {
    const markup = renderToStaticMarkup(<FitLogo decorative />);

    expect(markup).toContain("aria-hidden=\"true\"");
    expect(markup).not.toContain("aria-label=\"FIT\"");
  });
});
