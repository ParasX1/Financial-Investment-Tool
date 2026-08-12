import { saveTopPicksPrefs } from "../data/topPicksPrefsRepository";
import type { TopPicksPrefs } from "../types";

export type TopPicksPrefsSaveRequest = {
  scopeKey: string;
  userId: string;
  prefs: TopPicksPrefs;
  onSuccess: (isLatest: boolean) => void;
  onError: () => void;
};

type TopPicksPrefsSaveScopeState = {
  active: boolean;
  pending: TopPicksPrefsSaveRequest | null;
};

type TopPicksPrefsSaveQueueState = ReadonlyMap<
  string,
  TopPicksPrefsSaveScopeState
>;

type TopPicksPrefsSaveQueue = {
  enqueue: (request: TopPicksPrefsSaveRequest) => void;
};

function createTopPicksPrefsSaveQueue(): TopPicksPrefsSaveQueue {
  let state: TopPicksPrefsSaveQueueState = new Map();

  const setScopeState = (
    scopeKey: string,
    scopeState: TopPicksPrefsSaveScopeState,
  ) => {
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
      const settledScopeState = state.get(scopeKey);
      if (!settledScopeState) return;

      try {
        callback(settledScopeState.pending === null);
      } finally {
        const latestScopeState = state.get(scopeKey);
        if (!latestScopeState) return;
        if (latestScopeState.pending === null) {
          deleteScopeState(scopeKey);
          return;
        }
        setScopeState(scopeKey, { ...latestScopeState, active: false });
        runNext(scopeKey);
      }
    };

    void Promise.resolve()
      .then(() => saveTopPicksPrefs(request.userId, request.prefs))
      .then(
        () => settle(request.onSuccess),
        () => settle(() => request.onError()),
      );
  };

  return {
    enqueue: (request) => {
      const scopeState = state.get(request.scopeKey) ?? {
        active: false,
        pending: null,
      };
      setScopeState(request.scopeKey, {
        ...scopeState,
        pending: request,
      });
      runNext(request.scopeKey);
    },
  };
}

export const topPicksPrefsSaveQueue = createTopPicksPrefsSaveQueue();
