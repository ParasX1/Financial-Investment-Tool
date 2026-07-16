import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import type { NextRouter } from "next/router";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

jest.mock("@/components/sidebar", () => ({
  __esModule: true,
  default: () => null,
}));

function createRouter() {
  return {
    isReady: true,
    pathname: "/Help",
    query: {},
    replace: jest.fn<NextRouter["replace"]>().mockResolvedValue(true),
  } as unknown as NextRouter;
}

function textContent(renderer: ReactTestRenderer) {
  return renderer.root
    .findAll((node) => typeof node.children[0] === "string")
    .flatMap((node) => node.children)
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

describe("HelpScreen", () => {
  it("shows honest support availability without a fake contact action", async () => {
    const { HelpScreen } = await import("./HelpScreen");
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <RouterContext.Provider value={createRouter()}>
          <HelpScreen />
        </RouterContext.Provider>,
      );
      await Promise.resolve();
    });

    const copy = textContent(renderer);
    const buttons = renderer.root.findAllByType("button");

    expect(copy).toMatch(/Support availability/i);
    expect(copy).toMatch(/not connected/i);
    expect(copy).toMatch(/sensitive information.*Community/i);
    expect(
      buttons.some((button) => button.children.includes("Contact Support")),
    ).toBe(false);
    expect(
      renderer.root.findAll(
        (node) =>
          node.type === "section" &&
          node.props["aria-label"] === "Login and Signup questions",
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll(
        (node) =>
          node.type === "section" &&
          node.props["aria-label"] === "Login and Signup content",
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll(
        (node) =>
          node.type === "nav" &&
          node.props["aria-label"] === "Help Topics",
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll(
        (node) =>
          node.type === "section" &&
          node.props["aria-label"] === "Help Topics",
      ),
    ).toHaveLength(0);

    renderer.unmount();
  });
});
