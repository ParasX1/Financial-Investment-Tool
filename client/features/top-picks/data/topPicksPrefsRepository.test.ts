import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { TopPicksPrefs } from "../types";

type QueryResult = {
  data: unknown;
  error: unknown;
};

const DEFAULT_PREFS: TopPicksPrefs = {
  sort_key: "sharpe",
  sort_dir: "desc",
  page_size: 25,
};

const mockGetConfiguredSupabaseClient = jest.fn<() => unknown>();
let loadTopPicksPrefs: (typeof import("./topPicksPrefsRepository"))["loadTopPicksPrefs"];
let saveTopPicksPrefs: (typeof import("./topPicksPrefsRepository"))["saveTopPicksPrefs"];

const createReadClient = () => {
  const single = jest.fn<() => Promise<QueryResult>>();
  const eq = jest.fn((_column: string, _value: string) => ({ single }));
  const select = jest.fn((_columns: string) => ({ eq }));
  const from = jest.fn((_table: string) => ({ select }));

  return { client: { from }, eq, from, select, single };
};

const createWriteClient = () => {
  const upsert =
    jest.fn<
      (payload: Record<string, unknown>) => Promise<{ error: unknown }>
    >();
  const from = jest.fn((_table: string) => ({ upsert }));

  return { client: { from }, from, upsert };
};

describe("Top Picks preferences repository", () => {
  beforeAll(() => {
    jest.doMock("@/lib/supabase", () => ({
      getConfiguredSupabaseClient: mockGetConfiguredSupabaseClient,
    }));
    ({
      loadTopPicksPrefs,
      saveTopPicksPrefs,
    } = require("./topPicksPrefsRepository"));
  });

  beforeEach(() => {
    mockGetConfiguredSupabaseClient.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("rejects preference access clearly when Supabase is unconfigured", async () => {
    mockGetConfiguredSupabaseClient.mockReturnValue(null);

    await expect(loadTopPicksPrefs("account-a")).rejects.toThrow(
      "Supabase is not configured for Top Picks preferences.",
    );
    await expect(saveTopPicksPrefs("account-a", DEFAULT_PREFS)).rejects.toThrow(
      "Supabase is not configured for Top Picks preferences.",
    );
    expect(mockGetConfiguredSupabaseClient).toHaveBeenCalledTimes(2);
  });

  it("rejects missing users before touching the persistence client", async () => {
    await expect(loadTopPicksPrefs("   ")).rejects.toThrow(
      "A user is required to manage Top Picks preferences.",
    );
    await expect(saveTopPicksPrefs("\t", DEFAULT_PREFS)).rejects.toThrow(
      "A user is required to manage Top Picks preferences.",
    );
    expect(mockGetConfiguredSupabaseClient).not.toHaveBeenCalled();
  });

  it("loads valid preferences through the owner-scoped query", async () => {
    const query = createReadClient();
    query.single.mockResolvedValue({
      data: { sort_key: "ret1y", sort_dir: "asc", page_size: 100 },
      error: null,
    });
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);

    await expect(loadTopPicksPrefs("  account-a  ")).resolves.toEqual({
      sort_key: "ret1y",
      sort_dir: "asc",
      page_size: 100,
    });
    expect(query.from).toHaveBeenCalledWith("top_picks_prefs");
    expect(query.select).toHaveBeenCalledWith("sort_key, sort_dir, page_size");
    expect(query.eq).toHaveBeenCalledWith("user_id", "account-a");
    expect(query.single).toHaveBeenCalledTimes(1);
  });

  it("normalizes malformed stored values to safe defaults", async () => {
    const query = createReadClient();
    query.single.mockResolvedValue({
      data: { sort_key: "price", sort_dir: "sideways", page_size: 500 },
      error: null,
    });
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);

    await expect(loadTopPicksPrefs("account-a")).resolves.toEqual(
      DEFAULT_PREFS,
    );
  });

  it("treats an absent preference row as default preferences", async () => {
    const query = createReadClient();
    query.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);

    await expect(loadTopPicksPrefs("account-a")).resolves.toEqual(
      DEFAULT_PREFS,
    );
  });

  it("propagates returned and rejected preference read failures", async () => {
    const returnedFailure = new Error("read failed");
    const rejectedFailure = new Error("network failed");
    const query = createReadClient();
    query.single
      .mockResolvedValueOnce({ data: null, error: returnedFailure })
      .mockRejectedValueOnce(rejectedFailure);
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);

    await expect(loadTopPicksPrefs("account-a")).rejects.toBe(returnedFailure);
    await expect(loadTopPicksPrefs("account-a")).rejects.toBe(rejectedFailure);
  });

  it("validates and scopes the upsert payload", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-31T12:34:56.789Z"));
    const query = createWriteClient();
    query.upsert.mockResolvedValue({ error: null });
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);
    const invalidPrefs = {
      sort_key: "price",
      sort_dir: "sideways",
      page_size: 500,
    } as unknown as TopPicksPrefs;

    await saveTopPicksPrefs("  account-b  ", invalidPrefs);

    expect(query.from).toHaveBeenCalledWith("top_picks_prefs");
    expect(query.upsert).toHaveBeenCalledWith({
      user_id: "account-b",
      ...DEFAULT_PREFS,
      updated_at: "2026-07-31T12:34:56.789Z",
    });
  });

  it("propagates returned and rejected preference save failures", async () => {
    const returnedFailure = new Error("write failed");
    const rejectedFailure = new Error("network failed");
    const query = createWriteClient();
    query.upsert
      .mockResolvedValueOnce({ error: returnedFailure })
      .mockRejectedValueOnce(rejectedFailure);
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);

    await expect(saveTopPicksPrefs("account-a", DEFAULT_PREFS)).rejects.toBe(
      returnedFailure,
    );
    await expect(saveTopPicksPrefs("account-a", DEFAULT_PREFS)).rejects.toBe(
      rejectedFailure,
    );
  });

  it("uses each requested owner without retaining cross-user state", async () => {
    const query = createReadClient();
    query.single.mockResolvedValue({ data: null, error: null });
    mockGetConfiguredSupabaseClient.mockReturnValue(query.client);

    await loadTopPicksPrefs("account-a");
    await loadTopPicksPrefs("account-b");

    expect(query.eq.mock.calls).toEqual([
      ["user_id", "account-a"],
      ["user_id", "account-b"],
    ]);
  });
});
