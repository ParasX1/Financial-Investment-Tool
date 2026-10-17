import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act } from "react-test-renderer";
import sample from "../data/researchDeskSample.json";

jest.doMock("react-bootstrap/Modal", () => ({
  __esModule: true,
  default: ({ children, show, ...props }: any) =>
    show ? (
      <section data-test-dialog {...props}>
        {children}
      </section>
    ) : null,
}));
const { HomePortfolioPreview } = jest.requireActual<
  typeof import("./HomePortfolioPreview")
>("./HomePortfolioPreview");

describe("HomePortfolioPreview", () => {
  it("server-renders real historical company figures, meaning and provenance", () => {
    const markup = renderToStaticMarkup(<HomePortfolioPreview />);
    expect(markup).toContain('aria-labelledby="home-preview-title"');
    expect(markup).toContain("Compare companies across return and risk.");
    expect(markup).toContain("Historical sample");
    for (const text of ["Apple", "Microsoft", "AAPL", "MSFT", "3–30 Sep 2024"])
      expect(markup).toContain(text);
    for (const value of [
      "+4.59%",
      "+5.09%",
      "21.6%",
      "17.21%",
      "-2.9%",
      "-2.43%",
    ])
      expect(markup).toContain(value);
    expect(markup).toContain("Yahoo Finance via yfinance");
    expect(markup).toContain("17 Oct 2026");
    expect(markup).toContain("Not live prices or account data.");
    expect(markup).toContain("19 daily returns");
    expect(markup).toContain("√252");
    expect(markup).toContain("within this window");
    expect(markup).not.toMatch(
      /Illustrative portfolio|Illustrative benchmark|Read the journey/,
    );
  });

  it("retains all three native data tables and methods without chart JavaScript", () => {
    const markup = renderToStaticMarkup(<HomePortfolioPreview />);
    expect(markup.match(/<table/g)).toHaveLength(3);
    for (const label of [
      "Cumulative return",
      "Annualised volatility",
      "Drawdown history",
    ])
      expect(markup).toContain(`${label} sample data</caption>`);
    for (const company of sample.companies) {
      expect(markup).toContain(`value="${company.totalReturn}"`);
      expect(markup).toContain(`value="${company.annualisedVolatility}"`);
      expect(markup).toContain(`value="${company.drawdown.at(-1)}"`);
    }
    expect(markup).toContain("2024-09-03");
    expect(markup).toContain("2024-09-30");
    expect(markup.match(/<details/g)).toHaveLength(4);
    expect(markup).toContain("Chart available with JavaScript.");
    expect(markup).not.toContain("<canvas");
    expect(markup.match(/<h3/g)).toBeNull();
  });

  it("opens each metric inspection independently of account state and closes it", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HomePortfolioPreview />);
    });
    for (const [label, title] of [
      ["Inspect return", "Cumulative return"],
      ["Inspect volatility", "Annualised volatility"],
      ["Inspect drawdown", "Drawdown history"],
    ]) {
      const button = renderer.root.findByProps({ children: label });
      expect(button.props.disabled).toBe(false);
      act(() => button.props.onClick());
      const dialog = renderer.root.findByProps({ "data-test-dialog": true });
      expect(dialog.props["aria-labelledby"]).toBe(
        "home-research-dialog-title",
      );
      expect(dialog.props.restoreFocus).toBe(true);
      expect(dialog.props.enforceFocus).toBe(true);
      expect(
        dialog.findByProps({ id: "home-research-dialog-title" }).children,
      ).toEqual([title]);
      expect(button.props["aria-expanded"]).toBe(true);
      expect(dialog.findAllByType("table")).toHaveLength(1);
      expect(
        dialog.findAllByProps({ "data-research-chart": true }),
      ).toHaveLength(0);
      act(() => dialog.props.onHide());
      expect(
        renderer.root.findAllByProps({ "data-test-dialog": true }),
      ).toHaveLength(0);
      expect(button.props["aria-expanded"]).toBe(false);
    }
    act(() =>
      renderer.root.findByProps({ children: "Inspect return" }).props.onClick(),
    );
    act(() =>
      renderer.root
        .findByProps({ "aria-label": "Close metric inspection" })
        .props.onClick(),
    );
    expect(
      renderer.root.findAllByProps({ "data-test-dialog": true }),
    ).toHaveLength(0);
    act(() => renderer.unmount());
  });
});
