import * as React from "react";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

let mockAuthState: { loading: boolean; user: { id: string } | null };
const mockRepository = {
  list: jest.fn<any>(),
};
let useSavedWatchlistSymbols: typeof import("./useSavedWatchlistSymbols")["useSavedWatchlistSymbols"];

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("useSavedWatchlistSymbols", () => {
  beforeAll(() => {
    jest.doMock("@/components/authContext", () => ({
      useAuth: () => mockAuthState,
    }));
    jest.doMock("@/components/supabase", () => ({
      __esModule: true,
      default: {},
    }));
    jest.doMock("../data/savedWatchlistSymbolsReader", () => ({
      createSavedWatchlistSymbolsReader: () => mockRepository,
    }));
    useSavedWatchlistSymbols =
      require("./useSavedWatchlistSymbols").useSavedWatchlistSymbols;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { loading: true, user: null };
    mockRepository.list.mockResolvedValue([]);
  });

  it("waits for auth, loads a narrow symbol list, and clears it on sign-out", async () => {
    let latest: ReturnType<typeof useSavedWatchlistSymbols> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useSavedWatchlistSymbols();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(mockRepository.list).not.toHaveBeenCalled();
    expect(latest).toMatchObject({
      authenticated: false,
      failed: false,
      loading: false,
      symbols: [],
    });

    mockAuthState = { loading: false, user: { id: "user-a" } };
    mockRepository.list.mockResolvedValue(["CBA.AX", "BHP.AX"]);
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(mockRepository.list).toHaveBeenCalledWith("user-a");
    expect(latest).toMatchObject({
      authenticated: true,
      failed: false,
      loading: false,
      symbols: ["CBA.AX", "BHP.AX"],
    });

    mockAuthState = { loading: false, user: null };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest).toMatchObject({
      authenticated: false,
      failed: false,
      loading: false,
      symbols: [],
    });
    renderer!.unmount();
  });

  it("reports load failure without leaking repository details", async () => {
    mockAuthState = { loading: false, user: { id: "user-a" } };
    mockRepository.list.mockRejectedValue(new Error("database host is offline"));
    let latest: ReturnType<typeof useSavedWatchlistSymbols> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useSavedWatchlistSymbols();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest).toMatchObject({
      authenticated: true,
      failed: true,
      loading: false,
      symbols: [],
    });
    renderer!.unmount();
  });

  it("discards an old account response after the user changes", async () => {
    let resolveOld!: (symbols: readonly string[]) => void;
    mockAuthState = { loading: false, user: { id: "user-a" } };
    mockRepository.list.mockImplementation((userId: string) =>
      userId === "user-a"
        ? new Promise<readonly string[]>((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve(["WES.AX"]),
    );
    let latest: ReturnType<typeof useSavedWatchlistSymbols> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useSavedWatchlistSymbols();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    mockAuthState = { loading: false, user: { id: "user-b" } };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest!.symbols).toEqual(["WES.AX"]);

    await act(async () => {
      resolveOld(["CBA.AX"]);
      await flushPromises();
    });
    expect(latest!.symbols).toEqual(["WES.AX"]);
    renderer!.unmount();
  });

  it("never renders symbols owned by the previous auth user", async () => {
    let resolveUserB!: (symbols: readonly string[]) => void;
    mockAuthState = { loading: false, user: { id: "user-a" } };
    mockRepository.list.mockImplementation((userId: string) =>
      userId === "user-a"
        ? Promise.resolve(["CBA.AX"])
        : new Promise<readonly string[]>((resolve) => {
            resolveUserB = resolve;
          }),
    );
    const renders: Array<{ authUserId: string | null; symbols: string[] }> = [];
    let renderer: ReactTestRenderer;

    function Probe() {
      const state = useSavedWatchlistSymbols();
      renders.push({
        authUserId: mockAuthState.user?.id ?? null,
        symbols: [...state.symbols],
      });
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    renders.length = 0;
    mockAuthState = { loading: false, user: { id: "user-b" } };
    act(() => {
      renderer!.update(<Probe />);
    });

    expect(
      renders.some(
        (render) =>
          render.authUserId === "user-b" && render.symbols.includes("CBA.AX"),
      ),
    ).toBe(false);

    await act(async () => {
      resolveUserB(["WES.AX"]);
      await flushPromises();
    });
    renderer!.unmount();
  });

  it("masks saved symbols immediately while auth reloads or signs out", async () => {
    mockAuthState = { loading: false, user: { id: "user-a" } };
    mockRepository.list.mockResolvedValue(["CBA.AX"]);
    const renders: Array<{ loading: boolean; symbols: string[] }> = [];
    let renderer: ReactTestRenderer;

    function Probe() {
      const state = useSavedWatchlistSymbols();
      renders.push({ loading: state.loading, symbols: [...state.symbols] });
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    renders.length = 0;
    mockAuthState = { loading: true, user: { id: "user-a" } };
    act(() => {
      renderer!.update(<Probe />);
    });
    expect(renders.every((render) => render.symbols.length === 0)).toBe(true);

    renders.length = 0;
    mockAuthState = { loading: false, user: null };
    act(() => {
      renderer!.update(<Probe />);
    });
    expect(renders.every((render) => render.symbols.length === 0)).toBe(true);
    renderer!.unmount();
  });
});
