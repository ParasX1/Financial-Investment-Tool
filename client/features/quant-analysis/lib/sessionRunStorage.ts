import { normalizeQuantRunArtifact } from "../api/quantAnalysisApi";
import type { QuantRunArtifact } from "../types";
import { QUANT_SESSION_RUN_LIMIT } from "./runHistory";

const QUANT_RUN_STORAGE_KEY_PREFIX = "fit.quant-analysis.runs.v1";
const STORAGE_VERSION = 1;
const MAX_STORAGE_BYTES = 1_000_000;
const AUTH_USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export type QuantSessionScope =
  | Readonly<{ kind: "anonymous" }>
  | Readonly<{ kind: "authenticated"; userId: string }>;

export function createQuantSessionScope(
  authLoading: boolean,
  userId: string | null,
): QuantSessionScope | null {
  if (authLoading) return null;
  if (userId === null) return { kind: "anonymous" };
  const normalizedUserId = userId.trim();
  if (!AUTH_USER_ID_PATTERN.test(normalizedUserId)) return null;
  return { kind: "authenticated", userId: normalizedUserId };
}

export function getQuantRunStorageKey(scope: QuantSessionScope): string {
  return scope.kind === "authenticated"
    ? `${QUANT_RUN_STORAGE_KEY_PREFIX}.user.${scope.userId}`
    : `${QUANT_RUN_STORAGE_KEY_PREFIX}.anonymous`;
}

const cloneSafeArtifact = (run: QuantRunArtifact): QuantRunArtifact =>
  normalizeQuantRunArtifact({
    schemaVersion: run.schemaVersion,
    runId: run.runId,
    clientRunId: run.clientRunId,
    sourceRunId: run.sourceRunId,
    traceId: run.traceId,
    status: run.status,
    request: run.request,
    evidence: run.evidence,
    diagnosis: run.diagnosis,
    decision: run.decision,
    versions: run.versions,
    stages: run.stages,
    validationAttempts: run.validationAttempts,
    warnings: run.warnings,
    dataSource: run.dataSource,
    createdAt: run.createdAt,
  });

export function loadSessionRuns(
  storage: Storage,
  scope: QuantSessionScope,
): readonly QuantRunArtifact[] {
  try {
    const raw = storage.getItem(getQuantRunStorageKey(scope));
    if (!raw || raw.length > MAX_STORAGE_BYTES) return [];
    const payload: unknown = JSON.parse(raw);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("version" in payload) ||
      payload.version !== STORAGE_VERSION ||
      !("runs" in payload) ||
      !Array.isArray(payload.runs)
    ) {
      return [];
    }
    return payload.runs
      .slice(0, QUANT_SESSION_RUN_LIMIT)
      .map(normalizeQuantRunArtifact);
  } catch {
    return [];
  }
}

export function saveSessionRuns(
  storage: Storage,
  scope: QuantSessionScope,
  runs: readonly QuantRunArtifact[],
): void {
  try {
    const safeRuns: QuantRunArtifact[] = [];
    for (const run of runs.slice(0, QUANT_SESSION_RUN_LIMIT)) {
      const candidateRuns = [...safeRuns, cloneSafeArtifact(run)];
      const serializedCandidate = JSON.stringify({
        version: STORAGE_VERSION,
        runs: candidateRuns,
      });
      if (serializedCandidate.length > MAX_STORAGE_BYTES) break;
      safeRuns.push(candidateRuns[candidateRuns.length - 1]!);
    }
    storage.setItem(
      getQuantRunStorageKey(scope),
      JSON.stringify({ version: STORAGE_VERSION, runs: safeRuns }),
    );
  } catch {
    // Session storage is an enhancement; a blocked/quota-limited browser stays usable.
  }
}
