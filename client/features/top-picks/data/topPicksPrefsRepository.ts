import { getConfiguredSupabaseClient } from "@/lib/supabase";
import type { TopPicksPrefs, TopPicksSortKey } from "../types";

const DEFAULT_PREFS: TopPicksPrefs = {
  sort_key: "sharpe",
  sort_dir: "desc",
  page_size: 25,
};

const SORT_KEYS: readonly TopPicksSortKey[] = [
  "ret1y",
  "sharpe",
  "sortino",
  "volatility",
  "maxDD",
  "beta",
  "alpha",
  "infoRatio",
];

const PAGE_SIZES = [10, 25, 50, 100] as const;

const requireUserId = (userId: string): string => {
  const normalized = userId.trim();
  if (!normalized)
    throw new Error("A user is required to manage Top Picks preferences.");
  return normalized;
};

const requireClient = () => {
  const client = getConfiguredSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured for Top Picks preferences.");
  }
  return client;
};

const normalizePrefs = (value: unknown): TopPicksPrefs => {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    sort_key: SORT_KEYS.includes(record.sort_key as TopPicksSortKey)
      ? (record.sort_key as TopPicksSortKey)
      : DEFAULT_PREFS.sort_key,
    sort_dir: record.sort_dir === "asc" ? "asc" : DEFAULT_PREFS.sort_dir,
    page_size: PAGE_SIZES.includes(
      record.page_size as (typeof PAGE_SIZES)[number],
    )
      ? (record.page_size as number)
      : DEFAULT_PREFS.page_size,
  };
};

export async function loadTopPicksPrefs(
  userId: string,
): Promise<TopPicksPrefs> {
  const normalizedUserId = requireUserId(userId);
  const client = requireClient();
  const { data, error } = await client
    .from("top_picks_prefs")
    .select("sort_key, sort_dir, page_size")
    .eq("user_id", normalizedUserId)
    .single();

  if (error && (error as { code?: string }).code !== "PGRST116") throw error;
  return normalizePrefs(data);
}

export async function saveTopPicksPrefs(
  userId: string,
  prefs: TopPicksPrefs,
): Promise<void> {
  const normalizedUserId = requireUserId(userId);
  const client = requireClient();
  const normalizedPrefs = normalizePrefs(prefs);
  const { error } = await client.from("top_picks_prefs").upsert({
    user_id: normalizedUserId,
    ...normalizedPrefs,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
