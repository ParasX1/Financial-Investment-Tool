import { describe, expect, it, jest } from "@jest/globals";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { TopPicksToolbar } from "./TopPicksToolbar";

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
  onExport: () => undefined,
  onEditColumns: () => undefined,
  onRetry: () => undefined,
};

describe("TopPicksToolbar", () => {
  it("offers an accessible retry interaction after a load failure", () => {
    const onRetry = jest.fn();
    const toolbar = TopPicksToolbar({
      ...baseProps,
      error: "Top Picks are temporarily unavailable.",
      total: 0,
      totalPages: 1,
      onRetry,
    });

    const retryButton = findByAriaLabel(toolbar, "Retry loading Top Picks");
    expect(retryButton).toBeDefined();

    retryButton?.props.onClick?.();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("surfaces safe ranking assumptions with neutral universe wording", () => {
    const toolbar = TopPicksToolbar({
      ...baseProps,
      metadata: {
        benchmark: "^AXJO",
        universeCount: 50,
        window: "trailing_one_year",
        riskFreeRate: 0.0435,
      },
    });

    expect(collectText(toolbar)).toContain(
      "Ranked universe: 50 stocks • requested window: trailing one year • benchmark ^AXJO • risk-free rate 4.35%",
    );
  });
});
