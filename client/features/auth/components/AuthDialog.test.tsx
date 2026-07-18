import * as React from "react";
import renderer, { act } from "react-test-renderer";
import { AuthDialog } from "./AuthDialog";

const push = jest.fn();
const signIn = jest.fn();
const signUp = jest.fn();
const signInWithGoogle = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signIn, signUp, signInWithGoogle }),
}));

jest.mock("react-bootstrap/Modal", () => {
  const React = require("react");
  const Modal = ({ children, show, ...props }: any) =>
    show ? React.createElement("section", { ...props, role: "dialog" }, children) : null;
  return { __esModule: true, default: Modal };
});

jest.mock("react-bootstrap/ModalBody", () => {
  const React = require("react");
  const ModalBody = ({ children, ...props }: any) =>
    React.createElement("div", props, children);
  return { __esModule: true, default: ModalBody };
});

function buttonByText(root: renderer.ReactTestInstance, text: string) {
  return root
    .findAllByType("button")
    .find((button) => button.children.join("") === text);
}

function inputById(root: renderer.ReactTestInstance, id: string) {
  return root.findAllByType("input").find((input) => input.props.id === id)!;
}

describe("AuthDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("always offers both Sign in and Create account from an app-internal entry", () => {
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(
        <AuthDialog initialMode="sign-in" show onHide={jest.fn()} />,
      );
    });

    expect(buttonByText(view.root, "Sign in")).toBeTruthy();
    expect(buttonByText(view.root, "Create account")).toBeTruthy();

    act(() => buttonByText(view.root, "Create account")!.props.onClick());

    expect(inputById(view.root, "auth-first-name")).toBeTruthy();
    expect(inputById(view.root, "auth-password").props.autoComplete).toBe(
      "new-password",
    );
  });

  it("submits normalized sign-in details and returns to the requested page", async () => {
    signIn.mockResolvedValue(undefined);
    const onHide = jest.fn();
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(
        <AuthDialog
          initialMode="sign-in"
          redirectTo="/Watchlist"
          show
          onHide={onHide}
        />,
      );
    });

    act(() => {
      inputById(view.root, "auth-email").props.onChange({
        target: { value: "  Student@Example.com " },
      });
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "a safe password" },
      });
    });

    await act(async () => {
      await view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() });
    });

    expect(signIn).toHaveBeenCalledWith("student@example.com", "a safe password");
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/Watchlist");
  });

  it("passes a safe confirmation destination when creating an account", async () => {
    signUp.mockResolvedValue("verify-email");
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(
        <AuthDialog
          initialMode="sign-up"
          redirectTo="/Profile"
          show
          onHide={jest.fn()}
        />,
      );
    });

    act(() => {
      inputById(view.root, "auth-first-name").props.onChange({ target: { value: "Ada" } });
      inputById(view.root, "auth-last-name").props.onChange({ target: { value: "Lovelace" } });
      inputById(view.root, "auth-email").props.onChange({ target: { value: "ada@example.com" } });
      inputById(view.root, "auth-password").props.onChange({ target: { value: "analytical engine" } });
    });

    await act(async () => {
      await view.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() });
    });

    expect(signUp).toHaveBeenCalledWith(
      "ada@example.com",
      "analytical engine",
      { first_name: "Ada", last_name: "Lovelace" },
      "/Profile",
    );
    expect(view.root.findByProps({ role: "status" }).children.join("")).toContain(
      "confirmation link",
    );
  });
});
