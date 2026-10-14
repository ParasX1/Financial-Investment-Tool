import { randomUUID } from "node:crypto";
import { createProfileAccountClient } from "./profileAccountClient";

// Credentials exist only in mocked transports; generate them per test run.
const credentialFixture = randomUUID();
const publicTestKey = "public-test-key";

function fixture() {
  const getSession = jest.fn().mockResolvedValue({
    data: { session: { user: { id: "user-a" }, access_token: "token-a" } },
    error: null,
  });
  const resend = jest.fn().mockResolvedValue({ data: {}, error: null });
  const fetcher = jest.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          id: "user-a",
          new_email: "next@example.com",
          email_change_sent_at: "2026-07-17T00:00:00Z",
        }),
        { status: 200 },
      ),
  );
  return {
    getSession,
    resend,
    fetcher,
    account: createProfileAccountClient({ getSession, resend } as any, {
      url: "https://account.example.test",
      publishableKey: publicTestKey,
      fetch: fetcher,
    }),
  };
}

describe("profileAccountClient", () => {
  it("requests an email change with the owner token and caller-owned redirect", async () => {
    const { account, fetcher } = fixture();
    await expect(
      account.requestEmailChange({
        userId: "user-a",
        email: "NEXT@example.com",
        redirectTo: "https://app.example.com/Profile",
      }),
    ).resolves.toEqual({
      pendingEmail: "next@example.com",
      sentAt: "2026-07-17T00:00:00Z",
    });
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(url).searchParams.get("redirect_to")).toBe(
      "https://app.example.com/Profile",
    );
    expect(options).toMatchObject({
      method: "PUT",
      headers: {
        Authorization: "Bearer token-a",
        apikey: publicTestKey,
        "X-Supabase-Api-Version": "2024-01-01",
      },
    });
    expect(JSON.parse(options.body)).toEqual({ email: "next@example.com" });
  });

  it("updates passwords and resends the selected verification flow", async () => {
    const { account, fetcher, resend } = fixture();
    await account.updatePassword({
      userId: "user-a",
      password: credentialFixture,
    });
    await account.resendVerification({
      email: "next@example.com",
      kind: "email_change",
      redirectTo: "https://app.example.com/Profile",
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      password: credentialFixture,
    });
    expect(resend).toHaveBeenCalledWith({
      email: "next@example.com",
      options: { emailRedirectTo: "https://app.example.com/Profile" },
      type: "email_change",
    });
  });

  it.each([
    [429, { error_code: "over_request_rate_limit", msg: "provider internals" }],
    [422, { code: "weak_password", message: "provider internals" }],
  ])(
    "preserves safe status/code for failed account responses (%s)",
    async (status, body) => {
      const { account, fetcher } = fixture();
      fetcher.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status }),
      );
      await expect(
        account.updatePassword({
          userId: "user-a",
          password: credentialFixture,
        }),
      ).rejects.toMatchObject({
        name: "ProfileAccountError",
        operation: "password_update",
        cause: { status, code: "code" in body ? body.code : body.error_code },
      });
    },
  );

  it("classifies network errors without exposing provider details", async () => {
    const { account, fetcher } = fixture();
    fetcher.mockRejectedValueOnce(new Error("private host details"));
    await expect(
      account.updatePassword({ userId: "user-a", password: credentialFixture }),
    ).rejects.toMatchObject({
      name: "ProfileAccountError",
      cause: { name: "AuthRetryableFetchError" },
    });
  });

  it("keeps transient account-service errors retryable", async () => {
    const { account, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(
      new Response("<html>private provider details</html>", { status: 503 }),
    );
    await expect(
      account.updatePassword({ userId: "user-a", password: credentialFixture }),
    ).rejects.toMatchObject({
      name: "ProfileAccountError",
      cause: { name: "AuthRetryableFetchError", status: 503 },
    });
  });

  it("rejects invalid input and a mismatched account before dispatch", async () => {
    const { account, fetcher } = fixture();
    await expect(
      account.updatePassword({ userId: "user-a", password: "" }),
    ).rejects.toMatchObject({ operation: "password_update" });
    await expect(
      account.requestEmailChange({
        userId: "user-a",
        email: "invalid",
        redirectTo: "https://app.example.com/Profile",
      }),
    ).rejects.toMatchObject({ operation: "email_change" });
    await expect(
      account.requestEmailChange({
        userId: "user-a",
        email: "next@example.com",
        redirectTo: "javascript:void(0)",
      }),
    ).rejects.toMatchObject({ operation: "email_change" });
    await expect(
      account.updatePassword({ userId: "user-b", password: credentialFixture }),
    ).rejects.toMatchObject({ operation: "password_update" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects an invalid successful response and wraps session/verification failures", async () => {
    const { account, fetcher, getSession, resend } = fixture();
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "user-b" }), { status: 200 }),
    );
    await expect(
      account.updatePassword({ userId: "user-a", password: credentialFixture }),
    ).rejects.toMatchObject({ operation: "password_update" });
    getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("provider details"),
    });
    await expect(
      account.requestEmailChange({
        userId: "user-a",
        email: "next@example.com",
        redirectTo: "https://app.example.com/Profile",
      }),
    ).rejects.toMatchObject({ operation: "email_change" });
    resend.mockResolvedValueOnce({ error: new Error("provider details") });
    await expect(
      account.resendVerification({
        email: "next@example.com",
        kind: "signup",
        redirectTo: "https://app.example.com/Profile",
      }),
    ).rejects.toMatchObject({ operation: "verification" });
  });
});
