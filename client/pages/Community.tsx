import { CommunityPageShell } from "@/features/community/components/CommunityPageShell";
import { CommunityMain } from "@/features/community/components/CommunityMain";
import { getSupabaseClient } from "@/features/community/communityService";

const supabase = getSupabaseClient();

export default function CommunityPage() {
  return (
    <CommunityPageShell skipLabel="Skip to community content">
      <CommunityMain mode="feed" supabase={supabase} />
    </CommunityPageShell>
  );
}
