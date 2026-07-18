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
    <>
      <style jsx global>{`
        html,
        body,
        #__next {
          background: var(--fit-page-background);
          color-scheme: dark;
          min-height: 100%;
        }

        html {
          background-color: var(--fit-color-page-bg) !important;
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
      <div
        className={cn(
          "min-h-screen overflow-x-hidden",
          fitSurface.page,
          className,
        )}
      >
        <Sidebar skipLabel={skipLabel} skipTargetId={skipTargetId} />
        {children}
      </div>
    </>
  );
}
