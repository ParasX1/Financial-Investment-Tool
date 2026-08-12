import React from "react";
import renderer from "react-test-renderer";
import { StageWorkspace } from "./StageWorkspace";
import type { QuantRunForm } from "../types";

const form: QuantRunForm = {
  symbol: "BHP.AX",
  benchmark: "^AXJO",
  period: "6mo",
  interval: "1d",
  objective: "signal_scan",
  riskProfile: "balanced",
};

const stageStatus = (
  tree: renderer.ReactTestRenderer,
  stage: "hypothesis" | "diagnose" | "decide",
): string => tree.root.findByProps({ "data-stage": stage }).props["data-status"];

const textContent = (tree: renderer.ReactTestRenderer): string =>
  JSON.stringify(tree.toJSON());

describe("StageWorkspace client-only stage states", () => {
  it("shows running and waiting placeholders before a first artifact exists", () => {
    const tree = renderer.create(
      <StageWorkspace form={form} run={null} running failed={false} />,
    );

    expect(stageStatus(tree, "hypothesis")).toBe("succeeded");
    expect(stageStatus(tree, "diagnose")).toBe("running");
    expect(stageStatus(tree, "decide")).toBe("pending");
    expect(textContent(tree)).toContain("Calculating finite");
    expect(textContent(tree)).toContain("Waiting for Diagnose");
  });

  it("shows failed and skipped placeholders when the first request fails", () => {
    const tree = renderer.create(
      <StageWorkspace form={form} run={null} running={false} failed />,
    );

    expect(stageStatus(tree, "hypothesis")).toBe("succeeded");
    expect(stageStatus(tree, "diagnose")).toBe("failed");
    expect(stageStatus(tree, "decide")).toBe("skipped");
    expect(textContent(tree)).toContain("Diagnosis did not complete");
    expect(textContent(tree)).toContain("Decision was skipped");
  });

  it("keeps every stage pending before the first request", () => {
    const tree = renderer.create(
      <StageWorkspace form={form} run={null} running={false} failed={false} />,
    );

    expect(stageStatus(tree, "hypothesis")).toBe("pending");
    expect(stageStatus(tree, "diagnose")).toBe("pending");
    expect(stageStatus(tree, "decide")).toBe("pending");
    expect(textContent(tree)).toContain("Run the study");
    expect(textContent(tree)).toContain("Decide begins only");
  });
});
