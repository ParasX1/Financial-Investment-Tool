import * as React from "react";
import {
  QuantAnalysisApiError,
  quantAnalysisApi,
  type QuantAnalysisApi,
} from "../api/quantAnalysisApi";
import {
  appendSessionRun,
  buildRunComparison,
  QUANT_SESSION_RUN_LIMIT,
  toggleComparisonRun,
} from "../lib/runHistory";
import {
  createQuantSessionScope,
  getQuantRunStorageKey,
  loadSessionRuns,
  saveSessionRuns,
} from "../lib/sessionRunStorage";
import type {
  QuantCapabilities,
  QuantFormErrors,
  QuantRunArtifact,
  QuantRunForm,
  QuantRunRequest,
} from "../types";

const DEFAULT_FORM: QuantRunForm = {
  symbol: "BHP.AX",
  benchmark: "^AXJO",
  period: "6mo",
  interval: "1d",
  objective: "signal_scan",
  riskProfile: "balanced",
};

const CANONICAL_SYMBOL_MAX_LENGTH = 15;
const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=-]{0,14}$/;
const EMPTY_HISTORY: readonly QuantRunArtifact[] = [];
const EMPTY_COMPARISON_IDS: readonly string[] = [];

const getStorage = (): Storage | null =>
  typeof window === "undefined" ? null : window.sessionStorage;

