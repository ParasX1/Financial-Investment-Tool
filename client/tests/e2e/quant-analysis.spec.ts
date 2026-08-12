import { expect, test, type Page, type Route } from "@playwright/test";

type QuantRunRequest = {
  clientRunId: string;
  symbol: string;
  benchmark: string;
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y";
  interval: "1d";
  objective: "signal_scan" | "risk_review" | "scenario_plan";
  riskProfile: "conservative" | "balanced" | "aggressive";
  compareToRunId?: string;
};

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const responseHeaders = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "x-trace-id",
  "cache-control": "no-store",
  "content-type": "application/json",
};

const capabilitiesEnvelope = {
  success: true,
  data: {
    schemaVersion: "1.0",
    enums: {
      periods: ["1mo", "3mo", "6mo", "1y", "2y"],
      intervals: ["1d"],
      objectives: ["signal_scan", "risk_review", "scenario_plan"],
      riskProfiles: ["conservative", "balanced", "aggressive"],
    },
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
        id: "deterministic",
        label: "Deterministic baseline",
        version: "1.0.0",
        enabled: true,
        deterministic: true,
        remote: false,
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
        contentHash: "sha256:e2e-balanced-regime-v1",
      },
    ],
    limits: {
      maxBodyBytes: 4_096,
      maxSymbolLength: 20,
      maxValidationRetries: 1,
      maxSessionRuns: 20,
      runRateLimit: 10,
      runRateWindowSeconds: 60,
    },
    persistence: {
      serverHistory: false,
      clientMode: "session_storage",
    },
    cache: { policy: "no-store" },
    remoteGenerationEnabled: false,
  },
  meta: { schemaVersion: "1.0" },
};

function makeRunArtifact(
  request: QuantRunRequest,
  index: number,
  partial = false,
) {
  const isSecondRun = index === 1;
  const runId = isSecondRun
    ? "run-desktop-two"
    : partial
      ? "run-mobile-partial"
      : "run-desktop-one";
  const traceId = isSecondRun
    ? "trace-desktop-two"
    : partial
      ? "trace-mobile-partial"
      : "trace-desktop-one";

  return {
    schemaVersion: "1.0",
    runId,
    clientRunId: request.clientRunId,
    traceId,
    status: partial ? "partial" : "succeeded",
    request: { ...request },
    evidence: [
      {
        key: "observation_count",
        label: "Observation count",
        value: partial ? 43 : isSecondRun ? 252 : 126,
        unit: "count",
        finite: true,
        warnings: [],
      },
      {
        key: "relative_return",
        label: "Benchmark-relative return",
        value: isSecondRun ? 0.089 : 0.041,
        unit: "ratio",
        finite: true,
        warnings: [],
      },
      {
        key: "annualized_volatility",
        label: "Annualized volatility",
        value: isSecondRun ? 0.171 : 0.194,
        unit: "ratio",
        finite: true,
        warnings: [],
      },
      {
        key: "trend_60",
        label: "60-observation trend",
        value: partial ? null : isSecondRun ? 0.112 : 0.026,
        unit: "ratio",
        finite: !partial,
        warnings: partial
          ? ["Only 43 aligned observations were available."]
          : [],
      },
    ],
    diagnosis: {
      regime: isSecondRun ? "bullish" : "range_bound",
      direction: isSecondRun ? "positive" : "mixed",
      strength: partial ? "unavailable" : isSecondRun ? "moderate" : "weak",
      templateVersion: "diagnosis-template@1.0.0",
      summary: isSecondRun
        ? "Relative strength and both trend windows support a bullish regime."
        : "Relative strength is positive while price remains range-bound.",
      confidence: isSecondRun ? 0.74 : partial ? 0.48 : 0.58,
      evidence: [
        {
          evidenceId: "relative_return",
          direction: "positive",
          strength: isSecondRun ? "moderate" : "weak",
        },
      ],
      riskCodes: partial ? ["SHORT_WINDOW"] : ["BREAKOUT_UNCONFIRMED"],
      risks: partial
        ? ["The long trend cannot be calculated from this window."]
        : ["Breakout confirmation is not yet established."],
      dataQuality: partial ? "partial" : "complete",
    },
    decision: {
      stance: isSecondRun ? "constructive" : "neutral",
      templateVersion: "decision-template@1.0.0",
      playbook: {
        id: "balanced-regime",
        version: "1.0.0",
        title: "Balanced regime",
        origin: "clean_room",
        contentHash: "sha256:balanced-regime-v1",
      },
      thesis: isSecondRun
        ? "Maintain a constructive research stance while relative strength holds."
        : "Wait for confirmation before changing the research stance.",
      scenarios: [
        {
          code: "BASE_CONTINUATION",
          name: "base",
          condition: "The current regime persists",
          implication: "Keep monitoring the benchmark-relative trend.",
        },
        {
          code: "BULL_CONFIRMATION",
          name: "bull",
          condition: "Relative strength accelerates",
          implication: "Reassess the constructive evidence.",
        },
        {
          code: "BEAR_REVERSAL",
          name: "bear",
          condition: "Support and relative strength fail",
          implication: "Move the research stance toward defensive.",
        },
      ],
      invalidationCodes: ["RELATIVE_RETURN_REVERSAL"],
      invalidationConditions: ["Benchmark-relative return turns negative."],
      riskControlCodes: ["BENCHMARK_ANCHOR"],
      riskControls: ["Keep the benchmark as the decision anchor."],
      confidence: isSecondRun ? 0.69 : partial ? 0.41 : 0.52,
    },
    versions: {
      engine: "engine-1.0.0",
      featureSet: "market-core-1.0.0",
      provider: "deterministic-1.0.0",
      playbook: "balanced-regime-1.0.0",
    },
    stages: {
      diagnose: {
        status: "succeeded",
        durationMs: isSecondRun ? 21 : 18,
        startedAt: "2026-08-12T01:02:03.000Z",
        completedAt: "2026-08-12T01:02:03.018Z",
        providerVersion: "deterministic-1.0.0",
        validationAttemptCount: 1,
        issueCodes: [],
      },
      decide: {
        status: partial ? "partial" : "succeeded",
        durationMs: isSecondRun ? 9 : 7,
        startedAt: "2026-08-12T01:02:03.018Z",
        completedAt: "2026-08-12T01:02:03.025Z",
        providerVersion: "deterministic-1.0.0",
        validationAttemptCount: 1,
        issueCodes: partial ? ["SHORT_WINDOW"] : [],
      },
    },
    validationAttempts: [
      {
        stage: "diagnose",
        attempt: 1,
        outcome: "succeeded",
        issueCodes: [],
      },
      {
        stage: "decide",
        attempt: 1,
        outcome: "succeeded",
        issueCodes: partial ? ["SHORT_WINDOW"] : [],
      },
    ],
    warnings: partial
      ? ["Only 43 aligned observations were available."]
      : isSecondRun
        ? ["The latest benchmark session was incomplete."]
        : [],
    dataSource: {
      name: "Yahoo Finance E2E fixture",
      symbol: request.symbol,
      benchmark: request.benchmark,
      requestedStartDate: isSecondRun ? "2025-08-12" : "2026-02-12",
      requestedEndDate: "2026-08-11",
      actualStartDate: isSecondRun ? "2025-08-12" : "2026-02-12",
      actualEndDate: "2026-08-11",
      observationCount: partial ? 43 : isSecondRun ? 252 : 126,
      benchmarkObservationCount: partial ? 45 : isSecondRun ? 253 : 127,
      alignedObservationCount: partial ? 43 : isSecondRun ? 252 : 126,
    },
    createdAt: isSecondRun
      ? "2026-08-12T01:04:03.000Z"
      : "2026-08-12T01:02:03.000Z",
  };
}

