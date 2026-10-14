import * as React from "react";
import Sidebar from "@/components/sidebar";
import { cn, fitSurface } from "./uiPrimitives";

export function FitPageShell({
  children,
  className,
  skipLabel,
  skipTargetId,
}: {
  children: React.ReactNode;
  className?: string;
  skipLabel: string;
  skipTargetId: string;
}) {
  return (
    <div className={cn("min-h-[100dvh]", fitSurface.page, className)}>
      <Sidebar skipLabel={skipLabel} skipTargetId={skipTargetId} />
      {children}
    </div>
  );
}
