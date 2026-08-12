import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import type { QuantAnalysisApi } from "../api/quantAnalysisApi";
import type {
  QuantCapabilities,
  QuantRunArtifact,
  QuantRunForm,
} from "../types";
import { useQuantAnalysisController } from "./useQuantAnalysisController";

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
      id: "deterministic",
      label: "Deterministic baseline",
      version: "1.0.0",
      enabled: true,
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

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

type Controller = ReturnType<typeof useQuantAnalysisController>;

function Probe({
  api,
  onRender,
  storage,
  userId,
}: {
  api: QuantAnalysisApi;
  onRender: (controller: Controller) => void;
  storage: Storage;
  userId: string;
}) {
  const controller = useQuantAnalysisController({
    api,
    authLoading: false,
    clientRunIdFactory: () => "11111111-1111-4111-8111-111111111111",
    storage,
    userId,
  });
  onRender(controller);
  return null;
}

async function renderProbe(
  api: QuantAnalysisApi,
  storage: Storage,
  onRender: (controller: Controller) => void,
) {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <Probe api={api} onRender={onRender} storage={storage} userId="user-a" />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

describe("useQuantAnalysisController execution guards", () => {
  it("does not call createRun when capabilities have no enabled provider", async () => {
    let latest!: Controller;
    const createRun = jest.fn();
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue({
        ...capabilities,
        providers: capabilities.providers.map((provider) => ({
          ...provider,
          enabled: false,
        })),
      }),
      createRun,
    };
    const tree = await renderProbe(api, memoryStorage(), (controller) => {
      latest = controller;
    });

    let accepted = true;
    await act(async () => {
      accepted = await latest.runStudy();
    });

    expect(accepted).toBe(false);
    expect(createRun).not.toHaveBeenCalled();
    tree.unmount();
  });

  it("discards account A's response when it resolves after switching to B", async () => {
    let latest!: Controller;
    const storage = memoryStorage();
    const pending = deferred<QuantRunArtifact>();
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue(capabilities),
      createRun: jest.fn(() => pending.promise),
    };
    const capture = (controller: Controller) => {
      latest = controller;
    };
    const tree = await renderProbe(api, storage, capture);

    let request!: Promise<boolean>;
    await act(async () => {
      request = latest.runStudy();
      await Promise.resolve();
    });
    expect(api.createRun).toHaveBeenCalledTimes(1);

    await act(async () => {
      tree.update(
        <Probe api={api} onRender={capture} storage={storage} userId="user-b" />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      pending.resolve({ runId: "late-user-a-run" } as QuantRunArtifact);
      await request;
      await Promise.resolve();
    });

    expect(latest.sessionReady).toBe(true);
    expect(latest.activeRun).toBeNull();
    expect(latest.history).toEqual([]);
    expect(latest.runFailure).toBeNull();
    expect(latest.running).toBe(false);
    expect(JSON.stringify(storage)).not.toContain("late-user-a-run");
    tree.unmount();
  });
});
