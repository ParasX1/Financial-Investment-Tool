import * as React from "react";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { HeadManagerContext } from "next/dist/shared/lib/head-manager-context.shared-runtime";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { homeMetadata } from "../data/homeContent";
import { homeRouteLinks } from "../data/homeContent";

let HomeScreenView: (typeof import("./HomeScreen"))["HomeScreenView"];
let HomeScreen: (typeof import("./HomeScreen"))["HomeScreen"];
let mockController: Record<string, any>;
let mockAuthState: { loading: boolean; user: unknown };
const mockRouter = { push: jest.fn() };

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    authDialog: null,
    authLoading: false,
    closeAuthDialog: jest.fn<any>(),
    openLogin: jest.fn<any>(),
    openSignUp: jest.fn<any>(),
    redirectTo: "/Portfolio",
    selectRoute: jest.fn<any>(),
    signedIn: false,
    ...overrides,
  };
}

beforeAll(async () => {
  jest.doMock(
    "next/link",
    () =>
      function MockLink({
        children,
        href,
        ...props
      }: {
        children: React.ReactNode;
        href: string;
      }) {
        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      },
  );
  jest.doMock("next/router", () => ({ useRouter: () => mockRouter }));
  jest.doMock("@/features/auth", () => ({
    useAuth: () => mockAuthState,
    AuthDialog: ({ initialMode, onHide, redirectTo, show }: any) =>
      show ? (
        <section
          aria-label="Auth dialog"
          data-mode={initialMode}
          data-redirect-to={redirectTo}
        >
          <button onClick={onHide}>Close auth</button>
        </section>
      ) : null,
  }));

  ({ HomeScreen, HomeScreenView } = await import("./HomeScreen"));
});

beforeEach(() => {
  mockController = buildController();
  mockAuthState = { loading: false, user: null };
  mockRouter.push.mockClear();
});

describe("HomeScreenView", () => {
  it("owns route metadata and passes the selected destination to auth", () => {
    mockController = buildController({
      authDialog: "login",
      redirectTo: "/MarketNews",
    });
    let head: React.ReactElement[] = [];

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HeadManagerContext.Provider
          value={{
            mountedInstances: new Set(),
            updateHead: (nextHead) => {
              head = nextHead as React.ReactElement[];
            },
          }}
        >
          <HomeScreenView controller={mockController as any} />
        </HeadManagerContext.Provider>,
      );
    });

    expect(head.find((entry) => entry.type === "title")?.props.children).toBe(
      homeMetadata.title,
    );
    expect(
      head.find(
        (entry) => entry.type === "meta" && entry.props.name === "description",
      )?.props.content,
    ).toBe(homeMetadata.description);
    expect(
      head.find(
        (entry) => entry.type === "meta" && entry.props.name === "theme-color",
      )?.props.content,
    ).toBe(homeMetadata.themeColor);
    expect(
      renderer.root.findAllByProps({ "aria-label": "Auth dialog" }),
    ).toHaveLength(1);
    expect(
      renderer.root.findByProps({ "aria-label": "Auth dialog" }).props[
        "data-redirect-to"
      ],
    ).toBe("/MarketNews");
    expect(
      renderer.root.findByProps({ "aria-label": "Auth dialog" }).props[
        "data-mode"
      ],
    ).toBe("sign-in");

    act(() => renderer.unmount());
  });

  it("keeps sign-in and create-account entry actions distinct", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HomeScreenView controller={mockController as any} />,
      );
    });

    const buttons = renderer.root.findAllByType("button");
    const signInButtons = buttons.filter((button) =>
      button.children.includes("Sign in"),
    );
    const createAccount = buttons.find((button) =>
      button.children.includes("Create an account"),
    );
    const getStartedButtons = buttons.filter((button) =>
      button.children.includes("Get started"),
    );

    expect(signInButtons).toHaveLength(3);
    expect(getStartedButtons).toHaveLength(2);
    act(() => {
      signInButtons.forEach((button) => button.props.onClick());
      getStartedButtons.forEach((button) => button.props.onClick());
      createAccount?.props.onClick();
    });

    expect(mockController.openLogin).toHaveBeenCalledTimes(3);
    expect(mockController.openSignUp).toHaveBeenCalledTimes(3);

    act(() => renderer.unmount());
  });

  it("opens the unified dialog in create-account mode", () => {
    mockController = buildController({ authDialog: "signup" });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HomeScreenView controller={mockController as any} />,
      );
    });

    expect(
      renderer.root.findByProps({ "aria-label": "Auth dialog" }).props,
    ).toMatchObject({
      "data-mode": "sign-up",
      "data-redirect-to": "/Portfolio",
    });
    act(() =>
      renderer.root.findByProps({ children: "Close auth" }).props.onClick(),
    );
    expect(mockController.closeAuthDialog).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it("passes each gated product destination to the controller", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HomeScreenView controller={mockController as any} />,
      );
    });
    const actions = [
      "Explore portfolio",
      "Read market news",
      "Explore community",
    ];
    for (const [index, route] of homeRouteLinks.entries()) {
      act(() =>
        renderer.root
          .findByProps({ "aria-label": `${actions[index]}, sign in required` })
          .props.onClick(),
      );
      expect(mockController.selectRoute).toHaveBeenLastCalledWith(route);
    }
    act(() => renderer.unmount());
  });

  it("adapts restored authentication into direct portfolio and product links", () => {
    mockAuthState = { loading: false, user: { id: "fixture-user" } };
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HomeScreen />);
    });
    const links = renderer.root.findAllByType("a");
    expect(
      links.filter((link) => link.props.href === "/Portfolio"),
    ).toHaveLength(5);
    expect(links.some((link) => link.props.href === "/MarketNews")).toBe(true);
    expect(links.some((link) => link.props.href === "/Community")).toBe(true);
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(mockRouter.push).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it("disables signed-out entry actions while auth is loading", () => {
    mockController = buildController({ authLoading: true });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HomeScreenView controller={mockController as any} />,
      );
    });

    const entryButtons = renderer.root
      .findAllByType("button")
      .filter(
        (button) =>
          button.children.includes("Sign in") ||
          button.children.includes("Get started") ||
          button.children.includes("Create an account") ||
          typeof button.props["aria-label"] === "string",
      );

    expect(entryButtons.length).toBeGreaterThan(0);
    expect(entryButtons.every((button) => button.props.disabled)).toBe(true);

    act(() => renderer.unmount());
  });
});
