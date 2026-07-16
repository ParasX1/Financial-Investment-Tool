// File purpose: Exposes the Community auth owner and a stable key for isolating async route work.
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/authContext";

export function useCommunitySession(supabase: SupabaseClient | null) {
  const { user, loading } = useAuth();
  const currentUserId = supabase ? (user?.id ?? null) : null;
  const authLoading = Boolean(supabase && loading);
  const sessionKey = !supabase
    ? "demo"
    : authLoading
      ? "auth-loading"
      : currentUserId
        ? `user:${currentUserId}`
        : "signed-out";

  return {
    authLoading,
    currentUserId,
    sessionKey,
  };
}
