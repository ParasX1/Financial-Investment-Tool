import * as React from "react";
import renderer, { act } from "react-test-renderer";
import { AuthProvider, useAuth } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  __esModule: true,
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const unsubscribe = jest.fn();
let latestAuth: AuthContextValue;

function AuthStateProbe() {
  latestAuth = useAuth();
  const { loading, user } = latestAuth;
  return (
    <output data-loading={loading} data-user-id={user?.id ?? "signed-out"} />
  );
}

describe("AuthProvider lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          id: "auth-subscription",
          callback: jest.fn(),
          unsubscribe,
        },
      },
    });
  });

  it("recovers from a failed session restore and unsubscribes on unmount", async () => {
    auth.getSession.mockRejectedValue(
      new Error("provider details must stay private"),
    );
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let view!: renderer.ReactTestRenderer;

    await act(async () => {
      view = renderer.create(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>,
      );
      await Promise.resolve();
    });

    expect(view.root.findByType("output").props).toMatchObject({
      "data-loading": false,
      "data-user-id": "signed-out",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to restore the authentication session.",
    );
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Error),
    );

    act(() => view.unmount());
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it.each(["resolve", "reject"])(
    "keeps a newer sign-out when initial restore later %ss",
    async (outcome) => {
      let resolve!: (value: any) => void;
      let reject!: (error: Error) => void;
      auth.getSession.mockReturnValue(
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
      );
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      let view!: renderer.ReactTestRenderer;
      act(() => {
        view = renderer.create(
          <AuthProvider>
            <AuthStateProbe />
          </AuthProvider>,
        );
      });
      expect(view.root.findByType("output").props["data-loading"]).toBe(true);
      act(() => {
        auth.onAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null);
      });
      await act(async () => {
        if (outcome === "resolve")
          resolve({
            data: { session: { user: { id: "account-a" } } },
            error: null,
          });
        else reject(new Error("late restore failure"));
      });
      expect(view.root.findByType("output").props).toMatchObject({
        "data-loading": false,
        "data-user-id": "signed-out",
      });
      act(() => view.unmount());
      consoleError.mockRestore();
    },
  );

  it("discards an initial-session event arriving after a newer account event", async () => {
    auth.getSession.mockReturnValue(new Promise(() => undefined));
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>,
      );
    });
    act(() => {
      const notify = auth.onAuthStateChange.mock.calls[0][0];
      notify("SIGNED_IN", { user: { id: "account-b" } } as any);
      notify("INITIAL_SESSION", { user: { id: "account-a" } } as any);
    });
    expect(latestAuth).toMatchObject({
      loading: false,
      user: { id: "account-b" },
    });
    act(() => view.unmount());
  });

  it("keeps account action results and failures explicit", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: {} as any, error: null });
    auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    auth.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: "https://example.test" },
      error: null,
    });
    auth.signOut.mockResolvedValue({ error: null });
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { origin: "https://app.example.test" } },
    });
    let view!: renderer.ReactTestRenderer;
    await act(async () => {
      view = renderer.create(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>,
      );
    });
    await latestAuth.signIn("a@example.test", "fixture-password");
    await expect(
      latestAuth.signUp("a@example.test", "fixture-password"),
    ).resolves.toBe("verify-email");
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          data: {},
          emailRedirectTo: "https://app.example.test/Portfolio",
        },
      }),
    );
    auth.signUp.mockResolvedValueOnce({
      data: { session: {} as any, user: null },
      error: null,
    });
    await expect(
      latestAuth.signUp("a@example.test", "fixture-password", { name: "A" }),
    ).resolves.toBe("confirmed");
    await latestAuth.signInWithGoogle("/Profile");
    await latestAuth.signOut();
    const error = new Error("fixture failure");
    auth.signInWithPassword.mockResolvedValueOnce({
      data: {} as any,
      error: error as any,
    });
    auth.signUp.mockResolvedValueOnce({ data: {} as any, error: error as any });
    auth.signInWithOAuth.mockResolvedValueOnce({
      data: {} as any,
      error: error as any,
    });
    auth.signOut.mockResolvedValueOnce({ error: error as any });
    await expect(
      latestAuth.signIn("a@example.test", "fixture-password"),
    ).rejects.toBe(error);
    await expect(
      latestAuth.signUp("a@example.test", "fixture-password"),
    ).rejects.toBe(error);
    await expect(latestAuth.signInWithGoogle()).rejects.toBe(error);
    await expect(latestAuth.signOut()).rejects.toBe(error);
    act(() => view.unmount());
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });
});
