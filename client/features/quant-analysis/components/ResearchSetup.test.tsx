import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import type {
  QuantCapabilities,
  QuantRunForm,
} from "../types";
import { ResearchSetup } from "./ResearchSetup";

const capabilities: QuantCapabilities = {
  schemaVersion: "1.0",
  periods: ["1mo", "6mo", "1y"],
  intervals: ["1d"],
  objectives: ["signal_scan", "risk_review", "scenario_plan"],
  riskProfiles: ["conservative", "balanced", "aggressive"],
  defaults: {
    symbol: "BHP.AX",
    benchmark: "^AXJO",
    period: "6mo",
    interval: "1d",
    objective: "signal_scan",
    riskProfile: "balanced",
  },
  providers: [
    {
      id: "disabled-remote",
      label: "Disabled remote provider",
      version: "2.0.0",
      enabled: false,
      remote: true,
      deterministic: false,
      stages: ["diagnose", "decide"],
      structuredOutput: "native",
    },
    {
      id: "deterministic",
      label: "Deterministic baseline",
      version: "1.0.0",
      enabled: true,
      remote: false,
      deterministic: true,
      stages: ["diagnose", "decide"],
      structuredOutput: "validated",
    },
  ],
  featureSet: { id: "market-core", version: "1.0.0" },
  playbooks: [
    {
      id: "balanced-regime",
      version: "1.0.0",
      title: "Balanced regime",
      origin: "clean_room",
      contentHash: "sha256:balanced-regime-v1",
    },
  ],
  limits: {
    maxBodyBytes: 4096,
    maxSymbolLength: 20,
    maxValidationRetries: 1,
    maxSessionRuns: 7,
    runRateLimit: 5,
    runRateWindowSeconds: 60,
  },
  persistence: { serverHistory: false, clientMode: "session_storage" },
  remoteGenerationEnabled: false,
  cache: { policy: "no-store" },
};

const form: QuantRunForm = {
  symbol: "BHP.AX",
  benchmark: "^AXJO",
  period: "6mo",
  interval: "1d",
  objective: "signal_scan",
  riskProfile: "balanced",
};

const renderedText = (renderer: TestRenderer.ReactTestRenderer) =>
  JSON.stringify(renderer.toJSON());

describe("ResearchSetup", () => {
  it("renders the server-owned defaults, limits, labels, and enabled provider", () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const renderer = TestRenderer.create(
      <ResearchSetup
        capabilities={capabilities}
        errors={{}}
        form={form}
        running={false}
        onChange={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    const symbol = renderer.root.findByProps({ id: "quant-symbol" });
    const benchmark = renderer.root.findByProps({ id: "quant-benchmark" });
    expect(symbol.props.value).toBe("BHP.AX");
    expect(symbol.props.maxLength).toBe(20);
    expect(symbol.props["aria-invalid"]).toBe(false);
    expect(symbol.props["aria-describedby"]).toBe("quant-symbol-help");
    expect(benchmark.props.value).toBe("^AXJO");
    expect(benchmark.props["aria-invalid"]).toBe(false);

    const optionLabels = renderer.root
      .findAllByType("option")
      .map((option) => option.children.join(""));
    expect(optionLabels).toEqual(
      expect.arrayContaining([
        "1 month",
        "6 months",
        "1 year",
        "Daily",
        "Conservative",
        "Balanced",
        "Aggressive",
      ]),
    );
    expect(renderedText(renderer)).toContain("Deterministic baseline");
    expect(renderedText(renderer)).toContain("1.0.0");
    expect(renderer.root.findByProps({ value: "signal_scan" }).props.checked).toBe(
      true,
    );
    expect(renderer.root.findByProps({ value: "scenario_plan" }).props.checked).toBe(
      false,
    );
    expect(renderer.root.findByProps({ "data-testid": "run-study" }).props.disabled).toBe(
      false,
    );

    const preventDefault = jest.fn();
    act(() => {
      renderer.root.findByProps({ "data-testid": "research-form" }).props.onSubmit({
        preventDefault,
      });
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("surfaces validation, disables a running study, and forwards every field update", () => {
    const onChange = jest.fn();
    const forwardCompatibleCapabilities = {
      ...capabilities,
      intervals: ["1d", "1h"],
      providers: capabilities.providers.map((provider) => ({
        ...provider,
        enabled: false,
      })),
    } as unknown as QuantCapabilities;
    const renderer = TestRenderer.create(
      <ResearchSetup
        capabilities={forwardCompatibleCapabilities}
        errors={{
          symbol: "Enter a listed symbol.",
          benchmark: "Enter a benchmark.",
        }}
        form={form}
        running
        onChange={onChange}
        onSubmit={jest.fn().mockResolvedValue(false)}
      />,
    );

    const symbol = renderer.root.findByProps({ id: "quant-symbol" });
    const benchmark = renderer.root.findByProps({ id: "quant-benchmark" });
    expect(symbol.props["aria-invalid"]).toBe(true);
    expect(symbol.props["aria-describedby"]).toContain("quant-symbol-error");
    expect(benchmark.props["aria-invalid"]).toBe(true);
    expect(benchmark.props["aria-describedby"]).toContain("quant-benchmark-error");
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(2);
    expect(renderedText(renderer)).toContain("No provider enabled");
    expect(renderedText(renderer)).toContain("1h");

    const runButton = renderer.root.findByProps({ "data-testid": "run-study" });
    expect(runButton.props.disabled).toBe(true);
    expect(runButton.children.join("")).toBe("Running study…");

    act(() => {
      symbol.props.onChange({ target: { value: "AAPL" } });
      benchmark.props.onChange({ target: { value: "^GSPC" } });
      renderer.root.findByProps({ id: "quant-period" }).props.onChange({
        target: { value: "1y" },
      });
      renderer.root.findByProps({ id: "quant-interval" }).props.onChange({
        target: { value: "1h" },
      });
      renderer.root.findByProps({ value: "scenario_plan" }).props.onChange();
      renderer.root.findByProps({ id: "quant-risk-profile" }).props.onChange({
        target: { value: "aggressive" },
      });
    });

    expect(onChange.mock.calls).toEqual([
      ["symbol", "AAPL"],
      ["benchmark", "^GSPC"],
      ["period", "1y"],
      ["interval", "1h"],
      ["objective", "scenario_plan"],
      ["riskProfile", "aggressive"],
    ]);
    renderer.unmount();
  });
});
