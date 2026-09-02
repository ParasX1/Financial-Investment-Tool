import { describe, expect, it, jest } from "@jest/globals";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { TopPicksStatus, TopPicksToolbar } from "./TopPicksToolbar";

type InteractiveElement = ReactElement<{
  "aria-label"?: string;
  children?: ReactNode;
  onClick?: () => void;
}>;

const collectText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!isValidElement(node)) return "";
  return Children.toArray((node as InteractiveElement).props.children)
    .map(collectText)
    .join("");
};

const findByAriaLabel = (
  node: ReactNode,
  ariaLabel: string,
): InteractiveElement | undefined => {
  if (!isValidElement(node)) return undefined;
  const element = node as InteractiveElement;
  if (element.props["aria-label"] === ariaLabel) return element;

  for (const child of Children.toArray(element.props.children)) {
    const match = findByAriaLabel(child, ariaLabel);
    if (match) return match;
  }
  return undefined;
};

const baseProps = {
  loading: false,
  error: null,
  warnings: [] as string[],
  total: 50,
  page: 1,
  totalPages: 2,
  selectedWindow: "1Y" as const,
  onExport: () => undefined,
  onEditColumns: () => undefined,
  onWindowChange: () => undefined,
  onRetry: () => undefined,
};

describe("TopPicksStatus", () => {
  it("offers an accessible retry interaction after a load failure", () => {
    const onRetry = jest.fn();
    const status = TopPicksStatus({
      ...baseProps,
      error: "Top Picks are temporarily unavailable.",
      total: 0,
      totalPages: 1,
      onRetry,
    });

    const retryButton = findByAriaLabel(status, "Retry loading Top Picks");
    expect(retryButton).toBeDefined();

    retryButton?.props.onClick?.();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("surfaces safe ranking assumptions with neutral universe wording", () => {
    const status = TopPicksStatus({
      ...baseProps,
      metadata: {
        benchmark: "^AXJO",
        universeCount: 50,
        window: "trailing_one_year",
        riskFreeRate: 0.0435,
      },
    });

    expect(collectText(status)).toContain(
      "Ranked universe: 50 stocks • requested window: trailing one year • benchmark ^AXJO • risk-free rate 4.35%",
    );
  });
  it("keeps the result count neutral while a snapshot refresh is active", () => {
    const status = TopPicksStatus({
      ...baseProps,
      metadata: {
        cacheStatus: "stale",
        snapshotRefreshing: true,
      },
    });

    const text = collectText(status);
    expect(text).toContain("50 results - Showing page 1 of 2");
    expect(text).not.toContain("using previous results");
  });
});

describe("TopPicksToolbar", () => {
  it("shows the latest local sync time beside the window controls", () => {
    const toolbar = TopPicksToolbar({
      ...baseProps,
      lastUpdatedAt: new Date("2026-08-25T03:45:12Z"),
      syncing: true,
    });

    expect(collectText(toolbar)).toContain("Syncing - Updated");
  });
});