async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: { ...responseHeaders, ...headers },
    status,
  });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function installQuantAnalysisMockBackend(
  page: Page,
  options: {
    firstRunGate?: Promise<void>;
    partial?: boolean;
  } = {},
) {
  const requests: QuantRunRequest[] = [];
  const artifacts: ReturnType<typeof makeRunArtifact>[] = [];

  await page.route("**/api/v1/quant-analysis/capabilities", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ headers: responseHeaders, status: 204 });
      return;
    }
    await fulfillJson(route, capabilitiesEnvelope);
  });

  await page.route("**/api/v1/quant-analysis/runs", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ headers: responseHeaders, status: 204 });
      return;
    }

    const request = route.request().postDataJSON() as QuantRunRequest;
    requests.push(request);
    if (!UUID_V4.test(request.clientRunId)) {
      await fulfillJson(
        route,
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "The request could not be validated.",
            fields: { clientRunId: "A UUID v4 client run ID is required." },
            traceId: "trace-invalid-client-run-id",
          },
        },
        400,
      );
      return;
    }

    if (requests.length === 1 && options.firstRunGate) {
      await options.firstRunGate;
    }
    const artifact = makeRunArtifact(
      request,
      requests.length - 1,
      Boolean(options.partial),
    );
    artifacts.push(artifact);
    await fulfillJson(
      route,
      {
        success: true,
        data: artifact,
        meta: { schemaVersion: "1.0" },
      },
      200,
      { "x-trace-id": artifact.traceId },
    );
  });

  return {
    artifacts: () => artifacts,
    requests: () => requests,
  };
}

