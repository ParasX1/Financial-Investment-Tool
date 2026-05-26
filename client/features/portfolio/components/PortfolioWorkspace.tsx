import * as React from "react";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { fitButton } from "@/components/shared/fitStyles";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import StockChartCard from "@/components/StockCardComponent";
import {
  bringPortfolioPanelToFront,
  createDefaultPortfolioPanelLayout,
  getPortfolioWorkspaceHeight,
  normalisePortfolioPanelLayouts,
  patchPortfolioPanelLayout,
} from "../portfolioWorkspaceLayout";
import type {
  CardSettings,
  PortfolioPanelLayout,
  PortfolioPanelLayoutPatch,
} from "../types";
import { getPortfolioMetricLabel } from "../types";
import { PortfolioWorkspacePanel } from "./PortfolioWorkspacePanel";

const COMPACT_WORKSPACE_MEDIA = "(max-width: 900px), (max-height: 720px)";

export function PortfolioWorkspace({
  activeCards,
  cardSettings,
  panelLayouts,
  selectedStocks,
  onActivate,
  onClear,
  onPanelLayoutsChange,
  onSwap,
  onUpdateSettings,
}: {
  activeCards: boolean[];
  cardSettings: CardSettings[];
  panelLayouts: PortfolioPanelLayout[];
  selectedStocks: string[];
  onActivate: (index: number) => void;
  onClear: (index: number) => void;
  onPanelLayoutsChange: React.Dispatch<React.SetStateAction<PortfolioPanelLayout[]>>;
  onSwap: (index: number) => void;
  onUpdateSettings: (index: number, settings: Partial<CardSettings>) => void;
}) {
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);
  const [workspaceWidth, setWorkspaceWidth] = React.useState(0);
  const [compactWorkspace, setCompactWorkspace] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(COMPACT_WORKSPACE_MEDIA);
    const syncCompactState = () => setCompactWorkspace(query.matches);

    syncCompactState();
    query.addEventListener("change", syncCompactState);

    return () => query.removeEventListener("change", syncCompactState);
  }, []);

  React.useEffect(() => {
    if (!workspaceRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setWorkspaceWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(workspaceRef.current);
    return () => observer.disconnect();
  }, []);

  const measuredWorkspaceWidth = workspaceWidth || 1180;
  const runtimePanelLayouts = React.useMemo(
    () => normalisePortfolioPanelLayouts(panelLayouts, measuredWorkspaceWidth),
    [measuredWorkspaceWidth, panelLayouts],
  );
  const visiblePanels = runtimePanelLayouts.filter((panel) => panel.visible);
  const hiddenPanels = runtimePanelLayouts.filter((panel) => !panel.visible);
  const workspaceHeight = getPortfolioWorkspaceHeight(runtimePanelLayouts);

  const updatePanelLayout = React.useCallback(
    (id: string, patch: PortfolioPanelLayoutPatch) => {
      onPanelLayoutsChange((previous) =>
        patchPortfolioPanelLayout(previous, id, patch, measuredWorkspaceWidth),
      );
    },
    [measuredWorkspaceWidth, onPanelLayoutsChange],
  );

  const focusPanel = React.useCallback(
    (id: string) => {
      onPanelLayoutsChange((previous) =>
        bringPortfolioPanelToFront(previous, id),
      );
    },
    [onPanelLayoutsChange],
  );

  const hidePanel = React.useCallback(
    (id: string) => {
      onPanelLayoutsChange((previous) =>
        patchPortfolioPanelLayout(
          previous,
          id,
          { visible: false },
          measuredWorkspaceWidth,
        ),
      );
    },
    [measuredWorkspaceWidth, onPanelLayoutsChange],
  );

  const showPanel = React.useCallback(
    (id: string) => {
      onPanelLayoutsChange((previous) =>
        bringPortfolioPanelToFront(
          patchPortfolioPanelLayout(
            previous,
            id,
            { visible: true },
            measuredWorkspaceWidth,
          ),
          id,
        ),
      );
    },
    [measuredWorkspaceWidth, onPanelLayoutsChange],
  );

  const resetLayout = React.useCallback(() => {
    onPanelLayoutsChange(createDefaultPortfolioPanelLayout(measuredWorkspaceWidth));
  }, [measuredWorkspaceWidth, onPanelLayoutsChange]);

  return (
    <section
      className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-inner-surface)]"
      aria-label="Portfolio analytics workspace"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--fit-color-border-subtle)] bg-[#07080a] px-3 py-2">
        <div className="min-w-[180px] flex-1">
          <p className="text-sm font-bold text-white">
            Analytics workspace
          </p>
          <p className="text-xs text-[var(--fit-color-text-muted)]">
            {compactWorkspace
              ? "Panels stack on compact screens so charts stay readable."
              : "Drag panels by their title bar, resize from the lower right corner."}
          </p>
        </div>

        {hiddenPanels.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {hiddenPanels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                className={cn(
                  "inline-flex h-9 touch-manipulation items-center gap-2 rounded-lg px-3 text-xs font-bold",
                  fitButton.secondary,
                  FIT_FOCUS_VISIBLE,
                )}
                onClick={() => showPanel(panel.id)}
              >
                <VisibilityRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
                Show Graph {panel.index + 1}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className={cn(
            "inline-flex h-9 touch-manipulation items-center gap-2 rounded-lg px-3 text-xs font-bold",
            fitButton.subtle,
            FIT_FOCUS_VISIBLE,
          )}
          onClick={resetLayout}
        >
          <RestartAltRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          Reset layout
        </button>
      </div>

      <div
        ref={workspaceRef}
        className={cn(
          "min-h-0 flex-1 overflow-auto p-3",
          compactWorkspace ? "space-y-3" : "",
        )}
      >
        {visiblePanels.length ? (
          <div
            className={cn(
              compactWorkspace ? "flex flex-col gap-3" : "relative min-w-0",
            )}
            style={
              compactWorkspace
                ? undefined
                : {
                    height: workspaceHeight,
                    minHeight: "calc(100vh - 220px)",
                  }
            }
          >
            {visiblePanels.map((panel) => {
              const settings = cardSettings[panel.index];
              const compactChart =
                compactWorkspace || panel.width < 480 || panel.height < 340;

              return (
                <PortfolioWorkspacePanel
                  key={panel.id}
                  compact={compactWorkspace}
                  layout={panel}
                  title={`Graph ${panel.index + 1}`}
                  subtitle={
                    settings?.graphMade
                      ? getPortfolioMetricLabel(settings.metricType)
                      : "Select a metric to start"
                  }
                  workspaceWidth={measuredWorkspaceWidth}
                  onClose={hidePanel}
                  onFocus={focusPanel}
                  onLayoutChange={updatePanelLayout}
                >
                  <StockChartCard
                    index={panel.index}
                    selectedStocks={selectedStocks}
                    isActive={activeCards[panel.index]}
                    cardSettings={settings}
                    onClear={onClear}
                    onSwap={onSwap}
                    onActivate={onActivate}
                    onUpdateSettings={onUpdateSettings}
                    height="100%"
                    showSwap={true}
                    variant="workspace"
                    chartLayout={compactChart ? "compact" : "default"}
                  />
                </PortfolioWorkspacePanel>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface)] p-8 text-center">
            <div>
              <p className="text-base font-bold text-white">
                All graph panels are hidden
              </p>
              <p className="mt-2 text-sm text-[var(--fit-color-text-muted)]">
                Use the show buttons above to bring charts back into the workspace.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
