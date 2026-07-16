"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ANON;
const supabaseUrl = configuredUrl || "http://localhost:54321";
const supabaseAnonKey = configuredAnonKey || "missing-supabase-anon-key";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getConfiguredSupabaseClient(): SupabaseClient | null {
  return configuredUrl && configuredAnonKey ? supabase : null;
}

export default supabase;
