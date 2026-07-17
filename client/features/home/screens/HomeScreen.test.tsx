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

let HomeScreenView: (typeof import("./HomeScreen"))["HomeScreenView"];
let mockController: Record<string, any>;

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    authDialog: null,
    authLoading: false,
    closeAuthDialog: jest.fn<any>(),
    openLogin: jest.fn<any>(),
    openSignUp: jest.fn<any>(),
    redirectTo: "/dashboardView",
    selectRoute: jest.fn<any>(),
    signedIn: false,
    switchToLogin: jest.fn<any>(),
    switchToSignUp: jest.fn<any>(),
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
  jest.doMock(
    "next/image",
    () =>
      function MockImage({
        alt,
        src,
        ...props
      }: {
        alt: string;
        src: string | { src: string };
      }) {
        return (
          <img
            alt={alt}
            src={typeof src === "string" ? src : src.src}
            {...props}
          />
        );
      },
  );
  jest.doMock(
    "@/components/Modal/ModalLogin",
    () =>
      function MockLogin({
        onHide,
        onShowSignUp,
        redirectTo,
        show,
      }: {
        onHide: () => void;
        onShowSignUp: () => void;
        redirectTo: string;
        show: boolean;
      }) {
        return show ? (
          <section aria-label="Login modal" data-redirect-to={redirectTo}>
            <button onClick={onShowSignUp}>Switch to sign up</button>
            <button onClick={onHide}>Close login</button>
          </section>
        ) : null;
      },
  );
  jest.doMock(
    "@/components/Modal/ModalSignUp",
    () =>
      function MockSignUp({
        onHide,
        redirectTo,
        setLogin,
        show,
      }: {
        onHide: () => void;
        redirectTo: string;
        setLogin: (show: boolean) => void;
        show: boolean;
      }) {
        return show ? (
          <section aria-label="Sign-up modal" data-redirect-to={redirectTo}>
            <button
              onClick={() => {
                onHide();
                setLogin(true);
              }}
            >
              Switch to login
            </button>
            <button onClick={onHide}>Close sign up</button>
          </section>
        ) : null;
      },
  );

  ({ HomeScreenView } = await import("./HomeScreen"));
});

beforeEach(() => {
  mockController = buildController();
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
      renderer.root.findAllByProps({ "aria-label": "Login modal" }),
    ).toHaveLength(1);
    expect(
      renderer.root.findByProps({ "aria-label": "Login modal" }).props[
        "data-redirect-to"
      ],
    ).toBe("/MarketNews");
    expect(
      renderer.root.findAllByProps({ "aria-label": "Sign-up modal" }),
    ).toHaveLength(0);

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
      button.children.includes("Start free today"),
    );

    expect(signInButtons).toHaveLength(3);
    act(() => {
      signInButtons.forEach((button) => button.props.onClick());
      createAccount?.props.onClick();
    });

    expect(mockController.openLogin).toHaveBeenCalledTimes(3);
    expect(mockController.openSignUp).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it("matches the sign-up modal close-then-login transition", () => {
    mockController = buildController({ authDialog: "signup" });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HomeScreenView controller={mockController as any} />,
      );
    });

    act(() => {
      renderer.root
        .findByProps({ children: "Switch to login" })
        .props.onClick();
    });

    expect(mockController.closeAuthDialog).toHaveBeenCalledTimes(1);
    expect(mockController.switchToLogin).toHaveBeenCalledTimes(1);
    expect(
      mockController.closeAuthDialog.mock.invocationCallOrder[0],
    ).toBeLessThan(mockController.switchToLogin.mock.invocationCallOrder[0]);

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
          button.children.includes("Start free today") ||
          typeof button.props["aria-label"] === "string",
      );

    expect(entryButtons.length).toBeGreaterThan(0);
    expect(entryButtons.every((button) => button.props.disabled)).toBe(true);

    act(() => renderer.unmount());
  });
});
