import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredPublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_ANON;
const supabaseUrl = configuredUrl ?? "http://localhost:54321";
const supabaseKey =
  configuredPublishableKey ?? "missing-supabase-publishable-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getConfiguredSupabaseClient(): SupabaseClient | null {
  return configuredUrl && configuredPublishableKey ? supabase : null;
}
