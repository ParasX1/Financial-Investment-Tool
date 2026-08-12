import { API_BASE } from "@/lib/apiBase";
import type {
  Decision,
  Diagnosis,
  EvidenceReference,
  QuantCapabilities,
  QuantDirection,
  QuantEvidence,
  QuantInterval,
  QuantObjective,
  QuantPeriod,
  QuantPlaybookCapability,
  QuantProviderCapability,
  QuantProviderStage,
  QuantRiskProfile,
  QuantStrength,
  QuantRunArtifact,
  QuantRunRequest,
  QuantArtifactStageRecord,
  QuantValidationAttempt,
} from "../types";

type JsonRecord = Record<string, unknown>;

const PERIODS = ["1mo", "3mo", "6mo", "1y", "2y"] as const;
const INTERVALS = ["1d"] as const;
const OBJECTIVES = ["signal_scan", "risk_review", "scenario_plan"] as const;
const RISK_PROFILES = ["conservative", "balanced", "aggressive"] as const;
const REGIMES = [
  "bullish",
  "bearish",
  "range_bound",
  "insufficient_data",
] as const;
const STANCES = [
  "constructive",
  "neutral",
  "defensive",
  "insufficient_data",
] as const;
const DATA_QUALITIES = ["complete", "partial", "insufficient"] as const;
const ARTIFACT_STAGE_STATUSES = ["succeeded", "partial"] as const;
const VALIDATION_OUTCOMES = ["succeeded", "failed"] as const;
const SCENARIOS = ["base", "bull", "bear"] as const;
const PROVIDER_STAGES = ["diagnose", "decide"] as const;
const STRUCTURED_OUTPUTS = ["validated", "native"] as const;
const DIRECTIONS = [
  "positive",
  "negative",
  "neutral",
  "mixed",
  "unknown",
] as const;
const STRENGTHS = ["strong", "moderate", "weak", "unavailable"] as const;
const SEMANTIC_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;
const CLIENT_RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return value.trim();
};

const finiteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return value;
};

const booleanValue = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return value;
};

const integer = (value: unknown, label: string, minimum = 0): number => {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number < minimum) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return number;
};

