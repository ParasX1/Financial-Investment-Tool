import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { CommunityTickerField } from "./CommunityTickerField";

describe("CommunityTickerField", () => {
  it("adds normalized tickers, identifies the primary ticker, and removes any ticker", () => {
    const onInputChange = jest.fn();
    const onTickersChange = jest.fn();
    const renderer = TestRenderer.create(
      <CommunityTickerField
        disabled={false}
        input="$nflx"
        suggestedTickers={["CBA.AX"]}
        tickers={["NVDA"]}
        onInputChange={onInputChange}
        onTickersChange={onTickersChange}
      />,
    );

    expect(renderer.root.findByProps({ children: "Primary" })).toBeTruthy();
    const preventDefault = jest.fn();
    act(() =>
      renderer.root.findByType("input").props.onKeyDown({
        key: "Enter",
        preventDefault,
      }),
    );
    expect(preventDefault).toHaveBeenCalled();
    expect(onTickersChange).toHaveBeenCalledWith(["NVDA", "NFLX"]);
    expect(onInputChange).toHaveBeenCalledWith("");

    const removeButton = renderer.root.findByProps({
      "aria-label": "Remove NVDA ticker",
    });
    act(() => removeButton.props.onClick());
    expect(onTickersChange).toHaveBeenCalledWith([]);
    renderer.unmount();
  });

  it("keeps invalid ticker input visible and announces the error", () => {
    const onInputChange = jest.fn();
    const onTickersChange = jest.fn();
    const renderer = TestRenderer.create(
      <CommunityTickerField
        disabled={false}
        input="bad!"
        suggestedTickers={[]}
        tickers={[]}
        onInputChange={onInputChange}
        onTickersChange={onTickersChange}
      />,
    );

    act(() =>
      renderer.root.findByProps({ "aria-label": "Add ticker" }).props.onClick(),
    );

    expect(renderer.root.findByProps({ role: "alert" }).children.join(""))
      .toBe("Enter valid tickers, such as CBA.AX or NVDA.");
    expect(onTickersChange).not.toHaveBeenCalled();
    expect(onInputChange).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("disables adding a fifth ticker and explains the four ticker limit", () => {
    const renderer = TestRenderer.create(
      <CommunityTickerField
        disabled={false}
        input=""
        suggestedTickers={["TLS.AX"]}
        tickers={["NVDA", "MSFT", "CBA.AX", "BHP.AX"]}
        onInputChange={jest.fn()}
        onTickersChange={jest.fn()}
      />,
    );

    expect(renderer.root.findByProps({ "aria-label": "Add ticker" }).props.disabled).toBe(true);
    expect(
      renderer.root
        .findAllByType("span")
        .some((node) => node.children.join("") === "4/4 tickers selected"),
    ).toBe(true);
    renderer.unmount();
  });

  it("keeps unfinished input when adding a suggested ticker", () => {
    const onInputChange = jest.fn();
    const onTickersChange = jest.fn();
    const renderer = TestRenderer.create(
      <CommunityTickerField
        disabled={false}
        input="MSFT"
        suggestedTickers={["NVDA"]}
        tickers={[]}
        onInputChange={onInputChange}
        onTickersChange={onTickersChange}
      />,
    );

    const suggestionButton = renderer.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Add $NVDA");
    expect(suggestionButton).toBeTruthy();
    act(() => suggestionButton!.props.onClick());

    expect(onTickersChange).toHaveBeenCalledWith(["NVDA"]);
    expect(onInputChange).not.toHaveBeenCalled();
    renderer.unmount();
  });
});
