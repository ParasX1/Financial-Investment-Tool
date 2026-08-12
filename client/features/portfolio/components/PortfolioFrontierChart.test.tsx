import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

type D3Handler = (...args: unknown[]) => unknown;

type HandlerRecord = {
  data: unknown[];
  event: string;
  handler: D3Handler;
};

const mockD3State = {
  attributes: [] as { name: string; selection: string; value: unknown }[],
  handlers: [] as HandlerRecord[],
  styles: [] as { name: string; selection: string; value: unknown }[],
  texts: [] as { selection: string; value: string }[],
};

class FakeSelection {
  private dataItems: unknown[] = [];

  constructor(private readonly name: string) {}

  attr(name: string, value: unknown) {
    this.recordValue(mockD3State.attributes, name, value);
    return this;
  }

  style(name: string, value: unknown) {
    this.recordValue(mockD3State.styles, name, value);
    return this;
  }

  text(value: unknown) {
    const values = this.resolveValues(value);
    values.forEach((resolved) =>
      mockD3State.texts.push({
        selection: this.name,
        value: String(resolved),
      }),
    );
    return this;
  }

  append(tag: string) {
    const selection = new FakeSelection(`${this.name}/${tag}`);
    selection.dataItems = [...this.dataItems];
    return selection;
  }

  selectAll(selector: string) {
    const selection = new FakeSelection(`${this.name}/${selector}`);
    selection.dataItems = [...this.dataItems];
    return selection;
  }

  remove() {
    return this;
  }

  call(callback: D3Handler) {
    callback(this);
    return this;
  }

  data(items: unknown[]) {
    this.dataItems = [...items];
    return this;
  }

  enter() {
    return this;
  }

  datum(item: unknown) {
    this.dataItems = [item];
    return this;
  }

  on(event: string, handler: D3Handler) {
    mockD3State.handlers.push({
      data: [...this.dataItems],
      event,
      handler,
    });
    return this;
  }

  private resolveValues(value: unknown) {
    if (typeof value !== "function") return [value];
    const callback = value as (datum: unknown, index: number) => unknown;
    return this.dataItems.map(callback);
  }

  private recordValue(
    target: { name: string; selection: string; value: unknown }[],
    name: string,
    value: unknown,
  ) {
    this.resolveValues(value).forEach((resolved) =>
      target.push({ name, selection: this.name, value: resolved }),
    );
  }
}

const createScale = () => {
  let domain = [0, 1];
  let range = [0, 1];
  const scale = ((value: number) => {
    const span = domain[1] - domain[0] || 1;
    return range[0] + ((value - domain[0]) / span) * (range[1] - range[0]);
  }) as ((value: number) => number) & {
    domain: (value: number[]) => typeof scale;
    range: (value: number[]) => typeof scale;
  };
  scale.domain = (value) => {
    domain = [...value];
    return scale;
  };
  scale.range = (value) => {
    range = [...value];
    return scale;
  };
  return scale;
};

const createAxis = () => {
  const axis = (() => undefined) as D3Handler & {
    tickFormat: (formatter: D3Handler) => typeof axis;
    ticks: (count: number) => typeof axis;
    tickSize: (size: number) => typeof axis;
  };
  axis.ticks = () => axis;
  axis.tickSize = () => axis;
  axis.tickFormat = () => axis;
  return axis;
};

const createLine = () => {
  let xAccessor: D3Handler = () => 0;
  let yAccessor: D3Handler = () => 0;
  const line = ((points: unknown[]) => {
    points.forEach((point, index) => {
      xAccessor(point, index);
      yAccessor(point, index);
    });
    return "mock-frontier-path";
  }) as D3Handler & {
    curve: (curve: unknown) => typeof line;
    x: (accessor: D3Handler) => typeof line;
    y: (accessor: D3Handler) => typeof line;
  };
  line.x = (accessor) => {
    xAccessor = accessor;
    return line;
  };
  line.y = (accessor) => {
    yAccessor = accessor;
    return line;
  };
  line.curve = () => line;
  return line;
};

jest.doMock("d3", () => ({
  axisBottom: createAxis,
  axisLeft: createAxis,
  curveMonotoneX: {},
  format:
    (pattern: string) =>
    (value: number): string =>
      `${(value * 100).toFixed(pattern === ".2%" ? 2 : 0)}%`,
  line: createLine,
  max: (items: unknown[], accessor: D3Handler) => {
    const values = items.map((item, index) =>
      Number(accessor(item, index)),
    );
    return values.length ? Math.max(...values) : undefined;
  },
  scaleLinear: createScale,
  select: (node: { kind?: string } | null) =>
    new FakeSelection(node?.kind ?? "missing"),
}));

const { PortfolioFrontierChart } = jest.requireActual<
  typeof import("./PortfolioFrontierChart")
>("./PortfolioFrontierChart");

const originalWindow = Object.getOwnPropertyDescriptor(global, "window");

const renderChart = (
  props: Partial<React.ComponentProps<typeof PortfolioFrontierChart>> = {},
) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <PortfolioFrontierChart data={[]} {...props} />,
      {
        createNodeMock: (element) => ({ kind: String(element.type) }),
      },
    );
  });
  return renderer;
};

