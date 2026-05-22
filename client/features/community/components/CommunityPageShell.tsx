import * as React from "react";
import Sidebar from "@/components/sidebar";

export function CommunityPageShell({
  children,
  skipLabel,
}: {
  children: React.ReactNode;
  skipLabel: string;
}) {
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

        html {
          scrollbar-gutter: stable;
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
        <Sidebar skipLabel={skipLabel} skipTargetId="community-main" />
        {children}
      </div>
    </>
  );
}
