import React from "react";
import TestRenderer, { type ReactTestInstance } from "react-test-renderer";
import type { EtfRow } from "../types";
import { EtfTable } from "./EtfTable";

jest.mock("@mui/material", () => {
  const react = require("react") as typeof React;
  return {
    Box: ({
      children,
      component = "div",
      sx: _sx,
      ...props
    }: Record<string, unknown>) =>
      react.createElement(
        component as string,
        props,
        children as React.ReactNode,
      ),
    Chip: ({ label }: { label: string }) =>
      react.createElement("span", null, label),
  };
});

const row: EtfRow = {
  rank: 7,
  symbol: "ZERO",
  name: "Zero ETF",
  category: "Equity",
  issuer: "Example",
  aumUsd: 2_000_000_000,
  expenseRatio: 0,
  priceReturn: 0,
  sharpe: 0,
  volatility: 0,
  maxDrawdown: 0,
};

const textOf = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(textOf).join("");

describe("EtfTable presentation contracts", () => {
  it("keeps API row order and separates real zeros from unavailable risk metrics", () => {
    const renderer = TestRenderer.create(
      <EtfTable
        rows={[
          row,
          {
            ...row,
            rank: 8,
            symbol: "MISSING",
            sharpe: null,
            volatility: null,
            maxDrawdown: null,
          },
        ]}
      />,
    );
    const rows = renderer.root.findByType("tbody").findAllByType("tr");
    expect(rows.map((item) => item.findAllByType("td").map(textOf))).toEqual([
      [
        "7",
        "ZERO",
        "Zero ETF",
        "Equity",
        "Example",
        "$2B",
        "0.00%",
        "+0.0%",
        "0.00",
        "0.0%",
        "+0.0%",
      ],
      [
        "8",
        "MISSING",
        "Zero ETF",
        "Equity",
        "Example",
        "$2B",
        "0.00%",
        "+0.0%",
        "-",
        "-",
        "-",
      ],
    ]);
    expect(renderer.root.findByType("table").props["aria-label"]).toBe(
      "ETF preview rankings",
    );
    expect(renderer.root.findByProps({ role: "region" }).props.tabIndex).toBe(
      0,
    );
    renderer.unmount();
  });

  it("renders a true empty result without creating placeholder rows", () => {
    const renderer = TestRenderer.create(<EtfTable rows={[]} />);
    expect(renderer.root.findByType("tbody").findAllByType("tr")).toHaveLength(
      0,
    );
    renderer.unmount();
  });
});
