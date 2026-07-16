import {
  CommunityFeedScreen,
  CommunityPageShell,
  getSupabaseClient,
} from "@/features/community";

const supabase = getSupabaseClient();

export default function CommunityPage() {
  return (
    <CommunityPageShell skipLabel="Skip to community content">
      <CommunityFeedScreen supabase={supabase} />
    </CommunityPageShell>
  );
}
