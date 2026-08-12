import * as React from "react";
import TestRenderer from "react-test-renderer";
import type { QuantRunArtifact } from "../types";
import { RunHistory } from "./RunHistory";

const run = {
  runId: "run-accessible-history",
  request: {
    symbol: "BHP.AX",
    period: "6mo",
    objective: "signal_scan",
  },
  diagnosis: { regime: "range_bound" },
  decision: { stance: "neutral" },
  warnings: [],
  createdAt: "2026-08-12T01:02:03.000Z",
} as unknown as QuantRunArtifact;

describe("RunHistory", () => {
  it("exposes the horizontally scrollable table as a keyboard-focusable region", () => {
    const renderer = TestRenderer.create(
      <RunHistory
        comparison={null}
        comparisonRunIds={[]}
        comparisonRuns={[]}
        historyLimit={20}
        runs={[run]}
        onToggleComparison={jest.fn()}
      />,
    );

    const tableRegion = renderer.root.findByProps({
      role: "region",
      "aria-label": "Run history table",
    });
    expect(tableRegion.props.tabIndex).toBe(0);
    renderer.unmount();
  });
});
