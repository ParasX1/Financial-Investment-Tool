import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { TopPicksColumnsDialog } from "../components/TopPicksColumnsDialog";
import { TopPicksTable } from "../components/TopPicksTable";
import { TopPicksToolbar } from "../components/TopPicksToolbar";
import { useTopPicksController } from "../hooks/useTopPicksController";
import { TOP_PICKS_COLUMNS } from "../lib/topPicksColumns";
import { TopPicksScreen } from "./TopPicksScreen";

jest.mock("@/components/sidebar", () => function MockSidebar() {
  return null;
});

jest.mock("@/components/shared/FitPageHeader", () => ({
  FitPageHeader: function MockFitPageHeader() {
    return null;
  },
}));

jest.mock("../components/TopPicksToolbar", () => ({
  TopPicksToolbar: function MockTopPicksToolbar() {
    return null;
  },
}));

jest.mock("../components/TopPicksTable", () => ({
  TopPicksTable: function MockTopPicksTable() {
    return null;
  },
}));

jest.mock("../components/TopPicksColumnsDialog", () => ({
  TopPicksColumnsDialog: function MockTopPicksColumnsDialog() {
    return null;
  },
}));

jest.mock("../hooks/useTopPicksController", () => ({
  useTopPicksController: jest.fn(),
}));

type ScreenElement = ReactElement<{
  children?: ReactNode;
  onClose?: () => void;
  onEditColumns?: () => void;
  onExport?: () => void;
}>;

const collectElements = (node: ReactNode): ScreenElement[] => {
  if (!isValidElement(node)) return [];
  const element = node as ScreenElement;
  return [
    element,
    ...Children.toArray(element.props.children).flatMap(collectElements),
  ];
};

const row = {
  symbol: "AAA",
  name: 'ACME "Alpha"',
  industry: "Technology",
  ret1y: 0.1234,
  sharpe: 1.23,
  sortino: 1.67,
  volatility: 0.215,
  maxDD: -0.149,
  beta: 0.87,
  alpha: 0.034,
  infoRatio: 0.22,
};

const originalBrowserGlobals = {
  Blob: Object.getOwnPropertyDescriptor(global, "Blob"),
  URL: Object.getOwnPropertyDescriptor(global, "URL"),
  document: Object.getOwnPropertyDescriptor(global, "document"),
};

const restoreGlobal = (
  key: "Blob" | "URL" | "document",
  descriptor: PropertyDescriptor | undefined,
) => {
  if (descriptor) {
    Object.defineProperty(global, key, descriptor);
  } else {
    Reflect.deleteProperty(global, key);
  }
};

const createController = () => ({
  rows: [row],
  loading: false,
  error: null,
  warnings: ["One symbol was excluded"],
  metadata: { benchmark: "^AXJO" },
  total: 51,
  page: 2,
  pageSize: 25,
  totalPages: 3,
  visibleKeys: ["symbol", "name", "ret1y"],
  visibleColumns: TOP_PICKS_COLUMNS.filter((column) =>
    ["rank", "symbol", "name", "ret1y"].includes(column.key),
  ),
  sort: { key: "sharpe", dir: "desc" },
  columnsOpen: true,
  retry: jest.fn(),
  setColumnsOpen: jest.fn(),
  setVisibleKeys: jest.fn(),
  toggleSort: jest.fn(),
  setPage: jest.fn(),
  setPageSize: jest.fn(),
});

describe("TopPicksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreGlobal("Blob", originalBrowserGlobals.Blob);
    restoreGlobal("URL", originalBrowserGlobals.URL);
    restoreGlobal("document", originalBrowserGlobals.document);
  });

  it("wires the toolbar, ranking table, and column dialog to one controller", () => {
    const controller = createController();
    (useTopPicksController as jest.Mock).mockReturnValue(controller);
    const elements = collectElements(TopPicksScreen());
    const toolbar = elements.find((element) => element.type === TopPicksToolbar);
    const table = elements.find((element) => element.type === TopPicksTable);
    const dialog = elements.find(
      (element) => element.type === TopPicksColumnsDialog,
    );

    expect(toolbar?.props).toMatchObject({
      loading: false,
      error: null,
      warnings: ["One symbol was excluded"],
      total: 51,
      page: 2,
      totalPages: 3,
      onRetry: controller.retry,
    });
    expect(table?.props).toMatchObject({
      rows: [row],
      visibleKeys: ["symbol", "name", "ret1y"],
      pageSize: 25,
      sort: { key: "sharpe", dir: "desc" },
      onSortChange: controller.toggleSort,
      onPageChange: controller.setPage,
      onPageSizeChange: controller.setPageSize,
    });
    expect(dialog?.props).toMatchObject({
      open: true,
      visibleKeys: ["symbol", "name", "ret1y"],
      onVisibleKeysChange: controller.setVisibleKeys,
    });

    toolbar?.props.onEditColumns?.();
    dialog?.props.onClose?.();
    expect(controller.setColumnsOpen.mock.calls).toEqual([[true], [false]]);
  });

  it("exports the current ranked page as a downloaded CSV and releases the URL", () => {
    const controller = createController();
    (useTopPicksController as jest.Mock).mockReturnValue(controller);
    const blobParts: unknown[][] = [];
    class FakeBlob {
      constructor(parts: unknown[], public options: Record<string, unknown>) {
        blobParts.push(parts);
      }
    }
    const anchor = {
      href: "",
      download: "",
      click: jest.fn(),
    };
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const createObjectURL = jest.fn(() => "blob:top-picks");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(global, "Blob", {
      configurable: true,
      value: FakeBlob,
    });
    Object.defineProperty(global, "URL", {
      configurable: true,
      value: { createObjectURL, revokeObjectURL },
    });
    Object.defineProperty(global, "document", {
      configurable: true,
      value: {
        createElement: jest.fn(() => anchor),
        body: { appendChild, removeChild },
      },
    });

    const toolbar = collectElements(TopPicksScreen()).find(
      (element) => element.type === TopPicksToolbar,
    );
    toolbar?.props.onExport?.();

    expect(blobParts[0][0]).toContain(
      '"Rank","Symbol","Company","Cumulative return"',
    );
    expect(blobParts[0][0]).toContain('"26","AAA","ACME ""Alpha""","+12.3%"');
    expect(anchor).toMatchObject({
      href: "blob:top-picks",
      download: "top-picks.csv",
    });
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:top-picks");
  });
});
