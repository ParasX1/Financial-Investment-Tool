"use client";

import Sidebar from "@/components/sidebar";
import { CommunityMain } from "@/features/community/components/CommunityMain";
import { getSupabaseClient } from "@/features/community/communityService";
import communityStyles from "@/styles/community.module.css";

const supabase = getSupabaseClient();

export default function CommunityPage() {
  return (
    <>
      <style jsx global>{`
        html,
        body,
        #__next {
          background: #000000;
          color-scheme: dark;
          min-height: 100%;
        }

        body {
          overflow-x: hidden;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden bg-[#000000]">
        <a href="#community-main" className={communityStyles.skipLink}>
          Skip to community content
        </a>
        <Sidebar />
        <CommunityMain supabase={supabase} />
      </div>
    </>
  );
}
