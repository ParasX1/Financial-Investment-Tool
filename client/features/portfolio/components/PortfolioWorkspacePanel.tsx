import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import {
  PORTFOLIO_PANEL_MIN_HEIGHT,
  PORTFOLIO_PANEL_MIN_WIDTH,
  clampNumber,
} from "../portfolioWorkspaceLayout";
import type {
  PortfolioPanelLayout,
  PortfolioPanelLayoutPatch,
} from "../types";

type InteractionState = {
  type: "drag" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayout: PortfolioPanelLayout;
};

export function PortfolioWorkspacePanel({
  children,
  compact,
  layout,
  subtitle,
  title,
  workspaceWidth,
  onClose,
  onFocus,
  onLayoutChange,
}: {
  children: React.ReactNode;
  compact: boolean;
  layout: PortfolioPanelLayout;
  subtitle: string;
  title: string;
  workspaceWidth: number;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onLayoutChange: (id: string, patch: PortfolioPanelLayoutPatch) => void;
}) {
  const interactionRef = React.useRef<InteractionState | null>(null);

  const updateFromPointer = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) return;

      const dx = event.clientX - interaction.startClientX;
      const dy = event.clientY - interaction.startClientY;
      const { startLayout } = interaction;

      if (interaction.type === "drag") {
        const maxX = Math.max(0, workspaceWidth - startLayout.width);
        onLayoutChange(layout.id, {
          x: clampNumber(startLayout.x + dx, 0, maxX),
          y: Math.max(0, startLayout.y + dy),
        });
        return;
      }

      const maxWidth = Math.max(PORTFOLIO_PANEL_MIN_WIDTH, workspaceWidth - startLayout.x);
      onLayoutChange(layout.id, {
        width: clampNumber(startLayout.width + dx, PORTFOLIO_PANEL_MIN_WIDTH, maxWidth),
        height: Math.max(PORTFOLIO_PANEL_MIN_HEIGHT, startLayout.height + dy),
      });
    },
    [layout.id, onLayoutChange, workspaceWidth],
  );

  const startInteraction = React.useCallback(
    (
      event: React.PointerEvent<HTMLElement>,
      type: InteractionState["type"],
    ) => {
      if (compact || event.button !== 0) return;

      event.preventDefault();
      onFocus(layout.id);
      interactionRef.current = {
        type,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayout: layout,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [compact, layout, onFocus],
  );

  const stopInteraction = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (interactionRef.current?.pointerId !== event.pointerId) return;

      interactionRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const handleTitleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (compact) return;

      const step = event.shiftKey ? 40 : 12;
      const maxX = Math.max(0, workspaceWidth - layout.width);

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onLayoutChange(layout.id, { x: clampNumber(layout.x - step, 0, maxX) });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onLayoutChange(layout.id, { x: clampNumber(layout.x + step, 0, maxX) });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        onLayoutChange(layout.id, { y: Math.max(0, layout.y - step) });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onLayoutChange(layout.id, { y: layout.y + step });
      }
    },
    [compact, layout, onLayoutChange, workspaceWidth],
  );

  const handleResizeKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (compact) return;

      const step = event.shiftKey ? 40 : 12;
      const maxWidth = Math.max(
        PORTFOLIO_PANEL_MIN_WIDTH,
        workspaceWidth - layout.x,
      );

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onLayoutChange(layout.id, {
          width: clampNumber(
            layout.width - step,
            PORTFOLIO_PANEL_MIN_WIDTH,
            maxWidth,
          ),
        });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onLayoutChange(layout.id, {
          width: clampNumber(
            layout.width + step,
            PORTFOLIO_PANEL_MIN_WIDTH,
            maxWidth,
          ),
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        onLayoutChange(layout.id, {
          height: Math.max(PORTFOLIO_PANEL_MIN_HEIGHT, layout.height - step),
        });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onLayoutChange(layout.id, { height: layout.height + step });
      }
    },
    [compact, layout, onLayoutChange, workspaceWidth],
  );

  const panelStyle: React.CSSProperties = compact
    ? {
        height: `${clampNumber(layout.height, 340, 560)}px`,
      }
    : {
        height: layout.height,
        transform: `translate3d(${layout.x}px, ${layout.y}px, 0)`,
        width: layout.width,
        zIndex: layout.zIndex,
      };

  return (
    <section
      aria-label={title}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface)] shadow-[0_18px_44px_rgba(0,0,0,0.34)] transition-[border-color,box-shadow]",
        compact ? "relative w-full" : "absolute left-0 top-0 will-change-transform",
      )}
      onPointerDown={() => onFocus(layout.id)}
      style={panelStyle}
    >
      <div
        className={cn(
          "flex h-11 shrink-0 select-none items-center gap-3 border-b border-[var(--fit-color-border-subtle)] bg-[#101014] px-3",
          compact ? "" : "cursor-grab active:cursor-grabbing",
          FIT_FOCUS_VISIBLE,
        )}
        role="group"
        tabIndex={0}
        aria-label={`${title} window. Drag the title bar to move it.`}
        onKeyDown={handleTitleKeyDown}
        onPointerDown={(event) => startInteraction(event, "drag")}
        onPointerMove={updateFromPointer}
        onPointerUp={stopInteraction}
        onPointerCancel={stopInteraction}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#141419] text-[var(--fit-color-accent-strong)]"
          aria-hidden="true"
        >
          <DragIndicatorRoundedIcon sx={{ fontSize: 18 }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight text-white">
            {title}
          </span>
          <span className="block truncate text-[11px] font-medium leading-tight text-[var(--fit-color-text-muted)]">
            {subtitle}
          </span>
        </span>
        <button
          type="button"
          className={cn(
            "grid h-8 w-8 shrink-0 touch-manipulation place-items-center rounded-md text-[#8f98aa] transition-colors hover:bg-white/[0.06] hover:text-white",
            FIT_FOCUS_VISIBLE,
          )}
          aria-label={`Hide ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onClose(layout.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      {!compact ? (
        <div
          aria-label={`Resize ${title}`}
          className={cn(
            "absolute bottom-0 right-0 grid h-8 w-8 cursor-nwse-resize touch-none place-items-center text-[#8f98aa] opacity-70 transition-opacity hover:opacity-100",
            FIT_FOCUS_VISIBLE,
          )}
          role="button"
          tabIndex={0}
          onKeyDown={handleResizeKeyDown}
          onPointerDown={(event) => startInteraction(event, "resize")}
          onPointerMove={updateFromPointer}
          onPointerUp={stopInteraction}
          onPointerCancel={stopInteraction}
        >
          <OpenWithRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
        </div>
      ) : null}
    </section>
  );
}
