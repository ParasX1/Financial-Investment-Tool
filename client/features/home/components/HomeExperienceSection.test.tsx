import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeExperienceSection } from "./HomeExperienceSection";

describe("HomeExperienceSection", () => {
  it("offers public learning and help links in readable static content", () => {
    const markup = renderToStaticMarkup(<HomeExperienceSection />);

    expect(markup).not.toContain("<figcaption");
    expect(markup).toContain("Get to know the measures.");
    expect(markup).toContain('href="/Guide"');
    expect(markup).toContain('href="/Help"');
    expect(markup).not.toContain("<button");
  });
});
