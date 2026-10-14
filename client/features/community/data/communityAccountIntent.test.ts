import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createCommunityPost,
  reportCommunityPost,
  setCommunityPostLike,
  setCommunityPostSaved,
} from "./communityService";

const draft = {
  title: "A intended draft",
  body: "Research notes",
  tags: [],
  tickers: [],
  postType: "discussion" as const,
  timeFrame: null,
  symbol: null,
  sourceUrl: null,
};
const actions: Array<{
  name: string;
  precheck: boolean;
  run: (db: SupabaseClient) => Promise<unknown>;
}> = [
  {
    name: "create",
    precheck: true,
    run: (db) => createCommunityPost(db, draft, "A"),
  },
  {
    name: "like",
    precheck: false,
    run: (db) => setCommunityPostLike(db, "post", true, "A"),
  },
  {
    name: "unlike",
    precheck: false,
    run: (db) => setCommunityPostLike(db, "post", false, "A"),
  },
  {
    name: "save",
    precheck: true,
    run: (db) => setCommunityPostSaved(db, "post", true, "A"),
  },
  {
    name: "report",
    precheck: true,
    run: (db) =>
      reportCommunityPost(db, {
        postId: "post",
        reason: "other",
        expectedUserId: "A",
      }),
  },
];

function session(id: string, replacement = false) {
  return {
    access_token: `token-${id}${replacement ? "-replacement" : ""}`,
    refresh_token: `refresh-${id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id, email: `${id}@example.test` },
  };
}

// Real SDK session/token selection, controlled auth lock, and a mocked Data API.
// Native SQL tests independently prove the mocked ownership rejection contract.
async function handoff(
  action: (typeof actions)[number],
  nextOwner: string,
  legacy = false,
) {
  let stored: string | null = JSON.stringify(session("A"));
  let lockCalls = 0;
  let release!: () => void;
  let hit!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    hit = resolve;
  });
  const requests: Array<{
    url: string;
    authorization: string | null;
    body: Record<string, unknown>;
  }> = [];
  const db = createClient("https://example.test", "dummy", {
    auth: {
      storageKey: "community-intent-test",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => stored,
        setItem: (_key, value) => {
          stored = value;
        },
        removeItem: () => {
          stored = null;
        },
      },
      lock: async (_name, _timeout, callback) => {
        lockCalls += 1;
        // initialize, session read, then REST token selection in this SDK version.
        if (lockCalls === 3) {
          hit();
          await gate;
        }
        return callback();
      },
    },
    global: {
      fetch: async (input, init) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body ?? "{}"));
        const authorization = new Headers(init?.headers).get("Authorization");
        if (url.includes("/token?")) return response(session(nextOwner, true));
        requests.push({ url, authorization, body });
        if (legacy && url.includes("/rpc/create_")) {
          return response(
            {
              code: "PGRST202",
              message: "Could not find create_community_post_with_tickers",
            },
            404,
          );
        }
        const jwtOwner = authorization
          ?.slice("Bearer token-".length)
          .replace(/-replacement$/, "");
        const expectedOwner =
          body.p_expected_author_id ??
          body.p_expected_user_id ??
          body.author_id ??
          body.user_id ??
          body.reporter_id ??
          jwtOwner;
        if (expectedOwner !== jwtOwner)
          return response(
            {
              code: "42501",
              message: "Your session changed. Please try again.",
            },
            403,
          );
        if (url.includes("create_") || (legacy && url.includes("/posts"))) {
          return response({
            id: "post",
            author_id: jwtOwner,
            title: draft.title,
            body: draft.body,
            tags: [],
            votes: 0,
            post_type: "discussion",
            created_at: "2026-10-09T00:00:00Z",
          });
        }
        return response(url.includes("/rpc/") ? 1 : null);
      },
    },
  });
  await db.auth.initialize();
  // Like RPCs do not perform a service precheck; finish the SDK's initial
  // session notification before arming their request-token handoff.
  if (!action.precheck) await db.auth.getSession();
  const request = action.run(db);
  // Attach an error handler immediately while the controlled request is pending.
  const settled = request.then(
    (value) => ({ value, error: null }),
    (error: unknown) => ({ value: null, error }),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      blocked,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("SDK token handoff lock was not reached")),
          2000,
        );
      }),
    ]);
    await db.auth.signInWithPassword({
      email: `${nextOwner}@example.test`,
      password: "mock",
    });
    release();
    return { ...(await settled), requests };
  } finally {
    clearTimeout(timer);
    release();
    db.auth.stopAutoRefresh();
  }
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Community expected account at actual SDK request handoff", () => {
  it.each(actions)(
    "rejects $name if B supplies the request JWT after A started",
    async (action) => {
      const result = await handoff(action, "B");
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].authorization).toBe(
        "Bearer token-B-replacement",
      );
      expect(Object.values(result.requests[0].body)).toContain("A");
      expect(result.error).toMatchObject({ code: "42501" });
    },
  );
  it.each(actions)(
    "permits $name after a same-owner session refresh",
    async (action) => {
      const result = await handoff(action, "A");
      expect(result.error).toBeNull();
      expect(result.requests[0].authorization).toBe(
        "Bearer token-A-replacement",
      );
    },
  );
  it("keeps A's author explicit in the legacy create fallback under B's JWT", async () => {
    const result = await handoff(actions[0], "B", true);
    expect(result.error).toMatchObject({ code: "42501" });
    expect(result.requests).toHaveLength(2);
    expect(result.requests[1].body.author_id).toBe("A");
    expect(result.requests[1].authorization).toBe("Bearer token-B-replacement");
  });
});
