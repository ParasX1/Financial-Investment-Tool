import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeExperienceSection } from "./HomeExperienceSection";

describe("HomeExperienceSection", () => {
  it("pairs the public guide with community and separates practical help", () => {
    const markup = renderToStaticMarkup(
      <HomeExperienceSection
        authLoading={false}
        signedIn={false}
        onRouteSelect={jest.fn()}
      />,
    );

    expect(markup).not.toContain("<figcaption");
    expect(markup).toContain("Learn and exchange views");
    expect(markup).toMatch(/<h3[^>]*>Guide<\/h3>/);
    expect(markup).toMatch(/<h3[^>]*>Community<\/h3>/);
    expect(markup).toContain('href="/Guide"');
    expect(markup).toContain('href="/Help"');
    expect(markup).toContain(
      'aria-label="Explore community, sign in required"',
    );
    expect(markup).not.toContain('href="/Community"');
    expect(markup).toMatch(
      /<\/section><aside[^>]*aria-label="Help and support"/,
    );
  });

  it("keeps the guide and help available during authentication loading", () => {
    const markup = renderToStaticMarkup(
      <HomeExperienceSection
        authLoading
        signedIn={false}
        onRouteSelect={jest.fn()}
      />,
    );
    expect(markup).toContain('href="/Guide"');
    expect(markup).toContain('href="/Help"');
    expect(markup.match(/<button[^>]*>/g)).toEqual([
      expect.stringContaining('disabled=""'),
    ]);
  });

  it("links restored users directly to community", () => {
    const markup = renderToStaticMarkup(
      <HomeExperienceSection
        authLoading={false}
        signedIn
        onRouteSelect={jest.fn()}
      />,
    );
    expect(markup).toContain('href="/Community"');
    expect(markup).not.toContain("<button");
  });
});