const handlerFor = (event: string) => {
  const record = mockD3State.handlers.find((candidate) => candidate.event === event);
  expect(record).toBeDefined();
  return record!;
};

const renderedText = () => mockD3State.texts.map(({ value }) => value).join(" ");

describe("PortfolioFrontierChart", () => {
  beforeEach(() => {
    mockD3State.attributes.length = 0;
    mockD3State.handlers.length = 0;
    mockD3State.styles.length = 0;
    mockD3State.texts.length = 0;
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(global, "window", originalWindow);
    } else {
      Reflect.deleteProperty(global, "window");
    }
  });

  it("announces an empty simulation set without creating point controls", () => {
    renderChart({ width: 480, height: 300 });

    expect(renderedText()).toContain("Simulated portfolio opportunity set");
    expect(renderedText()).toContain("No finite portfolio simulations are available.");
    expect(renderedText()).toContain("No portfolio data available");
    expect(mockD3State.handlers).toHaveLength(0);
  });

  it("supports pointer and keyboard selection with bounded tooltips", () => {
    const onPointSelect = jest.fn();
    const data = [
      { risk: 0.1, return: 0.05, sharpe: 0.5, weights: [0.7, 0.3] },
      { risk: 0.3, return: 0.12, sharpe: 1.4, weights: [0.4, 0.6] },
      { risk: 0.2, return: 0.09, weights: [0.5, 0.5] },
    ];
    const renderer = renderChart({
      data,
      height: 320,
      mainColor: "#abcdef",
      onPointSelect,
      width: 500,
    });

    expect(renderedText()).toContain("3 of 3 simulated portfolios are shown");
    expect(renderedText()).toContain("Best sampled Sharpe 1.40");
    expect(renderedText()).toContain("Lowest sampled risk 10.00%");
    expect(renderedText()).toContain("Annualised risk");
    expect(renderedText()).toContain("Annualised return");

    const click = handlerFor("click");
    const keydown = handlerFor("keydown");
    const mouseover = handlerFor("mouseover");
    const mousemove = handlerFor("mousemove");
    const mouseout = handlerFor("mouseout");
    click.handler({}, click.data[0]);
    const ignoredKey = { key: "Escape", preventDefault: jest.fn() };
    const acceptedKey = { key: "Enter", preventDefault: jest.fn() };
    keydown.handler(ignoredKey, keydown.data[0]);
    keydown.handler(acceptedKey, keydown.data[1]);

    expect(onPointSelect.mock.calls).toEqual([[data[0]], [data[1]]]);
    expect(ignoredKey.preventDefault).not.toHaveBeenCalled();
    expect(acceptedKey.preventDefault).toHaveBeenCalledTimes(1);

    const fakeWindow = { innerHeight: 120, innerWidth: 150 };
    Object.defineProperty(global, "window", {
      configurable: true,
      value: fakeWindow,
    });
    mouseover.handler({ clientX: 140, clientY: 110 }, mouseover.data[0]);
    mouseover.handler({ clientX: 140, clientY: 110 }, mouseover.data[2]);
    fakeWindow.innerHeight = 1000;
    fakeWindow.innerWidth = 1000;
    mousemove.handler({ clientX: 5, clientY: 5 });
    mouseout.handler();

    expect(renderedText()).toContain("Risk:");
    expect(renderedText()).toContain("Return:");
    expect(renderedText()).toContain("Sharpe:");
    expect(renderedText()).toContain("N/A");
    expect(mockD3State.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "left", value: "0px" }),
        expect.objectContaining({ name: "top", value: "0px" }),
        expect.objectContaining({ name: "left", value: "17px" }),
        expect.objectContaining({ name: "top", value: "17px" }),
        expect.objectContaining({ name: "display", value: "none" }),
      ]),
    );

    act(() => renderer.unmount());
    expect(mockD3State.styles.at(-1)).toMatchObject({
      name: "display",
      value: "none",
    });
  });

  it("flags dense all-negative simulations and tolerates no selection callback", () => {
    const data = Array.from({ length: 351 }, (_, index) => ({
      risk: 0.05 + index / 10_000,
      return: -0.2 + index / 100_000,
      sharpe: index / 100,
    }));
    renderChart({ data, height: 120, width: 180 });

    expect(renderedText()).toContain(
      "All simulated returns are negative for this period.",
    );
    expect(mockD3State.attributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "fill-opacity", value: 0.2 }),
      ]),
    );
    const click = handlerFor("click");
    const keydown = handlerFor("keydown");
    expect(() => click.handler({}, click.data[0])).not.toThrow();
    expect(() =>
      keydown.handler(
        { key: " ", preventDefault: jest.fn() },
        keydown.data[0],
      ),
    ).not.toThrow();
  });

  it("omits a best-Sharpe highlight when simulations have no finite ratio", () => {
    renderChart({ data: [{ risk: 0.1, return: 0.02 }] });

    expect(renderedText()).toContain("Lowest sampled risk");
    expect(renderedText()).not.toContain("Best sampled Sharpe N/A");
  });
});