test("runs two immutable studies, inspects the audit trail, and compares the changed evidence", async ({
  page,
}) => {
  const firstRunGate = deferred();
  const backend = await installQuantAnalysisMockBackend(page, {
    firstRunGate: firstRunGate.promise,
  });

  await page.goto(`${APP_URL}/QuantAnalysis`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Quant Studio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Research Setup" }),
  ).toBeVisible();

  await page.getByRole("textbox", { name: "Primary symbol" }).fill("bhp.ax");
  await page.getByRole("textbox", { name: "Benchmark" }).fill("^axjo");
  await page
    .getByRole("combobox", { name: "Observation window" })
    .selectOption("6mo");
  await page.getByRole("radio", { name: "Signal scan" }).check();
  await page
    .getByRole("combobox", { name: "Risk posture" })
    .selectOption("balanced");

  const runButton = page.getByRole("button", { name: "Run study" });
  await runButton.click();
  await expect.poll(() => backend.requests().length).toBe(1);
  await expect(
    page.getByRole("article", { name: "Diagnose: Running" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Decide: Pending" }),
  ).toBeVisible();
  await expect(page.getByTestId("run-study")).toBeDisabled();

  firstRunGate.resolve();
  await expect(
    page.getByRole("article", { name: "Diagnose: Succeeded" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Decide: Succeeded" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-history-run="run-desktop-one"]'),
  ).toBeVisible();

  const evidenceAudit = page.getByRole("heading", {
    level: 2,
    name: "Evidence & audit",
  });
  await expect(evidenceAudit).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Calculated evidence" }),
  ).toBeVisible();
  await expect(
    page.getByText("Benchmark-relative return", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Yahoo Finance E2E fixture", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("engine-1.0.0", { exact: true })).toBeVisible();
  await expect(
    page.getByText("trace-desktop-one", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Diagnose attempt 1", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("combobox", { name: "Observation window" })
    .selectOption("1y");
  await page.getByRole("button", { name: "Run study" }).click();

  await expect(
    page.locator('[data-history-run="run-desktop-two"]'),
  ).toBeVisible();
  await expect(
    page.getByText("trace-desktop-two", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Constructive", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("The latest benchmark session was incomplete."),
  ).toBeVisible();

  expect(backend.requests()).toHaveLength(2);
  expect(backend.artifacts()).toHaveLength(2);
  expect(backend.requests()[0]).toMatchObject({
    symbol: "BHP.AX",
    benchmark: "^AXJO",
    period: "6mo",
    interval: "1d",
    objective: "signal_scan",
    riskProfile: "balanced",
  });
  expect(backend.requests()[1]).toMatchObject({
    symbol: "BHP.AX",
    benchmark: "^AXJO",
    period: "1y",
    interval: "1d",
    objective: "signal_scan",
    riskProfile: "balanced",
  });
  for (const [index, request] of backend.requests().entries()) {
    expect(request.clientRunId).toMatch(UUID_V4);
    expect(backend.artifacts()[index].clientRunId).toBe(request.clientRunId);
    expect(backend.artifacts()[index].request.clientRunId).toBe(
      request.clientRunId,
    );
  }
  expect(backend.requests()[1].clientRunId).not.toBe(
    backend.requests()[0].clientRunId,
  );

  await page.getByLabel("Compare run run-desktop-one").click();
  await page.getByLabel("Compare run run-desktop-two").click();

  const comparison = page.getByTestId("run-comparison");
  await expect(comparison).toBeVisible();
  await expect(comparison).toContainText("run-desktop-one vs run-desktop-two");
  await expect(comparison).toContainText("Period");
  await expect(comparison).toContainText("6 months");
  await expect(comparison).toContainText("1 year");
  await expect(comparison).toContainText("Range Bound");
  await expect(comparison).toContainText("Bullish");
  await expect(comparison).toContainText("Neutral");
  await expect(comparison).toContainText("Constructive");
  await expect(comparison).toContainText("58%");
  await expect(comparison).toContainText("74%");
  await expect(comparison).toContainText(
    "The latest benchmark session was incomplete.",
  );
});

test("keeps setup, partial decision evidence, and audit controls usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const backend = await installQuantAnalysisMockBackend(page, {
    partial: true,
  });

  await page.goto(`${APP_URL}/QuantAnalysis`);

  await expect(
    page.getByRole("heading", { level: 2, name: "Research Setup" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Primary symbol" }).fill("aapl");
  await page.getByRole("textbox", { name: "Benchmark" }).fill("spy");
  await page
    .getByRole("combobox", { name: "Observation window" })
    .selectOption("3mo");
  await page.getByRole("button", { name: "Run study" }).click();

  await expect.poll(() => backend.requests().length).toBe(1);
  await expect(
    page.getByRole("article", { name: "Diagnose: Succeeded" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Decide: Partial" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Wait for confirmation before changing the research stance.",
    ),
  ).toBeVisible();
  const evidenceRail = page.getByRole("complementary", {
    name: "Evidence & audit",
  });
  await expect(evidenceRail).toBeVisible();
  await expect(
    evidenceRail.getByText("60-observation trend", { exact: true }),
  ).toBeVisible();
  await expect(
    evidenceRail.getByText("Unavailable", { exact: true }),
  ).toBeVisible();
  const shortWindowIssues = evidenceRail.getByText("SHORT_WINDOW", {
    exact: true,
  });
  await expect(shortWindowIssues).toHaveCount(2);
  await expect(shortWindowIssues.first()).toBeVisible();
  await expect(
    evidenceRail.getByText("trace-mobile-partial", { exact: true }),
  ).toBeVisible();

  expect(backend.requests()[0]).toMatchObject({
    symbol: "AAPL",
    benchmark: "SPY",
    period: "3mo",
  });
  expect(backend.requests()[0].clientRunId).toMatch(UUID_V4);
  expect(backend.artifacts()[0].clientRunId).toBe(
    backend.requests()[0].clientRunId,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
