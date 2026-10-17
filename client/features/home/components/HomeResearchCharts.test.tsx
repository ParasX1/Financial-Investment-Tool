import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  researchLineData,
  researchVolatilityData,
  researchSeriesColors,
} from "../data/researchDesk";

jest.doMock("@/components/charts/LineGraph", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <svg data-line-chart {...props} />
  ),
}));
jest.doMock("@/components/charts/BarGraph", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <svg data-bar-chart {...props} />
  ),
}));
const HomeResearchCharts = jest.requireActual<
  typeof import("./HomeResearchCharts")
>("./HomeResearchCharts").default;

describe("HomeResearchCharts", () => {
  it("gives the existing charts stable frozen data, matching colors and the measured width", () => {
    let callback!: () => void;
    const disconnect = jest.fn();
    const originalObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(onResize: () => void) {
        callback = onResize;
      }
      observe() {}
      disconnect = disconnect;
    } as unknown as typeof ResizeObserver;
    let width = 352.8;
    let renderer!: TestRenderer.ReactTestRenderer;
    try {
      act(() => {
        renderer = TestRenderer.create(<HomeResearchCharts kind="return" />, {
          createNodeMock: () => ({ getBoundingClientRect: () => ({ width }) }),
        });
      });
      let chart = renderer.root.findByProps({ "data-line-chart": true });
      expect(chart.props.data).toBe(researchLineData.return);
      expect(chart.props.width).toBe(352);
      expect(chart.props.lineColors).toBe(researchSeriesColors);
      expect(chart.props.ariaLabel).toBe(
        "Cumulative return for Apple (AAPL) · Microsoft (MSFT), 3–30 Sep 2024",
      );
      expect(chart.props.valueFormat(0.04592176686541638)).toBe("+4.59%");
      width = 500;
      act(() => callback());
      expect(chart.props.width).toBe(500);
      act(() => renderer.update(<HomeResearchCharts kind="drawdown" />));
      chart = renderer.root.findByProps({ "data-line-chart": true });
      expect(chart.props.data).toBe(researchLineData.drawdown);
      expect(chart.props.valueFormat(-0.028953524440403777)).toBe("-2.9%");
      act(() => renderer.update(<HomeResearchCharts kind="volatility" />));
      chart = renderer.root.findByProps({ "data-bar-chart": true });
      expect(chart.props.data).toBe(researchVolatilityData);
      expect(chart.props.valueFormat(0.21596731336116873)).toBe("21.6%");
      act(() => renderer.unmount());
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      global.ResizeObserver = originalObserver;
    }
  });

  it.each([false, true])(
    "renders without a measurement observer or ref (ref %s)",
    (hasRef) => {
      let renderer!: TestRenderer.ReactTestRenderer;
      act(() => {
        renderer = TestRenderer.create(
          <HomeResearchCharts kind="volatility" />,
          {
            createNodeMock: () =>
              hasRef ? { getBoundingClientRect: () => ({ width: 270 }) } : null,
          },
        );
      });
      expect(
        renderer.root.findByProps({ "data-bar-chart": true }).props.width,
      ).toBe(hasRef ? 270 : 300);
      act(() => renderer.unmount());
    },
  );
});
