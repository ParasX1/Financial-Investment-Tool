import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { PortfolioMetricCard as MetricCard } from "./PortfolioMetricCard";
import { PortfolioObservation } from "./PortfolioObservation";
import type { PortfolioMetricCard } from "../types";

jest.mock("./PortfolioMetricCard", () => ({
  PortfolioMetricCard: function MockPortfolioMetricCard() {
    return null;
  },
}));

const cards: PortfolioMetricCard[] = [
  { id: "alpha", metricType: "AlphaComparison", overrides: {}, hiddenSymbols: [] },
  { id: "beta", metricType: "BetaAnalysis", overrides: {}, hiddenSymbols: [] },
];

const boardCards: PortfolioMetricCard[] = [
  ...cards,
  {
    id: "hidden-board-slot",
    metricType: "VolatilityAnalysis",
    overrides: {},
    hiddenSymbols: [],
  },
  {
    id: "bottom-left",
    metricType: "SharpeRatioMatrix",
    overrides: {},
    hiddenSymbols: [],
  },
  {
    id: "bottom-middle",
    metricType: "MarketCorrelationAnalysis",
    overrides: {},
    hiddenSymbols: [],
  },
  {
    id: "bottom-right",
    metricType: "EfficientFrontierVisualization",
    overrides: {},
    hiddenSymbols: [],
  },
];

const globalInputs = {
  startDate: "2025-07-31",
  endDate: "2026-07-31",
  benchmark: "^AXJO",
  riskFreeRate: 0.0435,
  confidenceLevel: 0.05,
};

const createProps = (overrides: Record<string, unknown> = {}) => ({
  cards,
  symbols: ["AAPL", "MSFT"],
  globalInputs,
  layout: {
    alpha: { cardId: "alpha", x: 10, y: 20, width: 420, height: 300, z: 10, visible: true },
    beta: { cardId: "beta", x: 80, y: 70, width: 420, height: 300, z: 12, visible: false },
  },
  today: "2026-07-31",
  onDone: jest.fn(),
  onArrange: jest.fn(),
  onWindowChange: jest.fn(),
  onWindowVisibility: jest.fn(),
  onMetricChange: jest.fn(),
  onOverride: jest.fn(),
  onResetInputs: jest.fn(),
  onFocus: jest.fn(),
  onPromote: jest.fn(),
  onDuplicate: jest.fn(),
  onDelete: jest.fn(),
  ...overrides,
});

const renderObservation = (props = createProps()) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<PortfolioObservation {...props} />, {
      createNodeMock: (element) =>
        element.type === "div"
          ? {
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 900,
                height: 620,
                right: 900,
                bottom: 620,
              }),
            }
          : {},
    });
  });
  return { props, renderer, root: renderer.root };
};

const findButton = (root: ReactTestRenderer["root"], label: string) =>
  root.findAllByType("button").find((button) => {
    const text = button.children.filter((child) => typeof child === "string").join("");
    return text === label || button.props["aria-label"] === label;
  });

