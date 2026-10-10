type LatestWriteRequest = {
  scopeKey: string;
  onSuccess: (isLatest: boolean) => void;
  onError: (isLatest: boolean) => void;
};

type ScopeState<Request> = {
  active: boolean;
  pending: Request | null;
};

// Keep one write in flight per owner and replace waiting writes with the latest.
// Consumers keep this queue at module scope so ordering survives React remounts.
export function createLatestWriteQueue<Request extends LatestWriteRequest>(
  write: (request: Request) => Promise<unknown>,
): { enqueue: (request: Request) => void } {
  let state: ReadonlyMap<string, ScopeState<Request>> = new Map();

  const setScopeState = (scopeKey: string, scopeState: ScopeState<Request>) => {
    state = new Map([...state, [scopeKey, scopeState]]);
  };

  const deleteScopeState = (scopeKey: string) => {
    state = new Map([...state].filter(([key]) => key !== scopeKey));
  };

  const runNext = (scopeKey: string) => {
    const scopeState = state.get(scopeKey);
    if (!scopeState || scopeState.active || scopeState.pending === null) return;

    const request = scopeState.pending;
    setScopeState(scopeKey, { active: true, pending: null });

    const settle = (callback: (isLatest: boolean) => void) => {
      // Only this active write removes its scope, after its callback returns.
      const settledScopeState = state.get(scopeKey)!;

      try {
        callback(settledScopeState.pending === null);
      } finally {
        const latestScopeState = state.get(scopeKey)!;
        if (latestScopeState.pending === null) {
          deleteScopeState(scopeKey);
          return;
        }
        setScopeState(scopeKey, { ...latestScopeState, active: false });
        runNext(scopeKey);
      }
    };

    void Promise.resolve()
      .then(() => write(request))
      .then(
        () => settle(request.onSuccess),
        () => settle(request.onError),
      );
  };

  return {
    enqueue: (request) => {
      const scopeState = state.get(request.scopeKey) ?? {
        active: false,
        pending: null,
      };
      setScopeState(request.scopeKey, { ...scopeState, pending: request });
      runNext(request.scopeKey);
    },
  };
}
