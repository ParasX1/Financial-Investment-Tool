import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import { TopPicksColumnsDialog } from "./TopPicksColumnsDialog";
import type { TopPicksColumnKey } from "../types";

type DialogElement = ReactElement<{
  children?: ReactNode;
  control?: ReactNode;
  disabled?: boolean;
  label?: ReactNode;
  onChange?: (_event: unknown, checked: boolean) => void;
  onClick?: () => void;
  onClose?: () => void;
  open?: boolean;
}>;

const collectElements = (node: ReactNode): DialogElement[] => {
  if (!isValidElement(node)) return [];
  const element = node as DialogElement;
  return [
    element,
    ...Children.toArray(element.props.children).flatMap(collectElements),
    ...collectElements(element.props.control),
  ];
};

const renderDialog = (
  visibleKeys: readonly TopPicksColumnKey[] = ["symbol", "name"],
) => {
  const props = {
    open: true,
    visibleKeys: [...visibleKeys],
    onClose: jest.fn(),
    onVisibleKeysChange: jest.fn(),
  };
  const tree = TopPicksColumnsDialog(props);
  return { props, tree, elements: collectElements(tree) };
};

describe("TopPicksColumnsDialog", () => {
  it("adds and removes visible metrics without mutating the existing selection", () => {
    const { props, elements } = renderDialog();
    const labels = elements.filter(
      (element) => element.type === FormControlLabel,
    );
    const returnLabel = labels.find(
      (element) => element.props.label === "Cumulative return",
    );
    const companyLabel = labels.find((element) => element.props.label === "Company");
    const returnCheckbox = collectElements(returnLabel?.props.control).find(
      (element) => element.type === Checkbox,
    );
    const companyCheckbox = collectElements(companyLabel?.props.control).find(
      (element) => element.type === Checkbox,
    );

    returnCheckbox?.props.onChange?.(null, true);
    companyCheckbox?.props.onChange?.(null, false);

    expect(props.onVisibleKeysChange).toHaveBeenNthCalledWith(1, [
      "symbol",
      "name",
      "ret1y",
    ]);
    expect(props.onVisibleKeysChange).toHaveBeenNthCalledWith(2, ["symbol"]);
    expect(props.visibleKeys).toEqual(["symbol", "name"]);
  });

  it("prevents removing the final visible column while allowing another choice", () => {
    const { elements } = renderDialog(["symbol"]);
    const labels = elements.filter(
      (element) => element.type === FormControlLabel,
    );
    const symbolCheckbox = collectElements(
      labels.find((element) => element.props.label === "Symbol")?.props.control,
    ).find((element) => element.type === Checkbox);
    const companyCheckbox = collectElements(
      labels.find((element) => element.props.label === "Company")?.props.control,
    ).find((element) => element.type === Checkbox);

    expect(symbolCheckbox?.props.disabled).toBe(true);
    expect(companyCheckbox?.props.disabled).toBe(false);
  });

  it("closes from either the dialog dismissal or explicit Close action", () => {
    const { props, tree, elements } = renderDialog();
    const dialog = tree as DialogElement;
    const closeButton = elements.find(
      (element) =>
        element.type === Button &&
        Children.toArray(element.props.children).join("") === "Close",
    );

    expect(dialog.props.open).toBe(true);
    dialog.props.onClose?.();
    closeButton?.props.onClick?.();
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