const installDesktopWindow = (innerWidth = 1280) => {
  const fakeWindow = {
    innerWidth,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(global, "window", {
    configurable: true,
    value: fakeWindow,
  });
  return fakeWindow;
};

const installResizeObserver = () => {
  let resize: (() => void) | undefined;
  const observe = jest.fn();
  const disconnect = jest.fn();
  class FakeResizeObserver {
    constructor(callback: () => void) {
      resize = callback;
    }

    observe = observe;
    disconnect = disconnect;
  }
  Object.defineProperty(global, "ResizeObserver", {
    configurable: true,
    value: FakeResizeObserver,
  });
  return { disconnect, observe, resize: () => resize?.() };
};

describe("PortfolioObservation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(global, "ResizeObserver");
    Reflect.deleteProperty(global, "window");
  });

  it("reconciles visible and hidden persisted windows on desktop mount without dispatching stable geometry", () => {
    installDesktopWindow();
    const resizeObserver = installResizeObserver();
    const props = createProps({
      layout: {
        alpha: {
          cardId: "alpha",
          x: 850,
          y: 590,
          width: 420,
          height: 300,
          z: 10,
          visible: true,
        },
        beta: {
          cardId: "beta",
          x: 80,
          y: 70,
          width: 1_000,
          height: 700,
          z: 12,
          visible: false,
        },
      },
    });

    const { renderer } = renderObservation(props);

    expect(props.onWindowChange.mock.calls).toEqual([
      ["alpha", { x: 472, y: 312, width: 420, height: 300 }],
      ["beta", { x: 8, y: 8, width: 884, height: 604 }],
    ]);
    expect(resizeObserver.observe).toHaveBeenCalledTimes(1);

    const stableProps = createProps({
      layout: {
        alpha: {
          ...props.layout.alpha,
          x: 472,
          y: 312,
        },
        beta: {
          ...props.layout.beta,
          x: 8,
          y: 8,
          width: 884,
          height: 604,
        },
      },
      onWindowChange: props.onWindowChange,
    });
    act(() => renderer.update(<PortfolioObservation {...stableProps} />));

    expect(props.onWindowChange).toHaveBeenCalledTimes(2);
    act(() => renderer.unmount());
    expect(resizeObserver.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reconciles every persisted window when the desktop canvas shrinks", () => {
    installDesktopWindow();
    const resizeObserver = installResizeObserver();
    const canvasSize = { width: 900, height: 620 };
    const props = createProps({
      layout: {
        alpha: {
          cardId: "alpha",
          x: 400,
          y: 300,
          width: 420,
          height: 300,
          z: 10,
          visible: true,
        },
        beta: {
          cardId: "beta",
          x: 450,
          y: 280,
          width: 420,
          height: 300,
          z: 12,
          visible: false,
        },
      },
    });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<PortfolioObservation {...props} />, {
        createNodeMock: (element) =>
          element.type === "div"
            ? {
                getBoundingClientRect: () => ({
                  ...canvasSize,
                  left: 0,
                  top: 0,
                  right: canvasSize.width,
                  bottom: canvasSize.height,
                }),
              }
            : {},
      });
    });
    expect(props.onWindowChange).not.toHaveBeenCalled();

    canvasSize.width = 700;
    canvasSize.height = 500;
    act(() => resizeObserver.resize());

    expect(props.onWindowChange.mock.calls).toEqual([
      ["alpha", { x: 272, y: 192, width: 420, height: 300 }],
      ["beta", { x: 272, y: 192, width: 420, height: 300 }],
    ]);
    act(() => renderer.unmount());
  });

  it("does not reconcile persisted geometry while the canvas remains mobile", () => {
    installDesktopWindow(700);
    const resizeObserver = installResizeObserver();
    const baseLayout = createProps().layout;
    const props = createProps({
      layout: {
        ...baseLayout,
        alpha: {
          ...baseLayout.alpha,
          x: 2_000,
          y: 2_000,
        },
      },
    });

    const { renderer } = renderObservation(props);

    expect(props.onWindowChange).not.toHaveBeenCalled();
    expect(resizeObserver.observe).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it("reconciles stale mobile-mounted geometry after expanding to desktop", () => {
    const listeners = new Map<string, () => void>();
    const fakeWindow = {
      innerWidth: 700,
      addEventListener: jest.fn((name: string, listener: () => void) =>
        listeners.set(name, listener),
      ),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(global, "window", {
      configurable: true,
      value: fakeWindow,
    });
    const resizeObserver = installResizeObserver();
    const baseLayout = createProps().layout;
    const props = createProps({
      layout: {
        ...baseLayout,
        alpha: {
          ...baseLayout.alpha,
          x: 2_000,
          y: 2_000,
        },
      },
    });

    const { renderer } = renderObservation(props);
    expect(props.onWindowChange).not.toHaveBeenCalled();

    fakeWindow.innerWidth = 1280;
    act(() => listeners.get("resize")?.());

    expect(props.onWindowChange).toHaveBeenCalledWith("alpha", {
      x: 472,
      y: 312,
      width: 420,
      height: 300,
    });
    expect(resizeObserver.observe).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it("falls back to the window resize event when ResizeObserver is unavailable", () => {
    const listeners = new Map<string, () => void>();
    const fakeWindow = {
      innerWidth: 1280,
      addEventListener: jest.fn((name: string, listener: () => void) =>
        listeners.set(name, listener),
      ),
      removeEventListener: jest.fn((name: string) => listeners.delete(name)),
    };
    Object.defineProperty(global, "window", {
      configurable: true,
      value: fakeWindow,
    });
    const canvasSize = { width: 900, height: 620 };
    const props = createProps({
      layout: {
        ...createProps().layout,
        alpha: {
          ...createProps().layout.alpha,
          x: 400,
          y: 300,
        },
      },
    });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<PortfolioObservation {...props} />, {
        createNodeMock: (element) =>
          element.type === "div"
            ? {
                getBoundingClientRect: () => ({
                  ...canvasSize,
                  left: 0,
                  top: 0,
                  right: canvasSize.width,
                  bottom: canvasSize.height,
                }),
              }
            : {},
      });
    });
    expect(props.onWindowChange).not.toHaveBeenCalled();

    canvasSize.width = 700;
    canvasSize.height = 500;
    act(() => listeners.get("resize")?.());

    expect(props.onWindowChange).toHaveBeenCalledWith("alpha", {
      x: 272,
      y: 192,
      width: 420,
      height: 300,
    });
    act(() => renderer.unmount());
    expect(fakeWindow.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("restores, arranges, hides, and closes windows through user controls", () => {
    const { props, root } = renderObservation();

    act(() => findButton(root, "Auto arrange")?.props.onClick());
    act(() => findButton(root, "Restore hidden")?.props.onClick());
    act(() => findButton(root, "Hide Alpha vs benchmark window")?.props.onClick());
    act(() => findButton(root, "Done")?.props.onClick());

    expect(props.onArrange).toHaveBeenCalledTimes(1);
    expect(props.onWindowVisibility.mock.calls).toEqual([
      ["beta", true],
      ["alpha", false],
    ]);
    expect(props.onDone).toHaveBeenCalledTimes(1);
    expect(findButton(root, "Restore hidden")?.props.disabled).toBe(false);
  });

  it("keeps card actions scoped to the corresponding observation window", () => {
    const { props, root } = renderObservation();
    const metricCard = root.findByType(MetricCard);

    act(() => metricCard.props.onMetricChange("SharpeRatioMatrix"));
    act(() => metricCard.props.onOverride({ riskFreeRate: 0.05 }));
    act(() => metricCard.props.onResetInputs());
    act(() => metricCard.props.onFocus());
    act(() => metricCard.props.onPromote());
    act(() => metricCard.props.onDuplicate());
    act(() => metricCard.props.onDelete());

    expect(props.onMetricChange).toHaveBeenCalledWith("alpha", "SharpeRatioMatrix");
    expect(props.onOverride).toHaveBeenCalledWith("alpha", {
      riskFreeRate: 0.05,
    });
    expect(props.onResetInputs).toHaveBeenCalledWith("alpha");
    expect(props.onFocus).toHaveBeenCalledWith("alpha");
    expect(props.onPromote).toHaveBeenCalledWith("alpha");
    expect(props.onDuplicate).toHaveBeenCalledWith("alpha");
    expect(props.onDelete).toHaveBeenCalledWith("alpha");
  });

  it("offers recovery when every observation window is hidden", () => {
    const props = createProps({
      layout: {
        alpha: { cardId: "alpha", x: 10, y: 20, width: 420, height: 300, z: 10, visible: false },
        beta: { cardId: "beta", x: 80, y: 70, width: 420, height: 300, z: 12, visible: false },
      },
    });
    const { root } = renderObservation(props);

    expect(root.findAllByType(MetricCard)).toHaveLength(0);
    expect(root.findByProps({ children: "No visible windows" })).toBeDefined();
    act(() => findButton(root, "Restore board cards")?.props.onClick());
    expect(props.onWindowVisibility.mock.calls).toEqual([
      ["alpha", true],
      ["beta", true],
    ]);
  });

  it("restores hidden windows to the Board five-window visibility model", () => {
    const props = createProps({
      cards: boardCards,
      layout: {
        alpha: {
          cardId: "alpha",
          x: 10,
          y: 20,
          width: 420,
          height: 300,
          z: 10,
          visible: false,
        },
        beta: {
          cardId: "beta",
          x: 80,
          y: 70,
          width: 420,
          height: 300,
          z: 12,
          visible: true,
        },
        "hidden-board-slot": {
          cardId: "hidden-board-slot",
          x: 120,
          y: 90,
          width: 420,
          height: 300,
          z: 13,
          visible: true,
        },
        "bottom-left": {
          cardId: "bottom-left",
          x: 140,
          y: 110,
          width: 420,
          height: 300,
          z: 14,
          visible: true,
        },
        "bottom-middle": {
          cardId: "bottom-middle",
          x: 160,
          y: 130,
          width: 420,
          height: 300,
          z: 15,
          visible: false,
        },
        "bottom-right": {
          cardId: "bottom-right",
          x: 180,
          y: 150,
          width: 420,
          height: 300,
          z: 16,
          visible: true,
        },
      },
    });
    const { root } = renderObservation(props);

    act(() => findButton(root, "Restore hidden")?.props.onClick());

    expect(props.onWindowVisibility.mock.calls).toEqual([
      ["alpha", true],
      ["hidden-board-slot", false],
      ["bottom-middle", true],
    ]);
  });

  it("drags a desktop window within the canvas and releases pointer capture", () => {
    const listeners = new Map<string, (event: Record<string, unknown>) => void>();
    const fakeWindow = {
      innerWidth: 1280,
      addEventListener: jest.fn(
        (name: string, listener: (event: Record<string, unknown>) => void) =>
          listeners.set(name, listener),
      ),
      removeEventListener: jest.fn((name: string) => listeners.delete(name)),
    };
    Object.defineProperty(global, "window", {
      configurable: true,
      value: fakeWindow,
    });
    const { props, root } = renderObservation();
    const dragHandle = root
      .findAllByType("div")
      .find((node) => typeof node.props.onPointerDown === "function");
    const pointerTarget = {
      setPointerCapture: jest.fn(),
      hasPointerCapture: jest.fn(() => true),
      releasePointerCapture: jest.fn(),
    };
    const startEvent = {
      button: 0,
      pointerId: 7,
      clientX: 100,
      clientY: 120,
      currentTarget: pointerTarget,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };

    act(() => dragHandle?.props.onPointerDown(startEvent));
    listeners.get("pointermove")?.({ pointerId: 99, clientX: 140, clientY: 150 });
    listeners.get("pointermove")?.({ pointerId: 7, clientX: 140, clientY: 150 });
    listeners.get("pointerup")?.({ pointerId: 7 });

    expect(startEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(pointerTarget.setPointerCapture).toHaveBeenCalledWith(7);
    expect(props.onWindowChange).toHaveBeenCalledWith("alpha", { z: 13 });
    expect(props.onWindowChange).toHaveBeenCalledWith("alpha", {
      x: 50,
      y: 50,
    });
    expect(pointerTarget.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(fakeWindow.removeEventListener).toHaveBeenCalledTimes(3);
  });

  it("resizes on desktop but ignores secondary or mobile pointer gestures", () => {
    const listeners = new Map<string, (event: Record<string, unknown>) => void>();
    const fakeWindow = {
      innerWidth: 1280,
      addEventListener: jest.fn(
        (name: string, listener: (event: Record<string, unknown>) => void) =>
          listeners.set(name, listener),
      ),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(global, "window", {
      configurable: true,
      value: fakeWindow,
    });
    const { props, root } = renderObservation();
    const resize = findButton(root, "Resize Alpha vs benchmark window");
    const pointerTarget = {
      setPointerCapture: jest.fn(),
      hasPointerCapture: jest.fn(() => false),
      releasePointerCapture: jest.fn(),
    };
    const event = {
      button: 0,
      pointerId: 4,
      clientX: 400,
      clientY: 300,
      currentTarget: pointerTarget,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };

    act(() => resize?.props.onPointerDown(event));
    listeners.get("pointermove")?.({ pointerId: 4, clientX: 500, clientY: 380 });
    expect(props.onWindowChange).toHaveBeenCalledWith("alpha", {
      width: 520,
      height: 380,
    });

    fakeWindow.innerWidth = 700;
    act(() => resize?.props.onPointerDown(event));
    fakeWindow.innerWidth = 1280;
    act(() => resize?.props.onPointerDown({ ...event, button: 1 }));
    expect(fakeWindow.addEventListener).toHaveBeenCalledTimes(4);
    expect(pointerTarget.releasePointerCapture).not.toHaveBeenCalled();
  });
});
