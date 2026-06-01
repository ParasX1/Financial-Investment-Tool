import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let communitySupabaseClient: SupabaseClient | null | undefined;

export function getCommunitySupabaseClient(): SupabaseClient | null {
  if (communitySupabaseClient !== undefined) return communitySupabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ANON;

  communitySupabaseClient =
    url && anonKey ? createClient(url, anonKey) : null;

  return communitySupabaseClient;
}
