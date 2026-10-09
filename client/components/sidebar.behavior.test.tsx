import * as React from "react";
import type { NextRouter } from "next/router";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import Sidebar from "./sidebar";

jest.mock("next/link", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: ({
      children,
      href,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
      href: string;
    }) => React.createElement("a", { ...props, href }, children),
  };
});

const mockSignOut = jest.fn();
let mockUser: { id: string } | null = null;
jest.mock("@/features/auth", () => ({
  useAuth: () => ({ signOut: mockSignOut, user: mockUser }),
  AuthDialog: () => null,
  useAuthDialog: () => ({
    close: jest.fn(),
    dialogProps: { show: false },
    openSignIn: jest.fn(),
  }),
}));

type RouteChangeHandler = (url: string) => void;

function createRouter() {
  const routeChangeHandlers = new Set<RouteChangeHandler>();
  const events = {
    emit: jest.fn(),
    off: jest.fn((event: string, handler: RouteChangeHandler) => {
      if (event === "routeChangeStart") routeChangeHandlers.delete(handler);
    }),
    on: jest.fn((event: string, handler: RouteChangeHandler) => {
      if (event === "routeChangeStart") routeChangeHandlers.add(handler);
    }),
  };
  const router = {
    asPath: "/Guide",
    basePath: "",
    beforePopState: jest.fn(),
    back: jest.fn(),
    events,
    forward: jest.fn(),
    isFallback: false,
    isLocaleDomain: false,
    isPreview: false,
    isReady: true,
    pathname: "/Guide",
    prefetch: jest.fn().mockResolvedValue(undefined),
    push: jest.fn().mockResolvedValue(true),
    query: {},
    reload: jest.fn(),
    replace: jest.fn().mockResolvedValue(true),
    route: "/Guide",
  } as unknown as NextRouter;

  return {
    emitRouteChangeStart(url: string) {
      routeChangeHandlers.forEach((handler) => handler(url));
    },
    events,
    getRouteChangeHandlerCount: () => routeChangeHandlers.size,
    router,
  };
}

function findButton(renderer: ReactTestRenderer, ariaLabel: string) {
  return renderer.root.find(
    (node) => node.type === "button" && node.props["aria-label"] === ariaLabel,
  );
}

describe("Sidebar compact navigation lifecycle", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    mockSignOut.mockReset();
    mockUser = null;
    const bodyStyle = { overflow: "scroll" };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: jest.fn(),
        clearTimeout,
        innerHeight: 844,
        matchMedia: (query: string) => ({
          addEventListener: jest.fn(),
          matches: query.includes("max-width"),
          removeEventListener: jest.fn(),
        }),
        removeEventListener: jest.fn(),
        setTimeout,
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        activeElement: null,
        body: { style: bodyStyle },
        documentElement: {
          style: { setProperty: jest.fn() },
        },
      },
    });
  });

  it("handles sign-out failure and permits retry after the pending request", async () => {
    mockUser = { id: "user-a" };
    let reject!: (error: Error) => void;
    mockSignOut
      .mockImplementationOnce(
        () =>
          new Promise((_, no) => {
            reject = no;
          }),
      )
      .mockResolvedValueOnce(undefined);
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <RouterContext.Provider value={createRouter().router}>
          <Sidebar />
        </RouterContext.Provider>,
      );
    });
    let pending!: Promise<void>;
    act(() => {
      pending = findButton(renderer, "Log out").props.onClick();
    });
    expect(findButton(renderer, "Log out").props.disabled).toBe(true);
    await act(async () => {
      reject(new Error("private auth provider detail"));
      await expect(pending).resolves.toBeUndefined();
    });
    expect(findButton(renderer, "Log out").props.disabled).toBe(false);
    expect(
      renderer.root.findByProps({ role: "alert" }).children.join(""),
    ).toContain("Log out failed");
    await act(async () => {
      await findButton(renderer, "Log out").props.onClick();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it("discards an earlier account's sign-out failure after an account switch", async () => {
    mockUser = { id: "user-a" };
    let reject!: (error: Error) => void;
    mockSignOut.mockImplementationOnce(
      () =>
        new Promise((_, no) => {
          reject = no;
        }),
    );
    const router = createRouter().router;
    let view!: ReactTestRenderer;
    act(() => {
      view = TestRenderer.create(
        <RouterContext.Provider value={router}>
          <Sidebar />
        </RouterContext.Provider>,
      );
    });
    let pending!: Promise<void>;
    act(() => {
      pending = findButton(view, "Log out").props.onClick();
    });
    mockUser = { id: "user-b" };
    act(() => {
      view.update(
        <RouterContext.Provider value={router}>
          <Sidebar />
        </RouterContext.Provider>,
      );
    });
    expect(findButton(view, "Log out").props.disabled).toBe(false);
    await act(async () => {
      reject(new Error("earlier account failure"));
      await pending;
    });
    expect(view.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    act(() => view.unmount());
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("closes the compact drawer and restores scrolling when a route starts", () => {
    const { emitRouteChangeStart, events, getRouteChangeHandlerCount, router } =
      createRouter();
    const initialHoverChange = jest.fn();
    const latestHoverChange = jest.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <RouterContext.Provider value={router}>
          <Sidebar onHoverChange={initialHoverChange} />
        </RouterContext.Provider>,
      );
    });

    act(() => {
      findButton(renderer, "Expand navigation").props.onClick();
    });

    expect(findButton(renderer, "Close navigation")).toBeDefined();
    expect(document.body.style.overflow).toBe("hidden");
    expect(getRouteChangeHandlerCount()).toBe(1);

    events.on.mockClear();
    events.off.mockClear();
    act(() => {
      renderer.update(
        <RouterContext.Provider value={router}>
          <Sidebar onHoverChange={latestHoverChange} />
        </RouterContext.Provider>,
      );
    });

    expect(events.off).toHaveBeenCalledTimes(1);
    expect(events.on).toHaveBeenCalledTimes(1);
    expect(getRouteChangeHandlerCount()).toBe(1);
    initialHoverChange.mockClear();
    latestHoverChange.mockClear();

    act(() => {
      emitRouteChangeStart("/Help");
    });

    expect(() => findButton(renderer, "Close navigation")).toThrow();
    expect(document.body.style.overflow).toBe("scroll");
    expect(initialHoverChange).not.toHaveBeenCalled();
    expect(latestHoverChange).toHaveBeenCalledTimes(1);
    expect(latestHoverChange).toHaveBeenCalledWith(false);

    act(() => renderer.unmount());
    expect(events.off).toHaveBeenCalledTimes(2);
    expect(getRouteChangeHandlerCount()).toBe(0);
  });
});
