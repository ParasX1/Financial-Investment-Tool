import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { PortfolioCommandBar } from "./PortfolioCommandBar";

type TestElement = ReactElement<{
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  id?: string;
  onChange?: (...args: any[]) => void;
  onClick?: () => void;
  placeholder?: string;
  renderInput?: (params: Record<string, unknown>) => ReactElement;
  renderTags?: (
    value: string[],
    getTagProps: (input: { index: number }) => Record<string, unknown>,
  ) => ReactNode;
}>;

const collectElements = (node: ReactNode): TestElement[] => {
  if (!isValidElement(node)) return [];
  const element = node as TestElement;
  return [
    element,
    ...Children.toArray(element.props.children).flatMap(collectElements),
  ];
};

const collectText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!isValidElement(node)) return "";
  return Children.toArray((node as TestElement).props.children)
    .map(collectText)
    .join("");
};

const baseInputs = {
  startDate: "2025-07-31",
  endDate: "2026-07-31",
  benchmark: "^AXJO",
  riskFreeRate: 0.0435,
  confidenceLevel: 0.05,
};

const renderCommandBar = (
  overrides: Partial<Parameters<typeof PortfolioCommandBar>[0]> = {},
) => {
  const props: Parameters<typeof PortfolioCommandBar>[0] = {
    symbols: ["AAPL", "MSFT"],
    symbolOptions: ["AAPL", "MSFT", "NVDA"],
    inputs: baseInputs,
    today: "2026-07-31",
    pending: true,
    validationError: null,
    onSymbolsChange: jest.fn(),
    onInputsChange: jest.fn(),
    onApply: jest.fn(),
    ...overrides,
  };
  const tree = PortfolioCommandBar(props);
  return { props, tree, elements: collectElements(tree) };
};

describe("PortfolioCommandBar", () => {
  it("normalises a user-entered universe and caps it at five symbols", () => {
    const onSymbolsChange = jest.fn();
    const { elements } = renderCommandBar({ onSymbolsChange });
    const autocomplete = elements.find(
      (element) => element.props.id === "portfolio-stock-select",
    );

    autocomplete?.props.onChange?.(null, [
      " aapl ",
      "MSFT",
      "aapl",
      "bad symbol",
      "nvda",
      "brk-b",
      "^axjo",
      "extra",
    ]);

    expect(onSymbolsChange).toHaveBeenCalledWith([
      "AAPL",
      "MSFT",
      "NVDA",
      "BRK-B",
      "^AXJO",
    ]);

    const renderedTags = autocomplete?.props.renderTags?.(
      ["AAPL", "MSFT"],
      ({ index }) => ({ "data-tag-index": index }),
    );
    expect(collectText(renderedTags)).toBe("");
    expect(Children.count(renderedTags)).toBe(2);
  });

  it("updates the linked range from presets and direct date inputs", () => {
    const onInputsChange = jest.fn();
    const { tree, elements } = renderCommandBar({ onInputsChange });
    const preset = elements.find((element) => collectText(element) === "3M");
    const startDate = elements.find(
      (element) => element.props.id === "portfolio-start-date",
    );
    const endDate = elements.find(
      (element) => element.props.id === "portfolio-end-date",
    );

    preset?.props.onClick?.();
    startDate?.props.onChange?.({ target: { value: "2025-01-02" } });
    endDate?.props.onChange?.({ target: { value: "2026-06-30" } });

    expect(onInputsChange).toHaveBeenNthCalledWith(1, {
      ...baseInputs,
      startDate: "2026-04-30",
      endDate: "2026-07-31",
    });
    expect(onInputsChange).toHaveBeenNthCalledWith(2, {
      ...baseInputs,
      startDate: "2025-01-02",
    });
    expect(onInputsChange).toHaveBeenNthCalledWith(3, {
      ...baseInputs,
      endDate: "2026-06-30",
    });
    expect(collectText(tree)).toContain("Draft changes are not applied yet");
  });

  it("clamps annual presets to the final valid day in non-leap years", () => {
    const onInputsChange = jest.fn();
    const startingInputs = {
      ...baseInputs,
      startDate: "2022-01-15",
      endDate: "2024-01-31",
    };
    const { elements } = renderCommandBar({
      today: "2024-02-29",
      inputs: startingInputs,
      onInputsChange,
    });

    elements.find((element) => collectText(element) === "1Y")?.props.onClick?.();

    expect(onInputsChange).toHaveBeenCalledWith({
      ...startingInputs,
      startDate: "2023-02-28",
      endDate: "2024-02-29",
    });
  });

  it("updates global model assumptions using UI-safe values", () => {
    const onInputsChange = jest.fn();
    const { elements } = renderCommandBar({ onInputsChange });
    const benchmark = elements.find(
      (element) => element.props.id === "portfolio-benchmark",
    );
    const riskFree = elements.find(
      (element) => element.props.id === "portfolio-risk-free-rate",
    );
    const confidence = elements.find(
      (element) => element.props.id === "portfolio-confidence",
    );

    benchmark?.props.onChange?.({ target: { value: "spy" } });
    riskFree?.props.onChange?.({ target: { value: "5.25" } });
    confidence?.props.onChange?.({ target: { value: "0.01" } });

    expect(onInputsChange).toHaveBeenNthCalledWith(1, {
      ...baseInputs,
      benchmark: "SPY",
    });
    expect(onInputsChange).toHaveBeenNthCalledWith(2, {
      ...baseInputs,
      riskFreeRate: 0.0525,
    });
    expect(onInputsChange).toHaveBeenNthCalledWith(3, {
      ...baseInputs,
      confidenceLevel: 0.01,
    });
  });

  it("protects the analysis action for current or invalid drafts", () => {
    const onApply = jest.fn();
    const current = renderCommandBar({ pending: false, onApply });
    const invalid = renderCommandBar({
      validationError: "Start date must be before end date.",
      onApply,
    });
    const currentButton = current.elements.find(
      (element) => collectText(element) === "Analysis current",
    );
    const invalidButton = invalid.elements.find(
      (element) => collectText(element) === "Run analysis",
    );

    expect(currentButton?.props.disabled).toBe(true);
    expect(invalidButton?.props.disabled).toBe(true);
    expect(collectText(invalid.tree)).toContain(
      "Start date must be before end date.",
    );

    const ready = renderCommandBar({ onApply });
    ready.elements
      .find((element) => collectText(element) === "Run analysis")
      ?.props.onClick?.();
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("communicates the five-symbol input limit through the autocomplete", () => {
    const { elements } = renderCommandBar({
      symbols: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"],
    });
    const autocomplete = elements.find(
      (element) => element.props.id === "portfolio-stock-select",
    );
    const textField = autocomplete?.props.renderInput?.({ id: "search" });

    expect(textField?.props.placeholder).toBe("Five-symbol limit");
  });
});
