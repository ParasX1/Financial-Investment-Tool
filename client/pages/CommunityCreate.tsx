import { CommunityPageShell } from "@/features/community/components/CommunityPageShell";
import { CommunityMain } from "@/features/community/components/CommunityMain";
import { getSupabaseClient } from "@/features/community/communityService";

const supabase = getSupabaseClient();

export default function CommunityCreatePage() {
  return (
    <CommunityPageShell skipLabel="Skip to create post">
      <CommunityMain mode="create" supabase={supabase} />
    </CommunityPageShell>
  );
}
