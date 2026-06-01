import {
  CommunityMain,
  CommunityPageShell,
  getSupabaseClient,
} from "@/features/community";

const supabase = getSupabaseClient();

export default function CommunityCreatePage() {
  return (
    <CommunityPageShell skipLabel="Skip to create post">
      <CommunityMain mode="create" supabase={supabase} />
    </CommunityPageShell>
  );
}
