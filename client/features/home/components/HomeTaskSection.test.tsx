import * as React from "react";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { homeTools } from "../data/homeContent";

let HomeTaskSection: (typeof import("./HomeTaskSection"))["HomeTaskSection"];
const taskRoutes = [
  homeTools["/TopPicks"],
  homeTools["/Watchlist"],
  homeTools["/MarketNews"],
  homeTools["/Community"],
];

beforeAll(async () => {
  // The task tests use both SSR and a callback renderer. Keep decorative icons
  // independent of Emotion's renderer-specific context in this unit boundary.
  jest.doMock("@mui/icons-material/KeyboardArrowRightRounded", () => ({
    __esModule: true,
    default: () => <svg aria-hidden="true" />,
  }));
  jest.doMock(
    "next/link",
    () =>
      function Link({
        href,
        children,
        ...props
      }: {
        href: string;
        children: React.ReactNode;
      }) {
        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      },
  );
  ({ HomeTaskSection } = await import("./HomeTaskSection"));
});

function renderTasks({ authLoading = false, signedIn = false } = {}) {
  return renderToStaticMarkup(
    <HomeTaskSection
      authLoading={authLoading}
      signedIn={signedIn}
      onRouteSelect={jest.fn()}
    />,
  );
}

describe("HomeTaskSection", () => {
  it("puts each task and its routes in the initial HTML without selecting a task", () => {
    const markup = renderTasks();
    const rows = markup.match(/<article\b[\s\S]*?<\/article>/g) ?? [];

    expect(markup).toMatch(
      /<section[^>]*id="research-tasks"[^>]*aria-labelledby="home-tasks-title"/,
    );
    expect(markup.match(/<h2[^>]*>[\s\S]*?<\/h2>/g)).toEqual([
      expect.stringContaining("What would you like to do?"),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('id="discover"');
    expect(rows[0]).toContain('aria-labelledby="home-discover-title"');
    expect(rows[0]).toContain("Find a company to research");
    expect(rows[0]).toContain(
      "Sort return and risk measures across time windows.",
    );
    expect(rows[0]).toContain(homeTools["/TopPicks"].actionLabel);
    expect(rows[1]).toContain('id="follow"');
    expect(rows[1]).toContain('aria-labelledby="home-follow-title"');
    expect(rows[1]).toContain("Follow your research");
    expect(rows[1]).toContain("Keep company notes in Watchlist");
    expect(rows[1]).toContain(homeTools["/Watchlist"].actionLabel);
    expect(rows[1]).toContain(homeTools["/MarketNews"].actionLabel);
    expect(rows[2]).toContain('id="experience"');
    expect(rows[2]).toContain('aria-labelledby="home-experience-title"');
    expect(rows[2]).toContain("Understand what you find");
    expect(rows[2]).toContain("terms and measures");
    expect(rows[2]).toContain('href="/Guide"');
    expect(rows[2]).toContain(homeTools["/Community"].actionLabel);
    expect(markup.match(/<h3[^>]*>[\s\S]*?<\/h3>/g)).toHaveLength(3);
    expect(markup).not.toContain('role="tab');
    expect(markup).not.toContain("aria-selected=");
    expect(markup).not.toContain("<figure");
    expect(markup).not.toContain("<ol");
    expect(markup).toMatch(
      /<\/section><aside[^>]*aria-label="Help and support"/,
    );
  });

  it.each([false, true])(
    "keeps Guide and Help native links when auth loading is %s",
    (authLoading) => {
      const markup = renderTasks({ authLoading });

      expect(markup).toMatch(
        /<a[^>]*href="\/Guide"[^>]*aria-label="Read the guide"[^>]*>Guide /,
      );
      expect(markup).toMatch(/<a[^>]*href="\/Help"[^>]*>Visit Help Center /);
      for (const route of taskRoutes) {
        expect(markup).not.toContain(`href="${route.href}"`);
        expect(markup).toContain(
          `aria-label="${route.actionLabel}, sign in required"`,
        );
      }
      const buttons = markup.match(/<button[^>]*>/g) ?? [];
      expect(buttons).toHaveLength(taskRoutes.length);
      expect(buttons.every((button) => button.includes('disabled=""'))).toBe(
        authLoading,
      );
    },
  );

  it("forwards each signed-out destination object unchanged to the auth entry callback", () => {
    const select = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HomeTaskSection
          authLoading={false}
          signedIn={false}
          onRouteSelect={select}
        />,
      );
    });

    for (const route of taskRoutes) {
      const button = renderer.root.findByProps({
        "aria-label": `${route.actionLabel}, sign in required`,
      });
      act(() => button.props.onClick());
      expect(select.mock.calls.at(-1)?.[0]).toBe(route);
    }
    expect(select).toHaveBeenCalledTimes(taskRoutes.length);
    act(() => renderer.unmount());
  });

  it("links restored users to every task destination", () => {
    const markup = renderTasks({ signedIn: true });

    for (const route of taskRoutes) {
      expect(markup).toContain(`href="${route.href}"`);
      expect(markup).toContain(`aria-label="${route.actionLabel}"`);
    }
    expect(markup).not.toContain("<button");
  });
});
