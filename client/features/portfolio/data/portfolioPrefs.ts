import { getConfiguredSupabaseClient } from "@/lib/supabase";

type PortfolioPrefs = { tags: string[] };

export async function loadPortfolioConfig(
  userId: string,
): Promise<PortfolioPrefs> {
  const client = getConfiguredSupabaseClient();
  if (!client) return { tags: [] };

  const { data, error } = await client
    .from("portfolio_prefs")
    .select("tags")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { tags: [] };
    throw error;
  }
  return { tags: data?.tags ?? [] };
}

export async function savePortfolioConfig(
  userId: string,
  prefs: PortfolioPrefs,
) {
  const client = getConfiguredSupabaseClient();
  if (!client) return;

  const { error } = await client.from("portfolio_prefs").upsert(
    {
      user_id: userId,
      tags: prefs.tags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