export function createClientRunId(): string {
  const secureCrypto = globalThis.crypto;
  if (typeof secureCrypto?.randomUUID === "function") {
    return secureCrypto.randomUUID();
  }
  if (typeof secureCrypto?.getRandomValues !== "function") {
    throw new Error("Secure random identifier generation is unavailable.");
  }
  const randomBytes = secureCrypto.getRandomValues(new Uint8Array(16));
  const uuidBytes = Uint8Array.from(randomBytes, (value, index) => {
    if (index === 6) return (value & 0x0f) | 0x40;
    if (index === 8) return (value & 0x3f) | 0x80;
    return value;
  });
  const hex = Array.from(uuidBytes, (value) =>
    value.toString(16).padStart(2, "0"),
  );
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

const capabilityLimit = (capabilities: QuantCapabilities | null): number => {
  return Math.min(
    CANONICAL_SYMBOL_MAX_LENGTH,
    capabilities?.limits.maxSymbolLength ?? CANONICAL_SYMBOL_MAX_LENGTH,
  );
};

const capabilityHistoryLimit = (
  capabilities: QuantCapabilities | null,
): number => {
  return Math.min(
    QUANT_SESSION_RUN_LIMIT,
    capabilities?.limits.maxSessionRuns ?? QUANT_SESSION_RUN_LIMIT,
  );
};

const hasEnabledProvider = (capabilities: QuantCapabilities | null): boolean =>
  Boolean(capabilities?.providers.some((provider) => provider.enabled));

const normalizeFormWithCapabilities = (
  form: QuantRunForm,
  capabilities: QuantCapabilities,
): QuantRunForm => {
  const defaults = capabilities.defaults;
  return {
    symbol: form.symbol || defaults.symbol,
    benchmark: form.benchmark || defaults.benchmark,
    period: capabilities.periods.includes(form.period)
      ? form.period
      : defaults.period,
    interval: capabilities.intervals.includes(form.interval)
      ? form.interval
      : defaults.interval,
    objective: capabilities.objectives.includes(form.objective)
      ? form.objective
      : defaults.objective,
    riskProfile: capabilities.riskProfiles.includes(form.riskProfile)
      ? form.riskProfile
      : defaults.riskProfile,
  };
};

export function validateQuantRunForm(
  form: QuantRunForm,
  maximumLength: number,
): QuantFormErrors {
  const validateSymbol = (value: string, label: string): string | undefined => {
    const normalized = value.trim().toUpperCase();
    const effectiveMaximumLength = Math.min(
      maximumLength,
      CANONICAL_SYMBOL_MAX_LENGTH,
    );
    if (!normalized) return `${label} is required.`;
    if (normalized.length > effectiveMaximumLength) {
      return `${label} must be ${effectiveMaximumLength} characters or fewer.`;
    }
    if (!SYMBOL_PATTERN.test(normalized)) {
      return `${label} can use letters, numbers, periods, carets, dashes, or equals signs; only a caret may begin with punctuation.`;
    }
    return undefined;
  };
  const symbol = validateSymbol(form.symbol, "Symbol");
  const benchmarkValidation = validateSymbol(form.benchmark, "Benchmark");
  const benchmark =
    benchmarkValidation ??
    (!symbol &&
    form.symbol.trim().toUpperCase() === form.benchmark.trim().toUpperCase()
      ? "Benchmark must differ from symbol."
      : undefined);
  return {
    ...(symbol ? { symbol } : {}),
    ...(benchmark ? { benchmark } : {}),
  };
}

type RunFailure = Readonly<{
  message: string;
  traceId?: string;
  retryAfterSeconds?: number;
  request?: QuantRunRequest;
}>;

type ScopedState<Value> = Readonly<{
  scopeKey: string;
  value: Value;
}>;

export function useQuantAnalysisController({
  api = quantAnalysisApi,
  authLoading,
  clientRunIdFactory = createClientRunId,
  storage = getStorage(),
  userId,
}: {
  api?: QuantAnalysisApi;
  authLoading: boolean;
  clientRunIdFactory?: () => string;
  storage?: Storage | null;
  userId: string | null;
}) {
  const sessionScope = React.useMemo(
    () => createQuantSessionScope(authLoading, userId),
    [authLoading, userId],
  );
  const sessionScopeKey = sessionScope
    ? getQuantRunStorageKey(sessionScope)
    : null;
  const currentScopeKeyRef = React.useRef<string | null>(sessionScopeKey);
  currentScopeKeyRef.current = sessionScopeKey;
  const [capabilities, setCapabilities] =
    React.useState<QuantCapabilities | null>(null);
  const [capabilitiesError, setCapabilitiesError] = React.useState<
    string | null
  >(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = React.useState(true);
  const [capabilitiesAttempt, setCapabilitiesAttempt] = React.useState(0);
  const [form, setForm] = React.useState<QuantRunForm>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = React.useState<QuantFormErrors>({});
  const [runningScopeKey, setRunningScopeKey] = React.useState<string | null>(
    null,
  );
  const [runFailureState, setRunFailureState] =
    React.useState<ScopedState<RunFailure> | null>(null);
  const [activeRunState, setActiveRunState] =
    React.useState<ScopedState<QuantRunArtifact> | null>(null);
  const [historyState, setHistoryState] = React.useState<ScopedState<
    readonly QuantRunArtifact[]
  > | null>(null);
  const [comparisonState, setComparisonState] = React.useState<ScopedState<
    readonly string[]
  > | null>(null);
  const activeRequestRef = React.useRef(0);
  const runAbortRef = React.useRef<AbortController | null>(null);
  const defaultsHydratedRef = React.useRef(false);

  React.useEffect(() => {
    const controller = new AbortController();
    setCapabilitiesLoading(true);
    setCapabilitiesError(null);
    api
      .fetchCapabilities(controller.signal)
      .then((loaded) => {
        setCapabilities(loaded);
        const hydrateDefaults = !defaultsHydratedRef.current;
        defaultsHydratedRef.current = true;
        setForm((current) =>
          hydrateDefaults
            ? { ...loaded.defaults }
            : normalizeFormWithCapabilities(current, loaded),
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCapabilitiesError(
          error instanceof Error
            ? error.message
            : "Research controls are temporarily unavailable.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCapabilitiesLoading(false);
      });
    return () => controller.abort();
  }, [api, capabilitiesAttempt]);

  React.useEffect(() => {
    activeRequestRef.current += 1;
    runAbortRef.current?.abort();
    runAbortRef.current = null;
    setRunningScopeKey(null);
    setRunFailureState(null);
    setActiveRunState(null);
    setComparisonState(null);

    if (!sessionScope || !sessionScopeKey) {
      setHistoryState(null);
      return;
    }
    const runs = storage ? loadSessionRuns(storage, sessionScope) : [];
    setHistoryState({ scopeKey: sessionScopeKey, value: runs });
  }, [sessionScope, sessionScopeKey, storage]);

  React.useEffect(() => {
    if (
      !storage ||
      !sessionScope ||
      !sessionScopeKey ||
      historyState?.scopeKey !== sessionScopeKey
    ) {
      return;
    }
    saveSessionRuns(storage, sessionScope, historyState.value);
  }, [historyState, sessionScope, sessionScopeKey, storage]);

  React.useEffect(() => {
    if (!capabilities || !sessionScopeKey) return;
    const limit = capabilityHistoryLimit(capabilities);
    setHistoryState((current) => {
      if (
        current?.scopeKey !== sessionScopeKey ||
        current.value.length <= limit
      ) {
        return current;
      }
      return {
        scopeKey: sessionScopeKey,
        value: current.value.slice(0, limit),
      };
    });
  }, [capabilities, sessionScopeKey]);

  React.useEffect(() => {
    if (!sessionScopeKey || historyState?.scopeKey !== sessionScopeKey) {
      return;
    }
    const retainedRunIds = new Set(historyState.value.map((run) => run.runId));
    setComparisonState((current) => {
      if (current?.scopeKey !== sessionScopeKey) return current;
      const retained = current.value.filter((runId) =>
        retainedRunIds.has(runId),
      );
      return retained.length === current.value.length
        ? current
        : { scopeKey: sessionScopeKey, value: retained };
    });
  }, [historyState, sessionScopeKey]);

  React.useEffect(
    () => () => {
      runAbortRef.current?.abort();
    },
    [],
  );

  const sessionReady =
    sessionScopeKey !== null && historyState?.scopeKey === sessionScopeKey;
  const history = sessionReady ? historyState.value : EMPTY_HISTORY;
  const activeRun =
    sessionReady && activeRunState?.scopeKey === sessionScopeKey
      ? activeRunState.value
      : null;
  const runFailure =
    sessionReady && runFailureState?.scopeKey === sessionScopeKey
      ? runFailureState.value
      : null;
  const running = sessionReady && runningScopeKey === sessionScopeKey;
  const comparisonRunIds =
    sessionReady && comparisonState?.scopeKey === sessionScopeKey
      ? comparisonState.value
      : EMPTY_COMPARISON_IDS;

  const updateForm = React.useCallback(
    <Key extends keyof QuantRunForm>(key: Key, value: QuantRunForm[Key]) => {
      setForm((current) => ({ ...current, [key]: value }));
      if (key === "symbol" || key === "benchmark") {
        setFormErrors((current) => ({ ...current, [key]: undefined }));
      }
    },
    [],
  );

  const executeRun = React.useCallback(
    async (request: QuantRunRequest) => {
      if (
        !sessionReady ||
        !sessionScopeKey ||
        !hasEnabledProvider(capabilities)
      ) {
        return;
      }
      const requestScopeKey = sessionScopeKey;
      const requestIndex = activeRequestRef.current + 1;
      activeRequestRef.current = requestIndex;
      runAbortRef.current?.abort();
      const controller = new AbortController();
      runAbortRef.current = controller;
      setRunningScopeKey(requestScopeKey);
      setRunFailureState(null);
      try {
        const run = await api.createRun(request, controller.signal);
        if (
          activeRequestRef.current !== requestIndex ||
          currentScopeKeyRef.current !== requestScopeKey
        ) {
          return;
        }
        setActiveRunState({ scopeKey: requestScopeKey, value: run });
        setHistoryState((current) => {
          if (current?.scopeKey !== requestScopeKey) return current;
          return {
            scopeKey: requestScopeKey,
            value: appendSessionRun(
              current.value,
              run,
              capabilityHistoryLimit(capabilities),
            ),
          };
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          activeRequestRef.current !== requestIndex ||
          currentScopeKeyRef.current !== requestScopeKey
        )
          return;
        const apiFailure =
          error instanceof QuantAnalysisApiError ? error : null;
        setRunFailureState({
          scopeKey: requestScopeKey,
          value: {
            message:
              error instanceof Error
                ? error.message
                : "The research run could not be completed. Please try again.",
            ...(apiFailure?.traceId ? { traceId: apiFailure.traceId } : {}),
            ...(apiFailure?.retryAfterSeconds !== undefined
              ? { retryAfterSeconds: apiFailure.retryAfterSeconds }
              : {}),
            request,
          },
        });
      } finally {
        if (
          activeRequestRef.current === requestIndex &&
          currentScopeKeyRef.current === requestScopeKey
        ) {
          setRunningScopeKey((current) =>
            current === requestScopeKey ? null : current,
          );
        }
      }
    },
    [api, capabilities, sessionReady, sessionScopeKey],
  );

  const runStudy = React.useCallback(async () => {
    const errors = validateQuantRunForm(form, capabilityLimit(capabilities));
    setFormErrors(errors);
    if (
      Object.keys(errors).length ||
      !capabilities ||
      !hasEnabledProvider(capabilities) ||
      !sessionReady ||
      !sessionScopeKey
    ) {
      return false;
    }
    let generatedClientRunId: string;
    try {
      generatedClientRunId = clientRunIdFactory();
    } catch {
      setRunFailureState({
        scopeKey: sessionScopeKey,
        value: {
          message:
            "This browser cannot create a secure run identifier. Reload or use a supported browser.",
        },
      });
      return false;
    }
    const request: QuantRunRequest = {
      clientRunId: generatedClientRunId,
      symbol: form.symbol.trim().toUpperCase(),
      benchmark: form.benchmark.trim().toUpperCase(),
      period: form.period,
      interval: form.interval,
      objective: form.objective,
      riskProfile: form.riskProfile,
    };
    await executeRun(request);
    return true;
  }, [
    capabilities,
    clientRunIdFactory,
    executeRun,
    form,
    sessionReady,
    sessionScopeKey,
  ]);

  const retryRun = React.useCallback(async () => {
    if (!runFailure?.request) return;
    await executeRun(runFailure.request);
  }, [executeRun, runFailure]);

  const historyLimit = capabilityHistoryLimit(capabilities);
  const retainedHistory = history.slice(0, historyLimit);
  const comparisonRuns = comparisonRunIds
    .map((runId) => retainedHistory.find((run) => run.runId === runId))
    .filter((run): run is QuantRunArtifact => Boolean(run));
  const comparison =
    comparisonRuns.length === 2
      ? buildRunComparison(comparisonRuns[0]!, comparisonRuns[1]!)
      : null;

  return {
    activeRun,
    capabilities,
    capabilitiesError,
    capabilitiesLoading,
    comparison,
    comparisonRunIds,
    comparisonRuns,
    form,
    formErrors,
    history: retainedHistory,
    historyLimit,
    runFailure,
    running,
    sessionError: !authLoading && userId !== null && sessionScope === null,
    sessionReady,
    retryCapabilities: () => setCapabilitiesAttempt((attempt) => attempt + 1),
    retryRun,
    runStudy,
    toggleComparison: (runId: string) => {
      if (
        !sessionReady ||
        !sessionScopeKey ||
        !retainedHistory.some((run) => run.runId === runId)
      ) {
        return;
      }
      setComparisonState((current) => {
        const currentRunIds =
          current?.scopeKey === sessionScopeKey
            ? current.value
            : EMPTY_COMPARISON_IDS;
        return {
          scopeKey: sessionScopeKey,
          value: toggleComparisonRun(currentRunIds, runId),
        };
      });
    },
    updateForm,
  };
}
