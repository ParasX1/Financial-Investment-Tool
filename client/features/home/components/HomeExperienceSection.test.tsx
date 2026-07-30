import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homeExperiencePoints } from "../data/homeContent";
import { HomeExperienceSection } from "./HomeExperienceSection";

describe("HomeExperienceSection", () => {
  it("uses photos as visual context without visible caption labels", () => {
    const markup = renderToStaticMarkup(
      <HomeExperienceSection points={homeExperiencePoints} />,
    );

    expect(markup).not.toContain("<figcaption");
    expect(markup).not.toContain("Market context</figcaption>");
    expect(markup).not.toContain("Portfolio view</figcaption>");
    expect(markup).not.toContain("Shared review</figcaption>");
  });
});
