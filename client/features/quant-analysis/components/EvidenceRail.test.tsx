import * as React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { QuantRunArtifact } from "../types";
import { EvidenceRail } from "./EvidenceRail";

const makeRun = (
  overrides: Partial<QuantRunArtifact> = {},
): QuantRunArtifact =>
  ({
    runId: "run-evidence",
    clientRunId: "11111111-1111-4111-8111-111111111111",
    traceId: "trace-evidence",
    status: "partial",
    warnings: ["The available history is short."],
    evidence: [
      {
        key: "relative_return",
        label: "Benchmark-relative return",
        value: 0.041,
        unit: "ratio",
        finite: true,
        warnings: ["Treat this estimate cautiously."],
      },
      {
        key: "trend_60",
        label: "60-observation trend",
        value: null,
        unit: "ratio",
        finite: false,
        warnings: [],
      },
    ],
    dataSource: {
      name: "Yahoo Finance",
      symbol: "BHP.AX",
      benchmark: "^AXJO",
      requestedStartDate: "2026-02-10",
      requestedEndDate: "2026-08-10",
      actualStartDate: "2026-02-11",
      actualEndDate: "2026-08-10",
      observationCount: 126,
      benchmarkObservationCount: 127,
      alignedObservationCount: 125,
    },
    versions: {
      engine: "engine-1.0.0",
      featureSet: "market-core-1.0.0",
      provider: "deterministic-1.0.0",
      playbook: "balanced-regime-1.0.0",
    },
    stages: {
      diagnose: {
        status: "partial",
        durationMs: 18,
        issueCodes: ["SHORT_WINDOW"],
      },
      decide: {
        status: "succeeded",
        durationMs: 7,
        issueCodes: [],
      },
    },
    validationAttempts: [
      {
        stage: "diagnose",
        attempt: 1,
        outcome: "failed",
        issueCodes: ["MALFORMED_OUTPUT"],
      },
      {
        stage: "diagnose",
        attempt: 2,
        outcome: "succeeded",
        issueCodes: [],
      },
    ],
    ...overrides,
  }) as unknown as QuantRunArtifact;

const renderedText = (renderer: ReactTestRenderer) =>
  JSON.stringify(renderer.toJSON());

describe("EvidenceRail", () => {
  it("explains which evidence will appear before a study exists", () => {
    const renderer = TestRenderer.create(<EvidenceRail run={null} />);

    expect(renderedText(renderer)).toContain("Evidence & audit");
    expect(renderedText(renderer)).toContain(
      "Metrics, source windows, warnings, versions, and validation attempts appear here.",
    );
    expect(renderer.root.findAllByProps({ "aria-label": "Run identifiers" })).toHaveLength(
      0,
    );
    renderer.unmount();
  });

  it("renders warnings, finite and unavailable evidence, source dates, stages, and trace IDs", () => {
    const run = makeRun();
    const renderer = TestRenderer.create(<EvidenceRail run={run} />);
    const output = renderedText(renderer);

    [
      "Partial",
      "The available history is short.",
      "4.1%",
      "Unavailable",
      "Treat this estimate cautiously.",
      "2026-02-11 → 2026-08-10",
      "engine-1.0.0",
      "SHORT_WINDOW",
      "MALFORMED_OUTPUT",
      "run-evidence",
      "trace-evidence",
      "11111111-1111-4111-8111-111111111111",
    ].forEach((value) => expect(output).toContain(value));
    expect(
      renderer.root.findByProps({ id: "run-warnings-title" }).children.join(""),
    ).toBe("Warnings · 1");
    expect(
      renderer.root.findAll(
        (node) =>
          node.type === "span" &&
          node.children.join("") === "Diagnose attempt 2",
      ),
    ).toHaveLength(1);
    expect(renderer.root.findByProps({ "data-finite": true })).toBeTruthy();
    expect(renderer.root.findByProps({ "data-finite": false })).toBeTruthy();
    renderer.unmount();
  });

  it("supports legacy and absent stage issues while keeping a clean partial audit explicit", () => {
    const baseRun = makeRun();
    const fallbackRun = makeRun({
      clientRunId: "",
      warnings: [],
      evidence: [],
      dataSource: {
        ...baseRun.dataSource,
        actualStartDate: "2026-02-11",
        actualEndDate: null,
      },
      stages: {
        diagnose: {
          status: "partial",
          issues: ["LEGACY_ISSUE"],
        },
        decide: {
          status: "succeeded",
        },
      } as unknown as QuantRunArtifact["stages"],
      validationAttempts: [],
    });
    const renderer = TestRenderer.create(<EvidenceRail run={fallbackRun} />);
    let output = renderedText(renderer);

    expect(output).toContain("No run-level warnings recorded.");
    expect(
      renderer.root.findAll(
        (node) => node.type === "span" && node.children.join("") === "0 features",
      ),
    ).toHaveLength(1);
    expect(output).toContain("Unavailable");
    expect(output).toContain("Not recorded");
    expect(output).toContain("LEGACY_ISSUE");
    expect(output).not.toContain("Client run");

    const noActualDates = makeRun({
      ...fallbackRun,
      dataSource: {
        ...fallbackRun.dataSource,
        actualStartDate: null,
        actualEndDate: null,
      },
    });
    act(() => renderer.update(<EvidenceRail run={noActualDates} />));
    output = renderedText(renderer);
    expect(output).toContain("Unavailable");
    renderer.unmount();
  });
});
