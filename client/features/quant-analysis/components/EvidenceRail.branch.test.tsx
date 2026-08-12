import React from "react";
import renderer from "react-test-renderer";
import { EvidenceRail } from "./EvidenceRail";
import type { QuantRunArtifact } from "../types";

const run = {
  runId: "run-evidence",
  clientRunId: "11111111-1111-4111-8111-111111111111",
  traceId: "trace-evidence",
  status: "succeeded",
  warnings: [],
  evidence: [
    {
      key: "return_20",
      label: "20-observation return",
      value: 0.04,
      unit: "decimal_return",
      finite: true,
      warnings: [],
    },
  ],
  dataSource: {
    name: "Fixture adjusted close",
    requestedStartDate: "2026-01-01",
    requestedEndDate: "2026-06-30",
    actualStartDate: "2026-01-02",
    actualEndDate: "2026-06-30",
    observationCount: 120,
    benchmarkObservationCount: 121,
    alignedObservationCount: 119,
  },
  versions: {
    engine: "engine-1",
    featureSet: "features-1",
    provider: "provider-1",
    playbook: "playbook-1",
  },
  stages: {
    diagnose: { status: "succeeded", durationMs: 4, issueCodes: [] },
    decide: { status: "succeeded", durationMs: 3, issues: ["LEGACY_TEST"] },
  },
  validationAttempts: [
    { stage: "diagnose", attempt: 1, outcome: "succeeded", issueCodes: [] },
  ],
} as unknown as QuantRunArtifact;

describe("EvidenceRail alternate audit states", () => {
  it("renders the empty audit rail before a completed artifact exists", () => {
    const tree = renderer.create(<EvidenceRail run={null} />);

    expect(JSON.stringify(tree.toJSON())).toContain("Metrics, source windows");
  });

  it("renders a clean audit, observed window, and legacy client issue fallback", () => {
    const tree = renderer.create(<EvidenceRail run={run} />);
    const output = JSON.stringify(tree.toJSON());

    expect(output).toContain("No run-level warnings recorded");
    expect(output).toContain("2026-01-02");
    expect(output).toContain("LEGACY_TEST");
    expect(output).toContain("4.0%");
  });
});
