import {
  CommunityCreateScreen,
  CommunityPageShell,
  getSupabaseClient,
} from "@/features/community";

const supabase = getSupabaseClient();

export default function CommunityCreatePage() {
  return (
    <CommunityPageShell skipLabel="Skip to create post">
      <CommunityCreateScreen supabase={supabase} />
    </CommunityPageShell>
  );
}
