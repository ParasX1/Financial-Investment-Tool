import * as React from "react";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { HomeRouteLink } from "../types";

let HomeRouteAction: (typeof import("./HomeRouteAction"))["HomeRouteAction"];
const watchlist: HomeRouteLink = {
  href: "/Watchlist",
  label: "Watchlist",
  description: "Companies and notes",
  gated: true,
};

beforeAll(async () => {
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
  ({ HomeRouteAction } = await import("./HomeRouteAction"));
});

function render({
  signedIn = false,
  authLoading = false,
  route = watchlist,
  children,
}: {
  signedIn?: boolean;
  authLoading?: boolean;
  route?: HomeRouteLink;
  children?: React.ReactNode;
} = {}) {
  const select = jest.fn();
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <HomeRouteAction
        route={route}
        label="Open watchlist"
        className="entry"
        authLoading={authLoading}
        signedIn={signedIn}
        onRouteSelect={select}
      >
        {children}
      </HomeRouteAction>,
    );
  });
  return { renderer, select };
}

describe("HomeRouteAction", () => {
  it("passes the exact guest Watchlist intent from either entry surface", () => {
    for (const children of [
      undefined,
      <span key="strip">
        Watchlist<small>Companies and notes</small>
      </span>,
    ]) {
      const { renderer, select } = render({ children });
      const button = renderer.root.findByType("button");
      expect(button.props["aria-label"]).toBe(
        "Open watchlist, sign in required",
      );
      expect(button.props.disabled).toBe(false);
      act(() => button.props.onClick());
      expect(select).toHaveBeenCalledWith(watchlist);
      expect(renderer.root.findAllByType("a")).toHaveLength(0);
      act(() => renderer.unmount());
    }
  });

  it("locks guest entry while restoring the session", () => {
    const { renderer } = render({ authLoading: true });
    expect(renderer.root.findByType("button").props.disabled).toBe(true);
    act(() => renderer.unmount());
  });

  it("uses native destination links for signed-in and public entries", () => {
    for (const options of [
      { signedIn: true },
      { route: { ...watchlist, gated: false } },
    ]) {
      const { renderer, select } = render(options);
      expect(renderer.root.findByType("a").props).toMatchObject({
        href: "/Watchlist",
        "aria-label": "Open watchlist",
      });
      expect(renderer.root.findAllByType("button")).toHaveLength(0);
      expect(select).not.toHaveBeenCalled();
      act(() => renderer.unmount());
    }
  });
});
