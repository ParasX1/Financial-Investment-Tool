import * as React from "react";
import { FitPageShell } from "@/components/shared/FitPageShell";

export function CommunityPageShell({
  children,
  skipLabel,
}: {
  children: React.ReactNode;
  skipLabel: string;
}) {
  return (
    <FitPageShell skipLabel={skipLabel} skipTargetId="community-main">
      {children}
    </FitPageShell>
  );
}
