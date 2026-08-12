export type QuantPeriod = "1mo" | "3mo" | "6mo" | "1y" | "2y";
export type QuantInterval = "1d";
export type QuantObjective = "signal_scan" | "risk_review" | "scenario_plan";
export type QuantRiskProfile = "conservative" | "balanced" | "aggressive";
export type QuantProviderStage = "diagnose" | "decide";
export type QuantStructuredOutput = "validated" | "native";
export type QuantDirection =
  | "positive"
  | "negative"
  | "neutral"
  | "mixed"
  | "unknown";
export type QuantStrength = "strong" | "moderate" | "weak" | "unavailable";

export type QuantRunRequest = Readonly<{
  clientRunId: string;
  symbol: string;
  benchmark: string;
  period: QuantPeriod;
  interval: QuantInterval;
  objective: QuantObjective;
  riskProfile: QuantRiskProfile;
  compareToRunId?: string;
}>;

export type QuantProviderCapability = Readonly<{
  id: string;
  label: string;
  version: string;
  enabled: boolean;
  remote: boolean;
  deterministic: boolean;
  stages: readonly QuantProviderStage[];
  structuredOutput: QuantStructuredOutput;
}>;

export type QuantPlaybookCapability = Readonly<{
  id: string;
  version: string;
  title: string;
  origin: "clean_room";
  contentHash: string;
}>;

export type QuantCapabilityDefaults = Readonly<{
  symbol: string;
  benchmark: string;
  period: QuantPeriod;
  interval: QuantInterval;
  objective: QuantObjective;
  riskProfile: QuantRiskProfile;
}>;

export type QuantCapabilityLimits = Readonly<{
  maxBodyBytes: number;
  maxSymbolLength: number;
  maxValidationRetries: number;
  maxSessionRuns: number;
  runRateLimit: number;
  runRateWindowSeconds: number;
}>;

export type QuantCapabilities = Readonly<{
  schemaVersion: string;
  periods: readonly QuantPeriod[];
  intervals: readonly QuantInterval[];
  objectives: readonly QuantObjective[];
  riskProfiles: readonly QuantRiskProfile[];
  defaults: QuantCapabilityDefaults;
  providers: readonly QuantProviderCapability[];
  featureSet: Readonly<{ id: string; version: string }>;
  playbooks: readonly QuantPlaybookCapability[];
  limits: QuantCapabilityLimits;
  persistence: Readonly<{
    serverHistory: false;
    clientMode: "session_storage";
  }>;
  remoteGenerationEnabled: boolean;
  cache: Readonly<{ policy: "no-store" }>;
}>;

export type QuantEvidence = Readonly<{
  key: string;
  label: string;
  value: number | null;
  unit: string;
  finite: boolean;
  warnings: readonly string[];
}>;

export type EvidenceReference = Readonly<{
  evidenceId: string;
  direction: QuantDirection;
  strength: QuantStrength;
}>;

export type Diagnosis = Readonly<{
  regime: "bullish" | "bearish" | "range_bound" | "insufficient_data";
  direction: QuantDirection;
  strength: QuantStrength;
  summary: string;
  templateVersion: string;
  confidence: number;
  evidence: readonly EvidenceReference[];
  riskCodes: readonly string[];
  risks: readonly string[];
  dataQuality: "complete" | "partial" | "insufficient";
}>;

export type DecisionScenario = Readonly<{
  code: string;
  name: "base" | "bull" | "bear";
  condition: string;
  implication: string;
}>;

export type Decision = Readonly<{
  stance: "constructive" | "neutral" | "defensive" | "insufficient_data";
  playbook: Readonly<{
    id: string;
    version: string;
    title: string;
    origin: "clean_room";
    contentHash: string;
  }>;
  thesis: string;
  templateVersion: string;
  scenarios: readonly DecisionScenario[];
  invalidationCodes: readonly string[];
  invalidationConditions: readonly string[];
  riskControlCodes: readonly string[];
  riskControls: readonly string[];
  confidence: number;
}>;

export type QuantStageStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "partial"
  | "failed"
  | "skipped";

export type QuantStageRecord = Readonly<{
  status: QuantStageStatus;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  providerVersion?: string;
  validationAttemptCount?: number;
  issueCodes?: readonly string[];
  issues?: readonly string[];
}>;

export type QuantArtifactStageRecord = Readonly<{
  status: "succeeded" | "partial";
  durationMs: number;
  startedAt: string;
  completedAt: string;
  providerVersion: string;
  validationAttemptCount: number;
  issueCodes: readonly string[];
}>;

export type QuantValidationAttempt = Readonly<{
  stage: "diagnose" | "decide";
  attempt: number;
  outcome: "succeeded" | "failed";
  issueCodes: readonly string[];
}>;

export type QuantRunArtifact = Readonly<{
  schemaVersion: string;
  runId: string;
  clientRunId: string;
  sourceRunId?: string;
  traceId: string;
  status: "succeeded" | "partial";
  request: QuantRunRequest;
  evidence: readonly QuantEvidence[];
  diagnosis: Diagnosis;
  decision: Decision;
  versions: Readonly<{
    engine: string;
    featureSet: string;
    provider: string;
    playbook: string;
  }>;
  stages: Readonly<{
    diagnose: QuantArtifactStageRecord;
    decide: QuantArtifactStageRecord;
  }>;
  validationAttempts: readonly QuantValidationAttempt[];
  warnings: readonly string[];
  dataSource: Readonly<{
    name: string;
    symbol: string;
    benchmark: string;
    requestedStartDate: string;
    requestedEndDate: string;
    actualStartDate: string | null;
    actualEndDate: string | null;
    observationCount: number;
    benchmarkObservationCount: number;
    alignedObservationCount: number;
  }>;
  createdAt: string;
}>;

export type QuantRunForm = Readonly<{
  symbol: string;
  benchmark: string;
  period: QuantPeriod;
  interval: QuantInterval;
  objective: QuantObjective;
  riskProfile: QuantRiskProfile;
}>;

export type QuantFormErrors = Readonly<
  Partial<Record<keyof Pick<QuantRunForm, "symbol" | "benchmark">, string>>
>;
