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
    show
      ? React.createElement("section", { ...props, role: "dialog" }, children)
      : null;
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

  it("submits normalized sign-in details, including an existing short password, and returns to the requested page", async () => {
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
        target: { value: "sixchr" },
      });
    });

    await act(async () => {
      await view.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });

    expect(signIn).toHaveBeenCalledWith("student@example.com", "sixchr");
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
      inputById(view.root, "auth-first-name").props.onChange({
        target: { value: "Ada" },
      });
      inputById(view.root, "auth-last-name").props.onChange({
        target: { value: "Lovelace" },
      });
      inputById(view.root, "auth-email").props.onChange({
        target: { value: "ada@example.com" },
      });
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "analytical engine" },
      });
    });
    act(() =>
      view.root.findByProps({ "aria-label": "Show password" }).props.onClick(),
    );

    await act(async () => {
      await view.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });

    expect(signUp).toHaveBeenCalledWith(
      "ada@example.com",
      "analytical engine",
      { first_name: "Ada", last_name: "Lovelace" },
      "/Profile",
    );
    expect(
      view.root.findByProps({ role: "status" }).children.join(""),
    ).toContain("confirmation link");
    expect(inputById(view.root, "auth-password").props.type).toBe("password");
    expect(inputById(view.root, "auth-password").props.value).toBe("");
  });

  it("closes and uses the safe default destination when signup returns an active session", async () => {
    signUp.mockResolvedValue("confirmed");
    const onHide = jest.fn();
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(
        <AuthDialog
          initialMode="sign-up"
          redirectTo="//external.example"
          show
          onHide={onHide}
        />,
      );
    });
    act(() => {
      inputById(view.root, "auth-first-name").props.onChange({
        target: { value: "Example" },
      });
      inputById(view.root, "auth-last-name").props.onChange({
        target: { value: "Student" },
      });
      inputById(view.root, "auth-email").props.onChange({
        target: { value: "ui-fixture@example.invalid" },
      });
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "local UI example password" },
      });
    });
    await act(async () => {
      await view.root.findByType("form").props.onSubmit({
        preventDefault: jest.fn(),
      });
    });

    expect(signUp).toHaveBeenCalledWith(
      "ui-fixture@example.invalid",
      "local UI example password",
      { first_name: "Example", last_name: "Student" },
      "/Portfolio",
    );
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/Portfolio");
    expect(view.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });

  it("reveals the password without changing its value and hides it when switching modes", () => {
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={jest.fn()} />);
    });

    act(() =>
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "a safe password" },
      }),
    );
    const reveal = view.root.findByProps({ "aria-label": "Show password" });
    expect(reveal.props["aria-controls"]).toBe("auth-password");
    expect(reveal.props["aria-pressed"]).toBe(false);
    act(() => reveal.props.onClick());
    expect(inputById(view.root, "auth-password").props.type).toBe("text");
    expect(inputById(view.root, "auth-password").props.value).toBe(
      "a safe password",
    );
    expect(
      view.root.findByProps({ "aria-label": "Hide password" }).props[
        "aria-pressed"
      ],
    ).toBe(true);

    act(() => buttonByText(view.root, "Create account")!.props.onClick());
    expect(inputById(view.root, "auth-password").props.type).toBe("password");
    expect(inputById(view.root, "auth-password").props.value).toBe("");
  });

  it("associates invalid fields with their errors and skips the auth request", async () => {
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={jest.fn()} />);
    });
    await act(async () => {
      await view.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });

    expect(signIn).not.toHaveBeenCalled();
    expect(inputById(view.root, "auth-email").props["aria-invalid"]).toBe(true);
    expect(inputById(view.root, "auth-email").props["aria-describedby"]).toBe(
      "auth-email-error",
    );
    expect(
      view.root.findByProps({ id: "auth-email-error" }).children.join(""),
    ).toBe("Enter your email address.");
  });

  it("locks fields and dismissal while signing in, then releases them after an error", async () => {
    let rejectSignIn!: (error: Error) => void;
    signIn.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSignIn = reject;
        }),
    );
    const onHide = jest.fn();
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={onHide} />);
    });
    act(() => {
      inputById(view.root, "auth-email").props.onChange({
        target: { value: "ada@example.com" },
      });
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "a safe password" },
      });
    });

    let request!: Promise<void>;
    act(() => {
      request = view.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(view.root.findByType("form").props["aria-busy"]).toBe(true);
    expect(inputById(view.root, "auth-email").props.disabled).toBe(true);
    expect(inputById(view.root, "auth-password").props.disabled).toBe(true);
    expect(
      view.root.findByProps({ "aria-label": "Show password" }).props.disabled,
    ).toBe(true);
    expect(
      view.root.findByProps({ "aria-label": "Close authentication dialog" })
        .props.disabled,
    ).toBe(true);
    expect(buttonByText(view.root, "Create account")!.props.disabled).toBe(
      true,
    );
    expect(buttonByText(view.root, "Sign in")!.props.disabled).toBe(true);
    expect(
      view.root.findByProps({ role: "dialog" }).props.onHide,
    ).toBeUndefined();
    await act(async () => {
      await view.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(signIn).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectSignIn(
        Object.assign(new Error("Invalid login credentials"), {
          code: "invalid_credentials",
        }),
      );
      await request;
    });
    expect(view.root.findByType("form").props["aria-busy"]).toBe(false);
    expect(inputById(view.root, "auth-email").props.disabled).toBe(false);
    expect(
      view.root.findByProps({ role: "alert" }).children.join(""),
    ).toContain("email and password");
    expect(onHide).not.toHaveBeenCalled();
  });

  it("identifies Google as the pending action and preserves the safe redirect", async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(
        <AuthDialog redirectTo="//external.example" show onHide={jest.fn()} />,
      );
    });
    const googleButton = view.root.findByProps({
      "aria-label": "Sign in with Google",
    });
    await act(async () => {
      await googleButton.props.onClick();
    });

    expect(signInWithGoogle).toHaveBeenCalledWith("/Portfolio");
    expect(
      view.root.findByProps({ role: "status" }).children.join(""),
    ).toContain("Google");
    expect(view.root.findByType("form").props["aria-busy"]).toBe(true);
    expect(
      view.root.findByProps({ "aria-label": "Sign in with Google" }).props
        .disabled,
    ).toBe(true);
  });
  it("clears the password draft and visibility when closed and reopened", () => {
    const onHide = jest.fn();
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={onHide} />);
    });
    act(() => {
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "a safe password" },
      });
      view.root.findByProps({ "aria-label": "Show password" }).props.onClick();
    });
    act(() => view.update(<AuthDialog show={false} onHide={onHide} />));
    act(() => view.update(<AuthDialog show onHide={onHide} />));

    expect(inputById(view.root, "auth-password").props.type).toBe("password");
    expect(inputById(view.root, "auth-password").props.value).toBe("");
  });

  it("unlocks the form and announces a Google sign-in startup failure", async () => {
    signInWithGoogle.mockRejectedValue(new Error("Could not start OAuth"));
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={jest.fn()} />);
    });
    const googleButton = view.root.findByProps({
      "aria-label": "Sign in with Google",
    });
    await act(async () => {
      await googleButton.props.onClick();
    });

    expect(view.root.findByType("form").props["aria-busy"]).toBe(false);
    expect(inputById(view.root, "auth-email").props.disabled).toBe(false);
    expect(view.root.findByProps({ role: "alert" }).children.join("")).toBe(
      "Google sign-in couldn't start. Please try again.",
    );
    expect(view.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });

  it("preserves the email draft while clearing stale field errors on a mode change", async () => {
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={jest.fn()} />);
    });
    act(() => {
      inputById(view.root, "auth-email").props.onChange({
        target: { value: "student@example.invalid" },
      });
    });
    await act(async () => {
      await view.root.findByType("form").props.onSubmit({
        preventDefault: jest.fn(),
      });
    });
    expect(inputById(view.root, "auth-password").props["aria-invalid"]).toBe(
      true,
    );
    act(() => buttonByText(view.root, "Create account")!.props.onClick());
    expect(inputById(view.root, "auth-email").props.value).toBe(
      "student@example.invalid",
    );
    expect(inputById(view.root, "auth-password").props["aria-invalid"]).toBe(
      false,
    );
    expect(
      inputById(view.root, "auth-password").props["aria-describedby"],
    ).toBe("auth-password-description");
  });

  it("announces an email request outside the busy form", async () => {
    let resolveSignIn!: () => void;
    signIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    let view!: renderer.ReactTestRenderer;
    act(() => {
      view = renderer.create(<AuthDialog show onHide={jest.fn()} />);
    });
    act(() => {
      inputById(view.root, "auth-email").props.onChange({
        target: { value: "student@example.invalid" },
      });
      inputById(view.root, "auth-password").props.onChange({
        target: { value: "sixchr" },
      });
    });
    let request!: Promise<void>;
    act(() => {
      request = view.root.findByType("form").props.onSubmit({
        preventDefault: jest.fn(),
      });
    });
    const status = view.root.findByProps({ role: "status" });
    expect(status.children.join("")).toContain("Signing in");
    let ancestor = status.parent;
    while (ancestor) {
      expect(ancestor.type).not.toBe("form");
      ancestor = ancestor.parent;
    }
    await act(async () => {
      resolveSignIn();
      await request;
    });
  });
});
