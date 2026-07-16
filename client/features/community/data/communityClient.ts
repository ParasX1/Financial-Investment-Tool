// File purpose: Reuses the app Supabase singleton while preserving Community's explicit demo mode.
import { getConfiguredSupabaseClient } from "@/components/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getCommunitySupabaseClient(): SupabaseClient | null {
  return getConfiguredSupabaseClient();
}