const boundedNumber = (
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number => {
  const number = finiteNumber(value, label);
  if (number < minimum || number > maximum) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return number;
};

const textArray = (value: unknown, label: string): readonly string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Quant Analysis returned invalid ${label}.`);
  }
  return value.map((item) => text(item, label));
};

const enumValue = <T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T => {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return value as T;
};

const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const enumArray = <T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): readonly T[] => {
  if (!Array.isArray(value) || !value.length) {
    throw new Error(`Quant Analysis returned invalid ${label}.`);
  }
  return value.map((item) => enumValue(item, values, label));
};

const clientRunId = (value: unknown, label: string): string => {
  const normalized = text(value, label);
  if (!CLIENT_RUN_ID_PATTERN.test(normalized)) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return normalized;
};

const isoTimestamp = (value: unknown, label: string): string => {
  const normalized = text(value, label);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return normalized;
};

const calendarDate = (value: unknown, label: string): string => {
  const normalized = text(value, label);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) throw new Error(`Quant Analysis returned an invalid ${label}.`);
  const [, year, month, day] = match;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  if (parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`Quant Analysis returned an invalid ${label}.`);
  }
  return normalized;
};

const nullableCalendarDate = (value: unknown, label: string): string | null =>
  value === null ? null : calendarDate(value, label);

const semanticCodeArray = (
  value: unknown,
  label: string,
): readonly string[] => {
  const codes = textArray(value, label);
  if (
    !codes.length ||
    new Set(codes).size !== codes.length ||
    codes.some((code) => !SEMANTIC_CODE_PATTERN.test(code))
  ) {
    throw new Error(`Quant Analysis returned invalid ${label}.`);
  }
  return codes;
};

const normalizeProvider = (value: unknown): QuantProviderCapability => {
  if (!isRecord(value))
    throw new Error("Quant Analysis returned an invalid provider.");
  return {
    id: text(value.id, "provider ID"),
    label: text(value.label, "provider label"),
    version: text(value.version, "provider version"),
    enabled: booleanValue(value.enabled, "provider enabled flag"),
    remote: booleanValue(value.remote, "provider remote flag"),
    deterministic: booleanValue(
      value.deterministic,
      "provider deterministic flag",
    ),
    stages: enumArray(
      value.stages,
      PROVIDER_STAGES,
      "provider stages",
    ) as readonly QuantProviderStage[],
    structuredOutput: enumValue(
      value.structuredOutput,
      STRUCTURED_OUTPUTS,
      "structured-output level",
    ),
  };
};

const normalizePlaybook = (value: unknown): QuantPlaybookCapability => {
  if (!isRecord(value))
    throw new Error("Quant Analysis returned an invalid playbook.");
  return {
    id: text(value.id, "playbook ID"),
    version: text(value.version, "playbook version"),
    title: text(value.title, "playbook title"),
    origin: enumValue(value.origin, ["clean_room"] as const, "playbook origin"),
    contentHash: text(value.contentHash, "playbook content hash"),
  };
};

export function normalizeQuantCapabilities(value: unknown): QuantCapabilities {
  if (!isRecord(value)) throw invalidResponse();
  const enums = value.enums;
  const defaults = value.defaults;
  const featureSet = value.featureSet;
  const limits = value.limits;
  const persistence = value.persistence;
  const cache = value.cache;
  if (
    !isRecord(enums) ||
    !isRecord(defaults) ||
    !isRecord(featureSet) ||
    !isRecord(limits) ||
    !isRecord(persistence) ||
    !isRecord(cache)
  ) {
    throw invalidResponse();
  }
  const providers = value.providers;
  const playbooks = value.playbooks;
  if (!Array.isArray(providers) || !Array.isArray(playbooks))
    throw invalidResponse();

  const periods = enumArray(enums.periods, PERIODS, "periods");
  const intervals = enumArray(enums.intervals, INTERVALS, "intervals");
  const objectives = enumArray(enums.objectives, OBJECTIVES, "objectives");
  const riskProfiles = enumArray(
    enums.riskProfiles,
    RISK_PROFILES,
    "risk profiles",
  );
  const normalizedDefaults = {
    symbol: text(defaults.symbol, "default symbol"),
    benchmark: text(defaults.benchmark, "default benchmark"),
    period: enumValue(defaults.period, periods, "default period"),
    interval: enumValue(defaults.interval, intervals, "default interval"),
    objective: enumValue(defaults.objective, objectives, "default objective"),
    riskProfile: enumValue(
      defaults.riskProfile,
      riskProfiles,
      "default risk profile",
    ),
  };
  const normalizedProviders = providers.map(normalizeProvider);
  const remoteGenerationEnabled = booleanValue(
    value.remoteGenerationEnabled,
    "remote generation flag",
  );
  if (
    persistence.serverHistory !== false ||
    persistence.clientMode !== "session_storage" ||
    cache.policy !== "no-store" ||
    remoteGenerationEnabled !==
      normalizedProviders.some(
        (provider) => provider.enabled && provider.remote,
      )
  ) {
    throw invalidResponse();
  }

  return {
    schemaVersion: enumValue(
      value.schemaVersion,
      ["1.0"] as const,
      "schema version",
    ),
    periods,
    intervals,
    objectives,
    riskProfiles,
    defaults: normalizedDefaults,
    providers: normalizedProviders,
    featureSet: {
      id: text(featureSet.id, "feature-set ID"),
      version: text(featureSet.version, "feature-set version"),
    },
    playbooks: playbooks.map(normalizePlaybook),
    limits: {
      maxBodyBytes: integer(limits.maxBodyBytes, "body-size limit", 1),
      maxSymbolLength: integer(limits.maxSymbolLength, "symbol limit", 1),
      maxValidationRetries: integer(
        limits.maxValidationRetries,
        "validation-retry limit",
      ),
      maxSessionRuns: integer(limits.maxSessionRuns, "session-run limit", 1),
      runRateLimit: integer(limits.runRateLimit, "run-rate limit", 1),
      runRateWindowSeconds: integer(
        limits.runRateWindowSeconds,
        "run-rate window",
        1,
      ),
    },
    persistence: {
      serverHistory: false,
      clientMode: "session_storage",
    },
    remoteGenerationEnabled,
    cache: { policy: "no-store" },
  };
}

const normalizeRequest = (value: unknown): QuantRunRequest => {
  if (!isRecord(value)) throw invalidResponse();
  return {
    clientRunId: clientRunId(value.clientRunId, "client run ID"),
    symbol: text(value.symbol, "symbol"),
    benchmark: text(value.benchmark, "benchmark"),
    period: enumValue(value.period, PERIODS, "period"),
    interval: enumValue(value.interval, INTERVALS, "interval"),
    objective: enumValue(value.objective, OBJECTIVES, "objective"),
    riskProfile: enumValue(value.riskProfile, RISK_PROFILES, "risk profile"),
    ...(value.compareToRunId === undefined
      ? {}
      : {
          compareToRunId: clientRunId(
            value.compareToRunId,
            "comparison run ID",
          ),
        }),
  };
};

const normalizeEvidence = (value: unknown): QuantEvidence => {
  if (!isRecord(value)) throw invalidResponse();
  const metricValue = value.value;
  const finite = booleanValue(value.finite, "evidence finite flag");
  if (
    metricValue !== null &&
    (typeof metricValue !== "number" || !Number.isFinite(metricValue))
  ) {
    throw invalidResponse();
  }
  if ((metricValue !== null) !== finite) throw invalidResponse();
  return {
    key: text(value.key, "evidence key"),
    label: text(value.label, "evidence label"),
    value: metricValue as number | null,
    unit: text(value.unit, "evidence unit"),
    finite,
    warnings: textArray(value.warnings, "evidence warnings"),
  };
};

const normalizeEvidenceReference = (value: unknown): EvidenceReference => {
  if (!isRecord(value)) throw invalidResponse();
  return {
    evidenceId: text(value.evidenceId, "evidence reference"),
    direction: enumValue(
      value.direction,
      DIRECTIONS,
      "evidence direction",
    ) as QuantDirection,
    strength: enumValue(
      value.strength,
      STRENGTHS,
      "evidence strength",
    ) as QuantStrength,
  };
};

const normalizeDiagnosis = (value: unknown): Diagnosis => {
  if (!isRecord(value) || !Array.isArray(value.evidence))
    throw invalidResponse();
  const evidence = value.evidence.map(normalizeEvidenceReference);
  const riskCodes = semanticCodeArray(value.riskCodes, "diagnosis risk codes");
  const risks = textArray(value.risks, "diagnosis risks");
  if (!evidence.length || risks.length !== riskCodes.length)
    throw invalidResponse();
  return {
    regime: enumValue(value.regime, REGIMES, "regime"),
    direction: enumValue(value.direction, DIRECTIONS, "diagnosis direction"),
    strength: enumValue(value.strength, STRENGTHS, "diagnosis strength"),
    summary: text(value.summary, "diagnosis summary"),
    templateVersion: text(value.templateVersion, "diagnosis template version"),
    confidence: boundedNumber(value.confidence, "diagnosis confidence", 0, 1),
    evidence,
    riskCodes,
    risks,
    dataQuality: enumValue(value.dataQuality, DATA_QUALITIES, "data quality"),
  };
};

const normalizeDecision = (value: unknown): Decision => {
  if (
    !isRecord(value) ||
    !isRecord(value.playbook) ||
    !Array.isArray(value.scenarios)
  ) {
    throw invalidResponse();
  }
  const scenarios = value.scenarios.map((scenario) => {
    if (!isRecord(scenario)) throw invalidResponse();
    const code = text(scenario.code, "scenario code");
    if (!SEMANTIC_CODE_PATTERN.test(code)) throw invalidResponse();
    return {
      code,
      name: enumValue(scenario.name, SCENARIOS, "scenario name"),
      condition: text(scenario.condition, "scenario condition"),
      implication: text(scenario.implication, "scenario implication"),
    };
  });
  const invalidationCodes = semanticCodeArray(
    value.invalidationCodes,
    "invalidation codes",
  );
  const invalidationConditions = textArray(
    value.invalidationConditions,
    "invalidation conditions",
  );
  const riskControlCodes = semanticCodeArray(
    value.riskControlCodes,
    "risk-control codes",
  );
  const riskControls = textArray(value.riskControls, "risk controls");
  if (
    scenarios.length !== SCENARIOS.length ||
    scenarios.some((scenario, index) => scenario.name !== SCENARIOS[index]) ||
    new Set(scenarios.map((scenario) => scenario.code)).size !==
      scenarios.length ||
    invalidationCodes.length !== invalidationConditions.length ||
    riskControlCodes.length !== riskControls.length
  ) {
    throw invalidResponse();
  }
  return {
    stance: enumValue(value.stance, STANCES, "stance"),
    playbook: {
      id: text(value.playbook.id, "decision playbook ID"),
      version: text(value.playbook.version, "decision playbook version"),
      title: text(value.playbook.title, "decision playbook title"),
      origin: enumValue(
        value.playbook.origin,
        ["clean_room"] as const,
        "decision playbook origin",
      ),
      contentHash: text(
        value.playbook.contentHash,
        "decision playbook content hash",
      ),
    },
    thesis: text(value.thesis, "decision thesis"),
    templateVersion: text(value.templateVersion, "decision template version"),
    scenarios,
    invalidationCodes,
    invalidationConditions,
    riskControlCodes,
    riskControls,
    confidence: boundedNumber(value.confidence, "decision confidence", 0, 1),
  };
};

const normalizeStage = (value: unknown): QuantArtifactStageRecord => {
  if (!isRecord(value)) throw invalidResponse();
  return {
    status: enumValue(value.status, ARTIFACT_STAGE_STATUSES, "stage status"),
    durationMs: integer(value.durationMs, "stage duration"),
    startedAt: isoTimestamp(value.startedAt, "stage start time"),
    completedAt: isoTimestamp(value.completedAt, "stage completion time"),
    providerVersion: text(value.providerVersion, "stage provider version"),
    validationAttemptCount: integer(
      value.validationAttemptCount,
      "stage validation-attempt count",
      1,
    ),
    issueCodes: textArray(value.issueCodes, "stage issue codes"),
  };
};

const normalizeValidationAttempt = (value: unknown): QuantValidationAttempt => {
  if (!isRecord(value)) throw invalidResponse();
  return {
    stage: enumValue(
      value.stage,
      ["diagnose", "decide"] as const,
      "validation stage",
    ),
    attempt: integer(value.attempt, "validation attempt", 1),
    outcome: enumValue(
      value.outcome,
      VALIDATION_OUTCOMES,
      "validation outcome",
    ),
    issueCodes: textArray(value.issueCodes, "validation issues"),
  };
};

export function normalizeQuantRunArtifact(value: unknown): QuantRunArtifact {
  if (!isRecord(value)) throw invalidResponse();
  const versions = value.versions;
  const stages = value.stages;
  const dataSource = value.dataSource;
  if (
    !Array.isArray(value.evidence) ||
    !Array.isArray(value.validationAttempts) ||
    !isRecord(versions) ||
    !isRecord(stages) ||
    !isRecord(dataSource)
  ) {
    throw invalidResponse();
  }
  const request = normalizeRequest(value.request);
  const artifactClientRunId = clientRunId(value.clientRunId, "client run ID");
  if (artifactClientRunId !== request.clientRunId) throw invalidResponse();
  const sourceRunId =
    value.sourceRunId === undefined
      ? undefined
      : clientRunId(value.sourceRunId, "source run ID");
  if (sourceRunId !== request.compareToRunId) throw invalidResponse();
  const requestedStartDate = calendarDate(
    dataSource.requestedStartDate,
    "requested source start date",
  );
  const requestedEndDate = calendarDate(
    dataSource.requestedEndDate,
    "requested source end date",
  );
  const actualStartDate = nullableCalendarDate(
    dataSource.actualStartDate,
    "actual source start date",
  );
  const actualEndDate = nullableCalendarDate(
    dataSource.actualEndDate,
    "actual source end date",
  );
  if (
    requestedStartDate > requestedEndDate ||
    (actualStartDate === null) !== (actualEndDate === null) ||
    (actualStartDate !== null &&
      actualEndDate !== null &&
      actualStartDate > actualEndDate)
  ) {
    throw invalidResponse();
  }
  return {
    schemaVersion: enumValue(
      value.schemaVersion,
      ["1.0"] as const,
      "schema version",
    ),
    runId: text(value.runId, "run ID"),
    clientRunId: artifactClientRunId,
    ...(sourceRunId ? { sourceRunId } : {}),
    traceId: text(value.traceId, "trace ID"),
    status: enumValue(
      value.status,
      ["succeeded", "partial"] as const,
      "run status",
    ),
    request,
    evidence: value.evidence.map(normalizeEvidence),
    diagnosis: normalizeDiagnosis(value.diagnosis),
    decision: normalizeDecision(value.decision),
    versions: {
      engine: text(versions.engine, "engine version"),
      featureSet: text(versions.featureSet, "feature-set version"),
      provider: text(versions.provider, "provider version"),
      playbook: text(versions.playbook, "playbook version"),
    },
    stages: {
      diagnose: normalizeStage(stages.diagnose),
      decide: normalizeStage(stages.decide),
    },
    validationAttempts: value.validationAttempts.map(
      normalizeValidationAttempt,
    ),
    warnings: textArray(value.warnings, "run warnings"),
    dataSource: {
      name: text(dataSource.name, "data source"),
      symbol: text(dataSource.symbol, "source symbol"),
      benchmark: text(dataSource.benchmark, "source benchmark"),
      requestedStartDate,
      requestedEndDate,
      actualStartDate,
      actualEndDate,
      observationCount: integer(
        dataSource.observationCount,
        "observation count",
      ),
      benchmarkObservationCount: integer(
        dataSource.benchmarkObservationCount,
        "benchmark observation count",
      ),
      alignedObservationCount: integer(
        dataSource.alignedObservationCount,
        "aligned observation count",
      ),
    },
    createdAt: isoTimestamp(value.createdAt, "creation time"),
  };
}

const invalidResponse = () =>
  new Error(
    "Quant Analysis returned an invalid response. No result was saved.",
  );

type ApiErrorDetails = {
  code: string;
  message: string;
  status: number;
  fields?: Readonly<Record<string, string>>;
  traceId?: string;
  retryAfterSeconds?: number;
};

export class QuantAnalysisApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Readonly<Record<string, string>>;
  readonly traceId?: string;
  readonly retryAfterSeconds?: number;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = "QuantAnalysisApiError";
    this.code = details.code;
    this.status = details.status;
    this.fields = details.fields;
    this.traceId = details.traceId;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

const normalizeErrorFields = (
  value: unknown,
): Readonly<Record<string, string>> | undefined => {
  if (!isRecord(value)) return undefined;
  const fields = Object.entries(value).reduce<Record<string, string>>(
    (safeFields, [key, message]) =>
      typeof message === "string" && message.trim()
        ? { ...safeFields, [key]: message.trim().slice(0, 240) }
        : safeFields,
    {},
  );
  return Object.keys(fields).length ? fields : undefined;
};

const apiError = (
  payload: unknown,
  status: number,
  retryAfterHeader: string | null,
): QuantAnalysisApiError => {
  const envelope =
    isRecord(payload) && isRecord(payload.error) ? payload.error : {};
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
  return new QuantAnalysisApiError({
    code: optionalText(envelope.code) ?? "REQUEST_FAILED",
    message:
      optionalText(envelope.message)?.slice(0, 240) ??
      "Quant Analysis is temporarily unavailable. Please try again.",
    status,
    fields: normalizeErrorFields(envelope.fields),
    traceId: optionalText(envelope.traceId),
    ...(Number.isFinite(retryAfter) && retryAfter >= 0
      ? { retryAfterSeconds: retryAfter }
      : {}),
  });
};

const responseJson = async (response: Response): Promise<unknown> =>
  response.json().catch(() => null);

const successData = (payload: unknown): unknown => {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.meta)
  ) {
    throw invalidResponse();
  }
  enumValue(
    payload.meta.schemaVersion,
    ["1.0"] as const,
    "response schema version",
  );
  return payload.data;
};

export async function fetchQuantCapabilities(
  signal?: AbortSignal,
): Promise<QuantCapabilities> {
  const response = await fetch(
    `${API_BASE}/api/v1/quant-analysis/capabilities`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    },
  );
  const payload = await responseJson(response);
  if (!response.ok) {
    throw apiError(
      payload,
      response.status,
      response.headers?.get?.("Retry-After") ?? null,
    );
  }
  return normalizeQuantCapabilities(successData(payload));
}

const wireRequest = (request: QuantRunRequest): QuantRunRequest => ({
  clientRunId: clientRunId(request.clientRunId, "client run ID"),
  symbol: request.symbol.trim().toUpperCase(),
  benchmark: request.benchmark.trim().toUpperCase(),
  period: request.period,
  interval: request.interval,
  objective: request.objective,
  riskProfile: request.riskProfile,
  ...(request.compareToRunId
    ? {
        compareToRunId: clientRunId(
          request.compareToRunId,
          "comparison run ID",
        ),
      }
    : {}),
});

const requestsMatch = (
  echoed: QuantRunRequest,
  outbound: QuantRunRequest,
): boolean =>
  echoed.clientRunId === outbound.clientRunId &&
  echoed.symbol === outbound.symbol &&
  echoed.benchmark === outbound.benchmark &&
  echoed.period === outbound.period &&
  echoed.interval === outbound.interval &&
  echoed.objective === outbound.objective &&
  echoed.riskProfile === outbound.riskProfile &&
  echoed.compareToRunId === outbound.compareToRunId;

export async function createQuantRun(
  request: QuantRunRequest,
  signal?: AbortSignal,
): Promise<QuantRunArtifact> {
  const normalizedRequest = wireRequest(request);
  const response = await fetch(`${API_BASE}/api/v1/quant-analysis/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(normalizedRequest),
    signal,
  });
  const payload = await responseJson(response);
  if (!response.ok) {
    throw apiError(
      payload,
      response.status,
      response.headers?.get?.("Retry-After") ?? null,
    );
  }
  const artifact = normalizeQuantRunArtifact(successData(payload));
  const responseTraceId = response.headers?.get?.("X-Trace-ID")?.trim();
  if (
    artifact.clientRunId !== normalizedRequest.clientRunId ||
    !responseTraceId ||
    responseTraceId !== artifact.traceId ||
    !requestsMatch(artifact.request, normalizedRequest)
  ) {
    throw invalidResponse();
  }
  return artifact;
}

export type QuantAnalysisApi = Readonly<{
  fetchCapabilities: (signal?: AbortSignal) => Promise<QuantCapabilities>;
  createRun: (
    request: QuantRunRequest,
    signal?: AbortSignal,
  ) => Promise<QuantRunArtifact>;
}>;

export const quantAnalysisApi: QuantAnalysisApi = {
  fetchCapabilities: fetchQuantCapabilities,
  createRun: createQuantRun,
};
