import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homeRouteLinks, homeTools } from "../data/homeContent";
import { HomeProductSection } from "./HomeProductSection";

function renderProduct({ authLoading = false, signedIn = false } = {}) {
  return renderToStaticMarkup(
    <HomeProductSection
      authLoading={authLoading}
      signedIn={signedIn}
      onRouteSelect={jest.fn()}
    />,
  );
}

describe("HomeProductSection", () => {
  it("keeps the Portfolio demonstration before three independently readable research tasks", () => {
    const markup = renderProduct();

    expect(markup.match(/<h2[^>]*>[\s\S]*?<\/h2>/g)).toEqual([
      expect.stringContaining("Analyse an idea"),
      expect.stringContaining("What would you like to do?"),
    ]);
    expect(markup.match(/<h3[^>]*>[\s\S]*?<\/h3>/g)).toEqual([
      expect.stringContaining("Portfolio"),
      expect.stringContaining("Find a company to research"),
      expect.stringContaining("Follow your research"),
      expect.stringContaining("Understand what you find"),
    ]);
    const analyse = markup.slice(
      markup.indexOf('<section id="analyse"'),
      markup.indexOf('<section id="research-tasks"'),
    );
    expect(analyse).toContain("<figure");
    expect(analyse).toContain("Return is only half the story.");
    expect(analyse).not.toContain("Top Picks");
    expect(markup).not.toContain('aria-label="Explore the tools"');
    expect(markup).not.toContain("A simple workflow");
    expect(markup).not.toContain("Example research note");
    expect(markup).not.toContain("Example question");
    expect(markup).toContain('id="product"');
    expect(markup).toContain('id="discover"');
    expect(markup).toContain('id="follow"');
    expect(markup).toContain('id="experience"');
  });

  it("marks every gated destination before a signed-out user clicks", () => {
    const markup = renderProduct();

    for (const route of homeRouteLinks) {
      expect(markup).toContain(
        `aria-label="${homeTools[route.href].actionLabel}, sign in required"`,
      );
      expect(markup).not.toContain(`href="${route.href}"`);
    }
    const gatedButtons = (markup.match(/<button[^>]*>/g) ?? []).filter(
      (button) => button.includes("sign in required"),
    );
    expect(gatedButtons).toHaveLength(homeRouteLinks.length);
    expect(
      gatedButtons.every((button) => !button.includes('disabled=""')),
    ).toBe(true);
    expect(markup).toContain('href="/Guide"');
    expect(markup).toContain('href="/Help"');
  });

  it("locks every gated destination while preserving public help during the session check", () => {
    const markup = renderProduct({ authLoading: true });

    for (const route of homeRouteLinks) {
      expect(markup).not.toContain(`href="${route.href}"`);
    }
    const gatedButtons = (markup.match(/<button[^>]*>/g) ?? []).filter(
      (button) => button.includes("sign in required"),
    );
    expect(gatedButtons).toHaveLength(homeRouteLinks.length);
    expect(gatedButtons.every((button) => button.includes('disabled=""'))).toBe(
      true,
    );
    expect(markup).toContain('href="/Guide"');
    expect(markup).toContain('href="/Help"');
  });

  it("renders every product destination as a native link once signed in", () => {
    const markup = renderProduct({ signedIn: true });

    for (const route of homeRouteLinks) {
      expect(markup).toContain(`href="${route.href}"`);
      expect(markup).toContain(
        `aria-label="${homeTools[route.href].actionLabel}"`,
      );
    }
    expect(markup).not.toContain("sign in required");
  });
});
