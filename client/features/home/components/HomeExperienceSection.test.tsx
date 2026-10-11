import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homeExperiencePoints } from "../data/homeContent";
import { HomeExperienceSection } from "./HomeExperienceSection";

describe("HomeExperienceSection", () => {
  it("renders the research sequence and guide as readable static content", () => {
    const markup = renderToStaticMarkup(
      <HomeExperienceSection points={homeExperiencePoints} />,
    );

    expect(markup).not.toContain("<figcaption");
    expect(markup).toContain("Questions before conclusions.");
    expect(markup).toContain("<ol");
    expect(markup.match(/<li[ >]/g)).toHaveLength(4);
    for (const point of homeExperiencePoints) {
      expect(markup).toContain(point.label);
      expect(markup).toContain(point.description);
    }
    expect(markup).toContain('href="/Guide"');
  });
});
