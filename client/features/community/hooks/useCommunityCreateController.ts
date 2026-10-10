// File purpose: Composes only the Community Create draft, publish, navigation, auth, and feedback lifecycle.
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCommunityCreateActions } from "./useCommunityCreateActions";
import { useCommunityOwnedDraft } from "./useCommunityOwnedDraft";
import { useCommunityFeedback } from "./useCommunityFeedback";
import { useCommunityNavigationState } from "./useCommunityNavigationState";
import { useCommunitySession } from "./useCommunitySession";

export function useCommunityCreateController(supabase: SupabaseClient | null) {
  const navigation = useCommunityNavigationState();
  const session = useCommunitySession(supabase);
  const draftState = useCommunityOwnedDraft(session.sessionKey);
  const feedbackState = useCommunityFeedback();
  const createActions = useCommunityCreateActions({
    currentUserId: session.currentUserId,
    draft: draftState.draft,
    pushFeedback: feedbackState.pushFeedback,
    resetDraft: draftState.resetDraft,
    sessionKey: session.sessionKey,
    supabase,
  });

  return {
    ...navigation,
    ...draftState,
    ...feedbackState,
    ...createActions,
    currentUserId: session.currentUserId,
  };
}
