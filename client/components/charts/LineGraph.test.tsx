import TestRenderer, { act } from "react-test-renderer";

type Handler = (...args: unknown[]) => unknown;
const chart = {
  attributes: [] as { name: string; value: unknown; selection: string }[],
  texts: [] as string[],
  styles: [] as { name: string; value: unknown }[],
  handlers: new Map<string, Handler>(),
};

// Match the project's node-environment D3 component tests. Real SVG layout and
// browser focus are separately exercised by chartContracts.spec.ts.
class Selection {
  private items: unknown[] = [];
  constructor(private name: string) {}
  private values(value: unknown) {
    return typeof value === "function"
      ? this.items.map(value as Handler)
      : [value];
  }
  attr(name: string, value: unknown) {
    this.values(value).forEach((resolved) =>
      chart.attributes.push({ name, value: resolved, selection: this.name }),
    );
    return this;
  }
  style(name: string, value: unknown) {
    this.values(value).forEach((resolved) =>
      chart.styles.push({ name, value: resolved }),
    );
    return this;
  }
  text(value: unknown) {
    this.values(value).forEach((resolved) =>
      chart.texts.push(String(resolved)),
    );
    return this;
  }
  append(tag: string) {
    const result = new Selection(`${this.name}/${tag}`);
    result.items = [...this.items];
    return result;
  }
  selectAll(selector: string) {
    return this.append(selector);
  }
  data(items: unknown[]) {
    this.items = [...items];
    return this;
  }
  datum(item: unknown) {
    this.items = [item];
    return this;
  }
  call(callback: Handler) {
    callback(this);
    return this;
  }
  on(event: string, handler: Handler) {
    chart.handlers.set(event, handler);
    return this;
  }
  enter() {
    return this;
  }
  exit() {
    return this;
  }
  merge() {
    return this;
  }
  interrupt() {
    return this;
  }
  remove() {
    return this;
  }
}

