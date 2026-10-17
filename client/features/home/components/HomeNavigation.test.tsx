import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

let HomeNavigation: (typeof import("./HomeNavigation"))["HomeNavigation"];

beforeAll(async () => {
  jest.doMock(
    "next/link",
    () =>
      function MockLink({
        children,
        href,
        ...props
      }: {
        children: ReactNode;
        href: string;
      }) {
        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      },
  );
  ({ HomeNavigation } = await import("./HomeNavigation"));
});

function renderNavigation({ loading = false, signedIn = false } = {}) {
  const onSignIn = jest.fn();
  const onGetStarted = jest.fn();
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <HomeNavigation
        loading={loading}
        signedIn={signedIn}
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
      />,
    );
  });
  return { renderer, onSignIn, onGetStarted };
}

describe("HomeNavigation", () => {
  it("server-renders all public destinations, the brand and the skip link", () => {
    const markup = renderToStaticMarkup(
      <HomeNavigation
        loading
        signedIn={false}
        onSignIn={jest.fn()}
        onGetStarted={jest.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Home"');
    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain('href="#top"');
    expect(markup).toContain('aria-label="Go to FIT home"');
    expect(markup).toMatch(/href="#product"[^>]*>Product<\/a>/);
    expect(markup).toMatch(/href="#research-tasks"[^>]*>Tools<\/a>/);
    expect(markup).toMatch(/href="\/Guide"[^>]*>Guide<\/a>/);
    expect(markup).toMatch(/href="\/Help"[^>]*>Help<\/a>/);
    expect(markup).not.toContain("aria-current");
  });

  it("keeps Tools a native anchor and the two auth entry callbacks distinct", () => {
    const { renderer, onSignIn, onGetStarted } = renderNavigation();
    const tools = renderer.root.findByProps({ href: "#research-tasks" });
    expect(tools.type).toBe("a");
    expect(tools.props.onClick).toBeUndefined();
    const buttons = renderer.root.findAllByType("button");
    expect(buttons.map((button) => button.children.join(""))).toEqual([
      "Sign in",
      "Get started",
    ]);
    act(() => buttons[0].props.onClick());
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onGetStarted).not.toHaveBeenCalled();
    act(() => buttons[1].props.onClick());
    expect(onGetStarted).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it("disables auth entry buttons while loading and keeps public links available", () => {
    const { renderer } = renderNavigation({ loading: true });
    expect(
      renderer.root
        .findAllByType("button")
        .every((button) => button.props.disabled),
    ).toBe(true);
    expect(
      renderer.root.findAllByType("a").map((link) => link.props.href),
    ).toEqual([
      "#main-content",
      "#top",
      "#product",
      "#research-tasks",
      "/Guide",
      "/Help",
    ]);
    act(() => renderer.unmount());
  });

  it("offers signed-in visitors a direct portfolio link", () => {
    const { renderer, onSignIn, onGetStarted } = renderNavigation({
      signedIn: true,
    });
    const portfolio = renderer.root
      .findAllByType("a")
      .find((link) => link.props.href === "/Portfolio");
    expect(portfolio).toBeDefined();
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(onSignIn).not.toHaveBeenCalled();
    expect(onGetStarted).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
