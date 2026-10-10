import * as React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import {
  PortfolioEmptyState,
  PortfolioErrorState,
  PortfolioLoadingState,
  PortfolioNoDataState,
} from "./PortfolioStates";

const mountedRenderers = new Set<ReactTestRenderer>();

const textOf = (node: ReactTestInstance | string | number): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  return node.children.map((child) => textOf(child)).join("");
};

const render = (element: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  mountedRenderers.add(renderer);
  return renderer;
};

afterEach(() => {
  for (const renderer of mountedRenderers) {
    act(() => renderer.unmount());
  }
  mountedRenderers.clear();
});

describe("Portfolio state recovery actions", () => {
  it("offers a one-year recovery action when the selected range has no data", () => {
    const onUseOneYear = jest.fn();
    const renderer = render(
      <PortfolioNoDataState onUseOneYear={onUseOneYear} />,
    );

    expect(textOf(renderer.root)).toContain("No metric data was returned");
    expect(textOf(renderer.root)).toContain(
      "Try a longer period or remove a symbol with limited trading history.",
    );
    act(() => renderer.root.findByType("button").props.onClick());
    expect(onUseOneYear).toHaveBeenCalledTimes(1);
  });

  it("announces request failures and delegates retry to the caller", () => {
    const onRetry = jest.fn();
    const renderer = render(
      <PortfolioErrorState
        message="Market history is temporarily unavailable."
        onRetry={onRetry}
      />,
    );

    expect(renderer.root.findByProps({ role: "alert" })).toBeDefined();
    expect(textOf(renderer.root)).toContain(
      "Market history is temporarily unavailable.",
    );
    act(() => renderer.root.findByType("button").props.onClick());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps loading announcements polite and empty guidance actionable", () => {
    const loading = render(
      <PortfolioLoadingState metricLabel="Rolling correlation matrix" />,
    );
    const empty = render(<PortfolioEmptyState />);

    expect(
      loading.root.findByProps({ "aria-busy": "true" }).props["aria-live"],
    ).toBe("polite");
    expect(textOf(loading.root)).toContain(
      "Loading Rolling correlation matrix…",
    );
    expect(textOf(empty.root)).toContain("Choose up to five stocks");
    expect(textOf(empty.root)).toContain("choose a useful history range");
  });
});
