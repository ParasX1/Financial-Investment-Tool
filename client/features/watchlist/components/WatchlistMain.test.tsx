import * as React from "react";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { WatchlistItem, WatchlistQuote } from "../types";

let mockController: any;
let mockQuotes: any;
let mockSearch: any;
let WatchlistMain: typeof import("./WatchlistMain")["WatchlistMain"];

const item = (symbol: string, position: number): WatchlistItem => ({
  createdAt: `2026-07-1${position + 1}T00:00:00.000Z`,
  note: position ? null : "Review the next result",
  position,
  symbol,
  targetPrice: position ? null : 120,
  updatedAt: "2026-07-15T00:00:00.000Z",
  userId: "user-a",
});

const quote = (symbol: string, changePercent: number): WatchlistQuote => ({
  change: 1,
  changePercent,
  currency: "AUD",
  exchange: "ASX",
  longName: `${symbol} Company`,
  marketState: "CLOSED",
  previousClose: 119,
  price: 120,
  quoteTime: "2026-07-15T04:00:00.000Z",
  shortName: null,
  symbol,
});

describe("WatchlistMain interactions", () => {
  beforeAll(() => {
    jest.doMock("../hooks/useWatchlistController", () => ({
      useWatchlistController: () => mockController,
    }));
    jest.doMock("../hooks/useWatchlistQuotes", () => ({
      useWatchlistQuotes: () => mockQuotes,
    }));
    jest.doMock("../hooks/useWatchlistSymbolSearch", () => ({
      useWatchlistSymbolSearch: () => mockSearch,
    }));
    jest.doMock("@/components/shared/FitPageShell", () => ({
      FitPageShell: ({ children }: { children: React.ReactNode }) =>
        React.createElement("div", null, children),
    }));
    jest.doMock("@/components/shared/FitPageHeader", () => ({
      FitPageHeader: ({ subtitle, title }: { subtitle: string; title: string }) =>
        React.createElement(
          "header",
          null,
          React.createElement("h1", null, title),
          React.createElement("p", null, subtitle),
        ),
    }));
    jest.doMock("next/link", () => ({
      __esModule: true,
      default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
        React.createElement("a", { ...props, href }, children),
    }));
    jest.doMock("./WatchlistMarketMonitor", () => ({
      WatchlistMarketMonitor: ({
        items,
        onClose,
      }: {
        items: readonly WatchlistItem[];
        onClose: () => void;
      }) => React.createElement(
        "section",
        { "data-testid": "market-monitor" },
        React.createElement("h2", null, "Market comparison"),
        React.createElement("p", null, items.map((item) => item.symbol).join(", ")),
        React.createElement(
          "button",
          {
            "aria-label": "Close market comparison",
            onClick: onClose,
          },
          "Close monitor",
        ),
      ),
    }));
    jest.doMock("@/features/auth", () => {
      const actual = jest.requireActual<typeof import("@/features/auth")>(
        "@/features/auth",
      );

      return {
        ...actual,
        AuthDialog: ({
          initialMode,
          onHide,
          redirectTo,
          show,
        }: {
          initialMode: string;
          onHide: () => void;
          redirectTo: string;
          show: boolean;
        }) => show ? React.createElement(
          "div",
          {
            "data-mode": initialMode,
            "data-redirect-to": redirectTo,
            "data-testid": "auth-modal",
          },
          React.createElement("button", {
            "data-testid": "close-auth",
            onClick: onHide,
          }),
        ) : null,
      };
    });
    jest.doMock("@mui/material", () => ({
      Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? React.createElement("div", null, children) : null,
      DialogActions: ({ children }: { children: React.ReactNode }) =>
        React.createElement("div", null, children),
      DialogContent: ({ children }: { children: React.ReactNode }) =>
        React.createElement("div", null, children),
      DialogTitle: ({ children }: { children: React.ReactNode }) =>
        React.createElement("h2", null, children),
    }));
    WatchlistMain = require("./WatchlistMain").WatchlistMain;
  });

  beforeEach(() => {
    mockController = {
      addItem: jest.fn<any>().mockResolvedValue(true),
      authenticated: false,
      authLoading: false,
      busyAction: null,
      clearFeedback: jest.fn(),
      feedback: null,
      items: [],
      loadError: null,
      loading: false,
      moveItem: jest.fn<any>().mockResolvedValue(true),
      removeItem: jest.fn<any>().mockResolvedValue(true),
      retry: jest.fn<any>().mockResolvedValue(undefined),
      updateItem: jest.fn<any>().mockResolvedValue(true),
    };
    mockQuotes = {
      error: null,
      lastUpdated: new Date("2026-07-15T04:00:00.000Z"),
      loading: false,
      quotes: {},
      refresh: jest.fn(),
      refreshing: false,
    };
    mockSearch = {
      error: null,
      hasSearched: false,
      loading: false,
      results: [],
    };
  });

  it("renders signed-out recovery actions and opens both auth modes", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<WatchlistMain />);
    });
    const buttons = renderer!.root.findAllByType("button");
    const signIn = buttons.find((button) => button.children.includes("Sign in"));
    const create = buttons.find((button) => button.children.includes("Create account"));

    act(() => signIn!.props.onClick());
    expect(renderer!.root.findByProps({ "data-testid": "auth-modal" }).props)
      .toMatchObject({
        "data-mode": "sign-in",
        "data-redirect-to": "/Watchlist",
      });
    act(() => create!.props.onClick());
    expect(renderer!.root.findByProps({ "data-testid": "auth-modal" }).props)
      .toMatchObject({
        "data-mode": "sign-up",
        "data-redirect-to": "/Watchlist",
      });
    renderer!.unmount();
  });

  it("renders loading, error, empty, and feedback recovery states", async () => {
    mockController.authLoading = true;
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<WatchlistMain />);
    });
    expect(renderer!.root.findByProps({ "aria-busy": "true" })).toBeTruthy();

    mockController.authLoading = false;
    mockController.authenticated = true;
    mockController.loadError = "The research list could not be loaded.";
    act(() => renderer!.update(<WatchlistMain />));
    const retry = renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Try again"),
    );
    await act(async () => {
      retry!.props.onClick();
      await Promise.resolve();
    });
    expect(mockController.retry).toHaveBeenCalled();

    mockController.loadError = null;
    mockController.feedback = { message: "Saved for research.", tone: "success" };
    act(() => renderer!.update(<WatchlistMain />));
    expect(renderer!.root.findAll((node) =>
      node.children.includes("Saved for research."),
    ).length).toBeGreaterThan(0);
    act(() => renderer!.root.findByProps({ "aria-label": "Dismiss message" }).props.onClick());
    expect(mockController.clearFeedback).toHaveBeenCalled();
    expect(renderer!.root.findAllByType("h2").some((heading) =>
      heading.children.includes("Build your research shortlist"),
    )).toBe(true);
    renderer!.unmount();
  });

  it("opens the first saved idea, adds another comparison series, and closes it", async () => {
    mockController.authenticated = true;
    mockController.items = [item("CBA.AX", 0), item("BHP.AX", 1)];
    mockQuotes.quotes = {
      "BHP.AX": quote("BHP.AX", 2),
      "CBA.AX": quote("CBA.AX", -1),
    };
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<WatchlistMain />);
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ "data-testid": "market-monitor" }))
      .toBeTruthy();
    expect(
      renderer!.root.findAll((node) =>
        node.children.some(
          (child) =>
            typeof child === "string" && child.includes("Auto-updating · Updated"),
        ),
      ).length,
    ).toBeGreaterThan(0);
    expect(renderer!.root.findAllByType("h2").some((heading) =>
      heading.children.includes("Market comparison"),
    )).toBe(true);
    expect(
      renderer!.root.findByProps({ name: "watchlist-filter" }).props.className,
    ).toContain("fit-search-field");
    expect(renderer!.root.findByProps({
      "aria-label": "Remove CBA.AX from comparison",
    }).props["aria-pressed"]).toBe(true);

    act(() => renderer!.root.findByProps({
      "aria-label": "Add BHP.AX to comparison",
    }).props.onClick());
    const monitor = renderer!.root.findByProps({
      "data-testid": "market-monitor",
    });
    expect(monitor.findByType("p").children.join("")).toBe("CBA.AX, BHP.AX");

    act(() => renderer!.root.findByProps({
      "aria-label": "Close market comparison",
    }).props.onClick());
    expect(renderer!.root.findAllByProps({ "data-testid": "market-monitor" }))
      .toHaveLength(0);

    act(() => renderer!.root.findByProps({
      "aria-label": "Add CBA.AX to comparison",
    }).props.onClick());
    expect(
      renderer!.root
        .findByProps({ "data-testid": "market-monitor" })
        .findByType("p").children.join(""),
    ).toBe("CBA.AX");
    renderer!.unmount();
  });
  it("does not mark or announce the whole list busy during background quote refresh", async () => {
    mockController.authenticated = true;
    mockController.items = [item("CBA.AX", 0)];
    mockQuotes.quotes = { "CBA.AX": quote("CBA.AX", 1) };
    mockQuotes.refreshing = true;
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<WatchlistMain />);
      await Promise.resolve();
    });

    const updatingStatus = renderer!.root.findAll((node) =>
      node.children.some(
        (child) =>
          typeof child === "string" && child.includes("Updating quotes"),
      ),
    )[0];
    expect(updatingStatus).toBeTruthy();
    expect(updatingStatus!.props["aria-live"]).toBeUndefined();
    const list = renderer!.root.findAll(
      (node) =>
        typeof node.props.className === "string" &&
        node.props.className.split(" ").includes("list"),
    )[0];
    expect(list!.props["aria-busy"]).toBe(false);
    renderer!.unmount();
  });

  it("requires a search result and drives list research actions", async () => {
    mockController.authenticated = true;
    mockController.items = [item("CBA.AX", 0), item("BHP.AX", 1)];
    mockQuotes.quotes = {
      "BHP.AX": quote("BHP.AX", 2),
      "CBA.AX": quote("CBA.AX", -1),
    };
    mockSearch.hasSearched = true;
    mockSearch.results = [
      {
        exchange: "ASX",
        name: "Wesfarmers",
        quoteType: "EQUITY",
        symbol: "WES.AX",
      },
    ];
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<WatchlistMain />);
      await Promise.resolve();
    });

    const symbolInput = renderer!.root.findByProps({
      id: "watchlist-symbol-search",
    });
    act(() => symbolInput.props.onChange({ target: { value: "wes" } }));
    const addForm = renderer!.root.findAllByType("form")[0];
    await act(async () => {
      addForm!.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
    });
    expect(mockController.addItem).toHaveBeenCalledWith("WES.AX");

    act(() => symbolInput.props.onKeyDown({ key: "Escape" }));
    expect(renderer!.root.findAllByProps({ role: "listbox" })).toHaveLength(0);

    const filter = renderer!.root.findByProps({ name: "watchlist-filter" });
    act(() => filter.props.onChange({ target: { value: "CBA" } }));
    const moveButtons = renderer!.root.findAll(
      (node) => typeof node.props["aria-label"] === "string" &&
        node.props["aria-label"].startsWith("Move "),
    );
    expect(moveButtons.every((button) => button.props.disabled)).toBe(true);

    act(() => mockQuotes.refresh());
    expect(mockQuotes.refresh).toHaveBeenCalled();

    const edit = renderer!.root.findByProps({
      "aria-label": "Edit CBA.AX research note",
    });
    act(() => edit.props.onClick());
    const editForm = renderer!.root.findAllByType("form").find((form) =>
      form.findAllByProps({ id: "watchlist-note" }).length > 0,
    );
    await act(async () => {
      editForm!.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
    });
    expect(mockController.updateItem).toHaveBeenCalledWith(
      "CBA.AX",
      expect.objectContaining({ note: "Review the next result" }),
    );

    const remove = renderer!.root.findByProps({
      "aria-label": "Remove CBA.AX from watchlist",
    });
    act(() => remove.props.onClick());
    const confirm = renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Remove Item"),
    );
    await act(async () => {
      confirm!.props.onClick();
      await Promise.resolve();
    });
    expect(mockController.removeItem).toHaveBeenCalledWith("CBA.AX");
    renderer!.unmount();
  });

  it("supports keyboard discovery, explicit reordering, and draft validation", async () => {
    mockController.authenticated = true;
    mockController.items = [item("CBA.AX", 0), item("BHP.AX", 1)];
    mockQuotes.quotes = {
      "BHP.AX": quote("BHP.AX", 2),
      "CBA.AX": quote("CBA.AX", -1),
    };
    mockSearch.hasSearched = true;
    mockSearch.results = [
      { exchange: "ASX", name: "Wesfarmers", quoteType: "EQUITY", symbol: "WES.AX" },
      { exchange: "NASDAQ", name: "Apple", quoteType: "EQUITY", symbol: "AAPL" },
    ];
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<WatchlistMain />);
      await Promise.resolve();
    });

    const symbolInput = renderer!.root.findByProps({ id: "watchlist-symbol-search" });
    act(() => symbolInput.props.onChange({ target: { value: "a" } }));
    act(() => symbolInput.props.onKeyDown({
      key: "ArrowDown",
      preventDefault: jest.fn(),
    }));
    expect(renderer!.root.findByProps({ id: "watchlist-option-1" }).props["aria-selected"]).toBe(true);
    act(() => symbolInput.props.onKeyDown({
      key: "ArrowUp",
      preventDefault: jest.fn(),
    }));
    const firstOption = renderer!.root.findByProps({ id: "watchlist-option-0" });
    expect(firstOption.props["aria-selected"]).toBe(true);
    act(() => firstOption.props.onMouseDown({ preventDefault: jest.fn() }));
    await act(async () => {
      firstOption.props.onClick();
      await Promise.resolve();
    });
    expect(mockController.addItem).toHaveBeenCalledWith("WES.AX");

    const moveDown = renderer!.root.findByProps({ "aria-label": "Move CBA.AX down" });
    await act(async () => {
      moveDown.props.onClick();
      await Promise.resolve();
    });
    expect(mockController.moveItem).toHaveBeenCalledWith("CBA.AX", "down");

    const refresh = renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Refresh Quotes"),
    );
    act(() => refresh!.props.onClick());
    expect(mockQuotes.refresh).toHaveBeenCalled();

    const edit = renderer!.root.findByProps({ "aria-label": "Edit CBA.AX research note" });
    act(() => edit.props.onClick());
    act(() => renderer!.root.findByProps({ id: "watchlist-target" }).props.onChange({
      target: { value: "-1" },
    }));
    const editForm = renderer!.root.findAllByType("form").find((form) =>
      form.findAllByProps({ id: "watchlist-target" }).length > 0,
    );
    await act(async () => {
      editForm!.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
    });
    expect(renderer!.root.findAllByProps({ role: "alert" }).length).toBeGreaterThan(0);
    expect(mockController.updateItem).not.toHaveBeenCalled();
    renderer!.unmount();
  });

  it("preserves saved research when dialogs are cancelled and supports list and account controls", async () => {
    mockController.authenticated = true;
    mockController.items = [item("CBA.AX", 0), item("BHP.AX", 1)];
    mockQuotes.quotes = {
      "BHP.AX": quote("BHP.AX", 2),
      "CBA.AX": quote("CBA.AX", -1),
    };
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<WatchlistMain />);
      await Promise.resolve();
    });

    const sort = renderer!.root.findByType("select");
    act(() => sort.props.onChange({ target: { value: "change-desc" } }));
    const sortedEditButtons = renderer!.root.findAll(
      (node) => typeof node.props["aria-label"] === "string"
        && node.props["aria-label"].startsWith("Edit "),
    );
    expect(sortedEditButtons[0].props["aria-label"]).toBe("Edit BHP.AX research note");

    act(() => sort.props.onChange({ target: { value: "custom" } }));
    await act(async () => {
      renderer!.root.findByProps({ "aria-label": "Move BHP.AX up" }).props.onClick();
      await Promise.resolve();
    });
    expect(mockController.moveItem).toHaveBeenCalledWith("BHP.AX", "up");

    const filter = renderer!.root.findByProps({ name: "watchlist-filter" });
    act(() => filter.props.onChange({ target: { value: "not-saved" } }));
    expect(renderer!.root.findAll((node) =>
      node.children.some((child) => typeof child === "string" && child.includes("No saved ideas match")),
    ).length).toBeGreaterThan(0);
    act(() => filter.props.onChange({ target: { value: "" } }));

    act(() => renderer!.root.findByProps({
      "aria-label": "Edit CBA.AX research note",
    }).props.onClick());
    act(() => renderer!.root.findByProps({ id: "watchlist-note" }).props.onChange({
      target: { value: "Unsaved change" },
    }));
    act(() => renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Cancel"),
    )!.props.onClick());
    expect(mockController.updateItem).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ id: "watchlist-note" })).toHaveLength(0);

    act(() => renderer!.root.findByProps({
      "aria-label": "Remove CBA.AX from watchlist",
    }).props.onClick());
    act(() => renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Keep Item"),
    )!.props.onClick());
    expect(mockController.removeItem).not.toHaveBeenCalled();

    mockController.authenticated = false;
    mockController.items = [];
    act(() => renderer!.update(<WatchlistMain />));
    act(() => renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Sign in"),
    )!.props.onClick());
    expect(renderer!.root.findByProps({ "data-testid": "auth-modal" }).props[
      "data-mode"
    ]).toBe("sign-in");
    act(() => renderer!.root.findByProps({ "data-testid": "close-auth" }).props.onClick());
    expect(renderer!.root.findAllByProps({ "data-testid": "auth-modal" })).toHaveLength(0);
    act(() => renderer!.root.findAllByType("button").find((button) =>
      button.children.includes("Create account"),
    )!.props.onClick());
    expect(renderer!.root.findByProps({ "data-testid": "auth-modal" }).props[
      "data-mode"
    ]).toBe("sign-up");
    act(() => renderer!.root.findByProps({ "data-testid": "close-auth" }).props.onClick());
    expect(renderer!.root.findAllByProps({ "data-testid": "auth-modal" })).toHaveLength(0);
    renderer!.unmount();
  });
});
