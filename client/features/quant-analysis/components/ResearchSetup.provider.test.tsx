import * as React from "react";
import TestRenderer from "react-test-renderer";
import type { QuantCapabilities, QuantRunForm } from "../types";
import { ResearchSetup } from "./ResearchSetup";

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
  providers: [
    {
      id: "offline",
      label: "Offline provider",
      version: "1.0.0",
      enabled: false,
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
    maxSymbolLength: 15,
    maxValidationRetries: 1,
    maxSessionRuns: 7,
    runRateLimit: 5,
    runRateWindowSeconds: 60,
  },
  persistence: { serverHistory: false, clientMode: "session_storage" },
  remoteGenerationEnabled: false,
  cache: { policy: "no-store" },
};

describe("ResearchSetup provider availability", () => {
  it("truthfully renders no provider and disables Run study", () => {
    const tree = TestRenderer.create(
      <ResearchSetup
        capabilities={capabilities}
        errors={{}}
        form={form}
        running={false}
        onChange={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(false)}
      />,
    );

    expect(JSON.stringify(tree.toJSON())).toContain("No provider enabled");
    expect(
      tree.root.findByProps({ "data-testid": "run-study" }).props.disabled,
    ).toBe(true);
    tree.unmount();
  });
});
