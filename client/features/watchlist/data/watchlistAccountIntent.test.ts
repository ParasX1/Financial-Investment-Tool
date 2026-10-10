import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "@jest/globals";

import type { WatchlistRepository } from "../types";
import { createWatchlistRepository } from "./watchlistRepository";

const OWNER_A = "41414141-4141-4141-8141-414141414141";
const OWNER_B = "42424242-4242-4242-8242-424242424242";
const INITIAL_SYMBOLS = ["CBA.AX", "BHP.AX"];

const actions: Array<{
  name: string;
  rpc: string;
  payload: Record<string, unknown>;
  errorCode: string;
  expectedSymbols: string[];
  run: (repository: WatchlistRepository) => Promise<void>;
}> = [
  {
    name: "remove",
    rpc: "remove_watchlist_item",
    payload: { item_symbol: "CBA.AX" },
    errorCode: "remove_failed",
    expectedSymbols: ["BHP.AX"],
    run: (repository) => repository.remove(OWNER_A, " cba.ax "),
  },
  {
    name: "reorder",
    rpc: "reorder_watchlist",
    payload: { ordered_symbols: ["BHP.AX", "CBA.AX"] },
    errorCode: "order_failed",
    expectedSymbols: ["BHP.AX", "CBA.AX"],
    run: (repository) => repository.saveOrder(OWNER_A, [" bhp.ax ", "cba.ax"]),
  },
];

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// The installed SDK awaits its supported accessToken callback before fetch.
// The Data API is mocked here; the pgTAP tests verify the database guard itself.
async function handoff(
  action: (typeof actions)[number],
  nextToken: "A" | "A-refreshed" | "B",
  missingContract = false,
) {
  let token = "A";
  let release!: () => void;
  let hit!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    hit = resolve;
  });
  const watchlists: Record<string, string[]> = {
    [OWNER_A]: [...INITIAL_SYMBOLS],
    [OWNER_B]: [...INITIAL_SYMBOLS],
  };
  const requests: Array<{
    url: string;
    authorization: string | null;
    body: Record<string, unknown>;
  }> = [];
  const client = createClient("https://watchlist-intent.test", "dummy", {
    accessToken: async () => {
      hit();
      await gate;
      return `token-${token}`;
    },
    global: {
      fetch: async (input, init) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body ?? "{}"));
        const authorization = new Headers(init?.headers).get("Authorization");
        requests.push({ url, authorization, body });
        if (missingContract && Object.hasOwn(body, "p_expected_user_id")) {
          return response(
            { code: "PGRST202", message: "RPC contract missing" },
            404,
          );
        }
        const jwtOwner = authorization === "Bearer token-B" ? OWNER_B : OWNER_A;
        // Without an expected owner, the preserved legacy RPC acts as jwtOwner.
        if (
          Object.hasOwn(body, "p_expected_user_id") &&
          body.p_expected_user_id !== jwtOwner
        ) {
          return response(
            {
              code: "42501",
              message: "Your session changed. Please try again.",
            },
            403,
          );
        }
        watchlists[jwtOwner] = url.endsWith("/remove_watchlist_item")
          ? watchlists[jwtOwner].filter((symbol) => symbol !== body.item_symbol)
          : [...(body.ordered_symbols as string[])];
        return response(null);
      },
    },
  });
  const pending = action.run(createWatchlistRepository(client));
  const settled = pending.then(
    () => ({ error: null }),
    (error: unknown) => ({ error }),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      blocked,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("SDK token selection was not reached")),
          2000,
        );
      }),
    ]);
    expect(requests).toHaveLength(0);
    token = nextToken;
    release();
    return { ...(await settled), requests, watchlists };
  } finally {
    clearTimeout(timer);
    release();
  }
}

describe("Watchlist expected account at actual SDK request handoff", () => {
  it.each(actions)(
    "rejects $name when B supplies the request token after A starts",
    async (action) => {
      const result = await handoff(action, "B");
      expect(result.watchlists[OWNER_B]).toEqual(INITIAL_SYMBOLS);
      expect(result.watchlists[OWNER_A]).toEqual(INITIAL_SYMBOLS);
      expect(result.error).toMatchObject({ code: action.errorCode });
      expect(result.requests).toEqual([
        {
          url: `https://watchlist-intent.test/rest/v1/rpc/${action.rpc}`,
          authorization: "Bearer token-B",
          body: { ...action.payload, p_expected_user_id: OWNER_A },
        },
      ]);
    },
  );

  it.each(actions)(
    "permits $name for an unchanged A session",
    async (action) => {
      const result = await handoff(action, "A");
      expect(result.error).toBeNull();
      expect(result.requests[0].authorization).toBe("Bearer token-A");
      expect(result.requests[0].body.p_expected_user_id).toBe(OWNER_A);
      expect(result.watchlists[OWNER_A]).toEqual(action.expectedSymbols);
      expect(result.watchlists[OWNER_B]).toEqual(INITIAL_SYMBOLS);
    },
  );

  it.each(actions)(
    "permits $name after a same-owner token refresh",
    async (action) => {
      const result = await handoff(action, "A-refreshed");
      expect(result.error).toBeNull();
      expect(result.requests[0].authorization).toBe("Bearer token-A-refreshed");
      expect(result.requests[0].body.p_expected_user_id).toBe(OWNER_A);
      expect(result.watchlists[OWNER_A]).toEqual(action.expectedSymbols);
      expect(result.watchlists[OWNER_B]).toEqual(INITIAL_SYMBOLS);
    },
  );

  it.each(actions)(
    "fails $name without retrying the legacy RPC if the new contract is missing",
    async (action) => {
      const result = await handoff(action, "A", true);
      expect(result.error).toMatchObject({ code: action.errorCode });
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].body).toEqual({
        ...action.payload,
        p_expected_user_id: OWNER_A,
      });
      expect(result.watchlists[OWNER_A]).toEqual(INITIAL_SYMBOLS);
      expect(result.watchlists[OWNER_B]).toEqual(INITIAL_SYMBOLS);
    },
  );
});
