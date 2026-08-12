import React from "react";
import renderer, { act } from "react-test-renderer";
import { ResearchSetup } from "./ResearchSetup";
import type { QuantCapabilities, QuantRunForm } from "../types";

const form: QuantRunForm = {
  symbol: "BHP.AX",
  benchmark: "^AXJO",
  period: "6mo",
  interval: "1d",
  objective: "signal_scan",
  riskProfile: "balanced",
};

const capabilities: QuantCapabilities = {
  schemaVersion: "1.0",
  periods: ["6mo"],
  intervals: ["1d"],
  objectives: ["signal_scan"],
  riskProfiles: ["balanced"],
  defaults: form,
  providers: [],
  featureSet: { id: "fit-core", version: "1.0.0" },
  playbooks: [
    {
      id: "balanced-regime",
      version: "1.0.0",
      title: "Balanced regime",
      origin: "clean_room",
      contentHash: "sha256:test",
    },
  ],
  limits: {
    maxBodyBytes: 4096,
    maxSymbolLength: 15,
    maxValidationRetries: 1,
    maxSessionRuns: 20,
    runRateLimit: 20,
    runRateWindowSeconds: 60,
  },
  persistence: { serverHistory: false, clientMode: "session_storage" },
  remoteGenerationEnabled: false,
  cache: { policy: "no-store" },
};

describe("ResearchSetup alternate control states", () => {
  it("renders server validation errors, no-provider truth, and a running state", async () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(false);
    const tree = renderer.create(
      <ResearchSetup
        capabilities={capabilities}
        errors={{ symbol: "Bad symbol", benchmark: "Bad benchmark" }}
        form={form}
        running
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    expect(JSON.stringify(tree.toJSON())).toContain("No provider enabled");
    expect(JSON.stringify(tree.toJSON())).toContain("Bad symbol");
    expect(JSON.stringify(tree.toJSON())).toContain("Bad benchmark");
    expect(tree.root.findByProps({ "data-testid": "run-study" }).props.disabled).toBe(true);

    await act(async () => {
      tree.root.findByProps({ "data-testid": "research-form" }).props.onSubmit({
        preventDefault: jest.fn(),
      });
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("routes every bounded control change to the immutable form callback", () => {
    const onChange = jest.fn();
    const tree = renderer.create(
      <ResearchSetup
        capabilities={{
          ...capabilities,
          intervals: ["1d", "1h" as never],
          providers: [
            {
              id: "deterministic",
              label: "Deterministic research",
              version: "1.0.0",
              enabled: true,
              remote: false,
              deterministic: true,
              stages: ["diagnose", "decide"],
              structuredOutput: "validated",
            },
          ],
        }}
        errors={{}}
        form={form}
        running={false}
        onChange={onChange}
        onSubmit={jest.fn().mockResolvedValue(true)}
      />,
    );

    tree.root.findByProps({ id: "quant-symbol" }).props.onChange({
      target: { value: "AAPL" },
    });
    tree.root.findByProps({ id: "quant-benchmark" }).props.onChange({
      target: { value: "SPY" },
    });
    tree.root.findByProps({ id: "quant-period" }).props.onChange({
      target: { value: "6mo" },
    });
    tree.root.findByProps({ id: "quant-interval" }).props.onChange({
      target: { value: "1h" },
    });
    tree.root.findByProps({ name: "quant-objective" }).props.onChange();
    tree.root.findByProps({ id: "quant-risk-profile" }).props.onChange({
      target: { value: "balanced" },
    });

    expect(onChange).toHaveBeenCalledWith("symbol", "AAPL");
    expect(onChange).toHaveBeenCalledWith("benchmark", "SPY");
    expect(onChange).toHaveBeenCalledWith("period", "6mo");
    expect(onChange).toHaveBeenCalledWith("interval", "1h");
    expect(onChange).toHaveBeenCalledWith("objective", "signal_scan");
    expect(onChange).toHaveBeenCalledWith("riskProfile", "balanced");
    expect(JSON.stringify(tree.toJSON())).toContain("Deterministic research");
    expect(JSON.stringify(tree.toJSON())).toContain("1h");
  });
});
