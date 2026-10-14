import { randomUUID } from "node:crypto";
import { createClient, type Session } from "@supabase/supabase-js";
import { createProfileAccountClient } from "./profileAccountClient";

// Credentials exist only in mocked transports; generate them per test run.
const credentialFixture = randomUUID();

const url = "https://account-intent.example.test";
const key = "public-test-key";

function session(id: string, token = `token-${id}`): Session {
  return {
    access_token: token,
    refresh_token: `refresh-${id}`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id,
      email: `${id}@example.test`,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01",
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function setup() {
  let saved = JSON.stringify(session("A"));
  let holdNextLock = false;
  const lockStarted = deferred<void>();
  const releaseLock = deferred<void>();
  const fetcher = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return json(
        String(input).includes("/token?") ? session("B") : session("A").user,
      );
    },
  );
  const client = createClient(url, key, {
    auth: {
      storageKey: "account-intent-session",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => saved,
        setItem: (_, value) => {
          saved = value;
        },
        removeItem: () => {
          saved = "";
        },
      },
      lock: async (_, __, work) => {
        if (holdNextLock) {
          holdNextLock = false;
          lockStarted.resolve();
          await releaseLock.promise;
        }
        return work();
      },
    },
    global: { fetch: fetcher },
  });
  await client.auth.initialize();
  await new Promise<void>((resolve) => setImmediate(resolve));
  return {
    client,
    fetcher,
    account: createProfileAccountClient(client.auth, {
      url,
      publishableKey: key,
      fetch: fetcher,
    }),
    holdLock() {
      holdNextLock = true;
    },
    lockStarted,
    releaseLock,
    replaceSession(next: Session | null) {
      saved = next ? JSON.stringify(next) : "";
    },
  };
}

describe("profile credentials with the installed Supabase SDK", () => {
  it.each(["password", "email"])(
    "does not send A's queued %s mutation as B",
    async (operation) => {
      const { account, client, fetcher, holdLock, lockStarted, releaseLock } =
        await setup();
      holdLock();
      const mutation =
        operation === "password"
          ? account.updatePassword({
              userId: "A",
              password: credentialFixture,
            })
          : account.requestEmailChange({
              userId: "A",
              email: "A-new@example.test",
              redirectTo: "https://app.example.test/Profile",
            });
      const outcome = mutation.then(
        () => null,
        (error: unknown) => error,
      );
      await lockStarted.promise;
      await client.auth.signInWithPassword({
        email: "B@example.test",
        password: credentialFixture,
      });
      releaseLock.resolve();
      expect(await outcome).toMatchObject({ name: "ProfileAccountError" });
      expect(
        fetcher.mock.calls.some(([input]) => String(input).includes("/user")),
      ).toBe(false);
      expect((await client.auth.getSession()).data.session?.user.id).toBe("B");
    },
  );

  it("sends A's captured token and leaves B active when A's response is late", async () => {
    const { account, client, fetcher } = await setup();
    const dispatched = deferred<void>();
    const response = deferred<Response>();
    fetcher.mockImplementation(async (input) => {
      if (String(input).includes("/user")) {
        dispatched.resolve();
        return response.promise;
      }
      return json(session("B"));
    });
    const mutation = account.requestEmailChange({
      userId: "A",
      email: "next@example.test",
      redirectTo: "https://app.example.test/Profile",
    });
    await dispatched.promise;
    const updateCall = fetcher.mock.calls.find(([input]) =>
      String(input).includes("/user"),
    )!;
    expect(new Headers(updateCall[1]?.headers).get("Authorization")).toBe(
      "Bearer token-A",
    );
    expect(JSON.parse(updateCall[1]?.body as string)).toMatchObject({
      email: "next@example.test",
    });
    await client.auth.signInWithPassword({
      email: "B@example.test",
      password: credentialFixture,
    });
    response.resolve(
      json({
        ...session("A").user,
        new_email: "next@example.test",
        email_change_sent_at: "2026-10-09T00:00:00Z",
      }),
    );
    await expect(mutation).resolves.toEqual({
      pendingEmail: "next@example.test",
      sentAt: "2026-10-09T00:00:00Z",
    });
    expect((await client.auth.getSession()).data.session?.user.id).toBe("B");
  });

  it("allows a refreshed token for the same owner and refuses a signed-out session", async () => {
    const { account, fetcher, replaceSession } = await setup();
    replaceSession(session("A", "token-A-refreshed"));
    await account.updatePassword({
      userId: "A",
      password: credentialFixture,
    });
    expect(
      new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization"),
    ).toBe("Bearer token-A-refreshed");
    replaceSession(null);
    await expect(
      account.updatePassword({ userId: "A", password: credentialFixture }),
    ).rejects.toMatchObject({ name: "ProfileAccountError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads pending email from Auth without changing the active SDK session", async () => {
    const { account, client, fetcher } = await setup();
    fetcher.mockResolvedValueOnce(
      json({
        ...session("A").user,
        new_email: "pending@example.test",
        email_change_sent_at: "2026-10-09T00:00:00Z",
      }),
    );
    await expect(
      account.getEmailChangeStatus({ userId: "A" }),
    ).resolves.toEqual({
      pendingEmail: "pending@example.test",
      sentAt: "2026-10-09T00:00:00Z",
    });
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
    expect(
      (await client.auth.getSession()).data.session?.user.new_email,
    ).toBeUndefined();
  });

  it("does not sign out B when a late account A read reports a missing session", async () => {
    const { account, client, fetcher } = await setup();
    const dispatched = deferred<void>();
    const response = deferred<Response>();
    fetcher.mockImplementation(async (input) => {
      if (String(input).includes("/user")) {
        dispatched.resolve();
        return response.promise;
      }
      return json(session("B"));
    });
    const result = account.getEmailChangeStatus({ userId: "A" }).then(
      () => null,
      (error: unknown) => error,
    );
    await dispatched.promise;
    await client.auth.signInWithPassword({
      email: "B@example.test",
      password: credentialFixture,
    });
    response.resolve(json({ code: "session_not_found" }, 403));
    expect(await result).toMatchObject({ name: "ProfileAccountError" });
    expect((await client.auth.getSession()).data.session?.user.id).toBe("B");
  });
});