const scale = () => {
  let domain = [0, 1];
  let range = [0, 1];
  type Scale = ((value: unknown) => number) & {
    domain: (values: unknown[]) => Scale;
    range: (values: number[]) => Scale;
    nice: () => Scale;
    invert: (value: number) => Date;
  };
  const result = ((value: unknown) =>
    range[0] +
    ((Number(value) - domain[0]) / (domain[1] - domain[0])) *
      (range[1] - range[0])) as Scale;
  result.domain = (values: unknown[]) => {
    domain = values.map(Number);
    return result;
  };
  result.range = (values: number[]) => {
    range = values;
    return result;
  };
  result.nice = () => result;
  result.invert = (value: number) =>
    new Date(
      domain[0] + (value / (range[1] - range[0])) * (domain[1] - domain[0]),
    );
  return result;
};
const axis = () => {
  type Axis = Handler &
    Record<"ticks" | "tickSize" | "tickFormat" | "tickSizeOuter", () => Axis>;
  const result = (() => undefined) as Axis;
  for (const method of [
    "ticks",
    "tickSize",
    "tickFormat",
    "tickSizeOuter",
  ] as const)
    result[method] = () => result;
  return result;
};
const line = () => {
  let x: Handler = () => 0;
  let y: Handler = () => 0;
  type Line = ((points: unknown[]) => string) & {
    x: (accessor: Handler) => Line;
    y: (accessor: Handler) => Line;
    curve: () => Line;
  };
  const result = ((points: unknown[]) => {
    points.forEach((point) => {
      x(point);
      y(point);
    });
    return "path";
  }) as Line;
  result.x = (accessor: Handler) => {
    x = accessor;
    return result;
  };
  result.y = (accessor: Handler) => {
    y = accessor;
    return result;
  };
  result.curve = () => result;
  return result;
};
jest.doMock("d3", () => ({
  axisBottom: axis,
  axisLeft: axis,
  curveLinear: {},
  line,
  scaleLinear: scale,
  scaleTime: scale,
  pointer: (event: { offsetX: number }) => [event.offsetX],
  select: (node: { kind: string }) => new Selection(node.kind),
  timeFormat: () => (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
}));
const LineGraph =
  jest.requireActual<typeof import("./LineGraph")>("./LineGraph").default;
const originalWindow = Object.getOwnPropertyDescriptor(global, "window");
const render = (
  props: Partial<React.ComponentProps<typeof LineGraph>> = {},
) => {
  let result!: TestRenderer.ReactTestRenderer;
  act(() => {
    result = TestRenderer.create(<LineGraph data={[]} {...props} />, {
      createNodeMock: (element) => ({ kind: String(element.type) }),
    });
  });
  return result;
};
const date = (day: number) => new Date(2026, 0, day);
const lastAttribute = (name: string) =>
  chart.attributes.filter((attribute) => attribute.name === name).at(-1)?.value;
const bounds = { getBoundingClientRect: () => ({ left: 30, top: 50 }) };
const press = (key: string, guard = {}) => {
  const event = {
    key,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...guard,
  };
  chart.handlers.get("keydown")!.call(bounds, event);
  return event;
};

describe("LineGraph inspection", () => {
  beforeEach(() => {
    chart.attributes.length = 0;
    chart.texts.length = 0;
    chart.styles.length = 0;
    chart.handlers.clear();
    Object.defineProperty(global, "window", {
      configurable: true,
      value: { innerWidth: 1000, innerHeight: 1000 },
    });
  });
  afterEach(() => {
    if (originalWindow) Object.defineProperty(global, "window", originalWindow);
    else Reflect.deleteProperty(global, "window");
  });

  it("compares independent histories only at the selected timestamp", () => {
    const renderer = render({
      data: [
        {
          ticker: "AAPL",
          values: [
            { date: date(3), value: 0.3 },
            { date: date(1), value: 0.1 },
          ],
        },
        {
          ticker: "MSFT",
          values: [
            { date: date(2), value: 0.2 },
            { date: date(3), value: 0.4 },
          ],
        },
      ],
      ariaLabel: "Cumulative return over time",
    });
    chart.texts.length = 0;
    chart.handlers
      .get("mousemove")!
      .call(bounds, { offsetX: 0, clientX: 50, clientY: 50 });
    expect(chart.texts).toEqual(["2026-01-01", "AAPL: 10%", "MSFT: N/A"]);
    expect(chart.texts).not.toContain("MSFT: 20%");
    expect(lastAttribute("aria-valuetext")).toBe(
      "2026-01-01. AAPL: 10%; MSFT: N/A",
    );
    expect(chart.attributes.filter(({ name }) => name === "tabindex")).toEqual([
      expect.objectContaining({ value: 0 }),
    ]);
    expect(lastAttribute("aria-label")).toBe(
      "Inspect Cumulative return over time by date",
    );
    act(() => renderer.unmount());
    expect(chart.styles.at(-1)).toEqual({ name: "display", value: "none" });
  });

  it("shares date inspection with focus, navigation, boundaries, and dismissal", () => {
    render({
      data: [
        {
          ticker: "A",
          values: [
            { date: date(1), value: 0 },
            { date: date(3), value: 0.3 },
          ],
        },
        { ticker: "B", values: [{ date: date(2), value: 0.2 }] },
      ],
    });
    chart.handlers.get("focus")!.call(bounds, {});
    expect(lastAttribute("stroke-width")).toBe(2);
    expect(lastAttribute("aria-valuetext")).toBe("2026-01-01. A: 0%; B: N/A");
    press("ArrowRight");
    expect(lastAttribute("aria-valuetext")).toBe("2026-01-02. A: N/A; B: 20%");
    press("ArrowUp");
    press("ArrowRight");
    expect(lastAttribute("aria-valuenow")).toBe(2);
    press("ArrowDown");
    press("ArrowLeft");
    press("ArrowLeft");
    expect(lastAttribute("aria-valuenow")).toBe(0);
    press("End");
    expect(lastAttribute("aria-valuenow")).toBe(2);
    press("Home");
    expect(lastAttribute("aria-valuenow")).toBe(0);
    expect(press("Escape").stopPropagation).toHaveBeenCalledTimes(1);
    expect(chart.styles.at(-1)).toEqual({ name: "display", value: "none" });
    expect(press("x").preventDefault).not.toHaveBeenCalled();
    for (const guard of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
      { defaultPrevented: true },
    ]) {
      expect(press("ArrowRight", guard).preventDefault).not.toHaveBeenCalled();
    }
    chart.handlers.get("blur")!();
    expect(lastAttribute("aria-hidden")).toBe("true");
    chart.handlers.get("mouseout")!();
  });

  it("keeps an empty chart unfocusable after rejecting invalid observations", () => {
    const renderer = render({
      data: [
        {
          ticker: "A",
          values: [
            { date: new Date(NaN), value: 0.1 },
            { date: date(1), value: Infinity },
          ],
        },
      ],
    });
    expect(chart.texts).toContain("No chart data");
    expect(chart.handlers.size).toBe(0);
    act(() => renderer.unmount());
  });

  it.each([
    [new Date(2020, 0, 1), new Date(2026, 0, 1)],
    [new Date(2026, 0, 1), new Date(2026, 5, 1)],
    [new Date(2026, 0, 1), new Date(2026, 0, 3)],
    [new Date(2026, 0, 1, 12), new Date(2026, 0, 1, 13)],
  ])(
    "retains inspection across date scales and compact presentation",
    (first, last) => {
      render({
        data: [
          {
            ticker: "A very long symbol label",
            values: [
              { date: first, value: -0.1 },
              { date: last, value: 0.2 },
            ],
          },
        ],
        compact: true,
        width: 240,
        height: 132,
        mainColor: "#abcdef",
        lineColors: [],
      });
      chart.handlers
        .get("mousemove")!
        .call(bounds, { offsetX: 1000, clientX: 990, clientY: 990 });
      expect(lastAttribute("aria-valuenow")).toBe(1);
      expect(chart.texts.join(" ")).toContain("20%");
    },
  );

  it("pads a single dated value and uses fallback dimensions and series label", () => {
    render({
      width: NaN,
      height: NaN,
      data: [{ ticker: " ", values: [{ date: date(1), value: 0 }] }],
    });
    chart.handlers.get("focus")!.call(bounds, {});
    expect(lastAttribute("aria-valuetext")).toBe("2026-01-01. Series 1: 0%");
    expect(lastAttribute("aria-valuemax")).toBe(0);
  });
});
