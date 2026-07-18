import * as React from "react";
import renderer, { act } from "react-test-renderer";
import { AuthProvider, useAuth } from "./AuthContext";
import supabase from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  __esModule: true,
  default: {
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

function AuthStateProbe() {
  const { loading, user } = useAuth();
  return (
    <output data-loading={loading} data-user-id={user?.id ?? "signed-out"} />
  );
}

describe("AuthProvider lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
  });

  it("recovers from a failed session restore and unsubscribes on unmount", async () => {
    auth.getSession.mockRejectedValue(
      new Error("provider details must stay private"),
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
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
});
