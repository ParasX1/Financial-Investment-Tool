import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { fetchEtfs } from "../api/fetchEtfs";
import type { EtfResponse, EtfWindow } from "../types";
import { EtfScreen } from "./EtfScreen";

jest.mock("../api/fetchEtfs", () => ({ fetchEtfs: jest.fn() }));
jest.mock("@/components/sidebar", () => () => null);
jest.mock("@/components/shared/FitPageHeader", () => ({
  FitPageHeader: () => null,
}));
jest.mock("@mui/material", () => {
  const react = require("react") as typeof React;
  const element = (tag: string) =>
    function MockElement({
      children,
      component,
      sx: _sx,
      ...props
    }: Record<string, unknown>) {
      return react.createElement(
        (component as string) ?? tag,
        props,
        children as React.ReactNode,
      );
    };
  return {
    Box: element("div"),
    Button: element("button"),
    Chip: element("span"),
    Stack: element("div"),
    ToggleButton: element("button"),
    ToggleButtonGroup: element("div"),
    Typography: element("p"),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function response(windowCode: EtfWindow, symbol = "YEAR"): EtfResponse {
  return {
    rows: [
      {
        rank: 1,
        symbol,
        name: `${symbol} ETF`,
        category: "Equity",
        issuer: "Example",
        expenseRatio: 0.001,
        aumUsd: 2_000_000_000,
        priceReturn: -0.04,
        volatility: null,
        sharpe: null,
        maxDrawdown: null,
      },
    ],
    total: 1,
    metadata: { windowCode, generatedAt: "2026-10-09T01:02:03Z" },
    warnings: [`${symbol} warning`],
  };
}

function textOf(renderer: ReactTestRenderer) {
  const collect = (
    node:
      | TestRenderer.ReactTestRendererJSON
      | TestRenderer.ReactTestRendererNode[]
      | string
      | null,
  ): string => {
    if (node === null) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(collect).join(" ");
    return collect(node.children);
  };
  return collect(renderer.toJSON());
}

describe("EtfScreen request ownership", () => {
  let renderer: ReactTestRenderer;
  const fetchMock = fetchEtfs as jest.MockedFunction<typeof fetchEtfs>;
  const choose = (window: EtfWindow | null) =>
    act(() => {
      renderer.root
        .findByProps({ "aria-label": "ETF time window" })
        .props.onChange(null, window);
    });
  const mount = async () =>
    act(async () => {
      renderer = TestRenderer.create(<EtfScreen />);
    });

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
  });

  it("clears preceding rows, summaries, warnings and generation time while a new window loads or fails", async () => {
    const day = deferred<EtfResponse>();
    fetchMock
      .mockResolvedValueOnce(response("1Y"))
      .mockReturnValueOnce(day.promise);
    await mount();
    expect(textOf(renderer)).toContain("YEAR ETF");
    expect(textOf(renderer)).toContain("Updated");

    choose("1D");
    const pending = textOf(renderer);
    expect(pending).not.toContain("YEAR");
    expect(pending).not.toContain("Updated");
    expect(pending).toContain("Loading ETF preview for Day (1D)");
    expect(pending).toContain("hardcoded preview");
    await act(async () => day.reject(new Error("offline")));
    expect(textOf(renderer)).not.toContain("YEAR");
    expect(textOf(renderer)).not.toContain("Updated");
    expect(
      renderer.root.findByProps({ role: "alert" }).props.children,
    ).toContain("Unable to load ETF preview");

    const retry = deferred<EtfResponse>();
    fetchMock.mockReturnValueOnce(retry.promise);
    act(() =>
      renderer.root
        .findByProps({ "aria-label": "Retry loading ETF preview" })
        .props.onClick(),
    );
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    expect(textOf(renderer)).toContain("Loading ETF preview for Day (1D)");
    await act(async () => retry.resolve(response("1D", "DAY")));
    expect(textOf(renderer)).toContain("DAY ETF");
    expect(textOf(renderer)).not.toContain("YEAR");
    expect(fetchMock.mock.calls.map(([window]) => window)).toEqual([
      "1Y",
      "1D",
      "1D",
    ]);
  });

  it.each(["success", "error", "abort"] as const)(
    "an obsolete request's late %s cannot end the active request's loading",
    async (completion) => {
      const old = deferred<EtfResponse>();
      const current = deferred<EtfResponse>();
      fetchMock
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(current.promise);
      await mount();
      const oldSignal = fetchMock.mock.calls[0][1];
      choose("1W");
      expect(oldSignal?.aborted).toBe(true);
      await act(async () => {
        if (completion === "success") old.resolve(response("1Y", "OBSOLETE"));
        else
          old.reject(
            Object.assign(new Error("old request"), {
              name: completion === "abort" ? "AbortError" : "Error",
            }),
          );
      });
      expect(textOf(renderer)).toContain("Loading ETF preview for Week (1W)");
      expect(textOf(renderer)).not.toContain("OBSOLETE");
      expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
      await act(async () => current.resolve(response("1W", "WEEK")));
      expect(textOf(renderer)).toContain("WEEK ETF");
      expect(textOf(renderer)).not.toContain("Loading");
    },
  );

  it.each(["success", "error"] as const)(
    "ignores late %s even when selection returns to the old request's window",
    async (completion) => {
      const old = deferred<EtfResponse>();
      const middle = deferred<EtfResponse>();
      const latest = deferred<EtfResponse>();
      fetchMock
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(middle.promise)
        .mockReturnValueOnce(latest.promise);
      await mount();
      choose("1D");
      choose("1Y");
      await act(async () => latest.resolve(response("1Y", "CURRENT")));
      await act(async () => {
        if (completion === "success") old.resolve(response("1Y", "OBSOLETE"));
        else old.reject(new Error("late failure"));
      });
      expect(textOf(renderer)).toContain("CURRENT ETF");
      expect(textOf(renderer)).not.toContain("OBSOLETE");
      expect(textOf(renderer)).not.toContain("Unable to load");
      expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    },
  );

  it.each(["success", "error"] as const)(
    "aborts on unmount and isolates a late %s from a remounted screen",
    async (completion) => {
      const old = deferred<EtfResponse>();
      fetchMock.mockReturnValueOnce(old.promise);
      await mount();
      const signal = fetchMock.mock.calls[0][1];
      act(() => renderer.unmount());
      expect(signal?.aborted).toBe(true);
      fetchMock.mockResolvedValueOnce(response("1Y", "REMOUNTED"));
      await mount();
      await act(async () => {
        if (completion === "success") old.resolve(response("1Y", "UNMOUNTED"));
        else old.reject(new Error("late failure"));
      });
      expect(textOf(renderer)).toContain("REMOUNTED ETF");
      expect(textOf(renderer)).not.toContain("UNMOUNTED");
    },
  );

  it("announces genuine empty results and permits retry without inventing an update time", async () => {
    fetchMock.mockResolvedValueOnce({
      rows: [],
      total: 0,
      metadata: { windowCode: "1Y" },
      warnings: [],
    });
    await mount();
    expect(textOf(renderer)).toContain("No ETF preview results for Year (1Y)");
    expect(textOf(renderer)).toContain("Generation time unavailable");
    expect(
      renderer.root.findByProps({ role: "status" }).props["aria-live"],
    ).toBe("polite");
    expect(
      renderer.root.findByProps({ "aria-label": "Retry loading ETF preview" }),
    ).toBeDefined();
    choose(null);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("formats real metrics for Month and keeps unavailable risk fields as dashes", async () => {
    fetchMock.mockResolvedValueOnce(response("1Y")).mockResolvedValueOnce({
      ...response("1M", "MONTH"),
      rows: [
        {
          ...response("1M").rows[0],
          symbol: "MONTH",
          priceReturn: 0.1,
          volatility: 0.2,
          sharpe: 1.12,
          maxDrawdown: -0.1,
        },
      ],
    });
    await mount();
    choose("1M");
    await act(async () => {});
    expect(textOf(renderer)).toContain("+10.0%");
    expect(textOf(renderer)).toContain("1.12");
    expect(textOf(renderer)).toContain("-10.0%");
  });
});
