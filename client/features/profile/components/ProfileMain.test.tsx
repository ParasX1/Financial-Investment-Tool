import * as React from "react";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

let mockProfile: Record<string, any>;
let ProfileMain: (typeof import("./ProfileMain"))["ProfileMain"];

function buildProfile(overrides: Record<string, unknown> = {}) {
  return {
    authLoading: false,
    avatarDisplayUrl: null,
    avatarUrl: null,
    changeAvatar: jest.fn<any>(),
    changePassword: jest.fn<any>().mockResolvedValue(false),
    clearFeedback: jest.fn<any>(),
    currentProfile: {
      avatarUrl: null,
      email: "alice@example.com",
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "",
    },
    displayName: "Alice Ng",
    email: "alice@example.com",
    emailVerified: true,
    errors: {},
    firstName: "Alice",
    handle: "alice_01",
    hasPendingEmailChange: false,
    initials: "AN",
    lastName: "Ng",
    message: null,
    pendingEmail: "",
    phone: "",
    profileHandle: "@alice_01",
    profileLoading: false,
    profileSnapshot: {
      avatarUrl: null,
      email: "alice@example.com",
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "",
    },
    resendVerification: jest.fn<any>(),
    saveEmail: jest.fn<any>(),
    saveIdentity: jest.fn<any>(),
    savePhone: jest.fn<any>(),
    savingAvatar: false,
    savingContact: false,
    savingDetails: false,
    sendingVerification: false,
    updateProfileField: jest.fn<any>(),
    updatingPassword: false,
    user: { id: "user-a" },
    userIdPreview: "user-a",
    ...overrides,
  };
}

describe("ProfileMain account-scoped dialog drafts", () => {
  beforeAll(() => {
    jest.doMock("../hooks/useProfileController", () => ({
      useProfileController: () => mockProfile,
    }));
    jest.doMock(
      "@/components/Modal/ModalLogin",
      () =>
        function MockLogin({
          onHide,
          onShowSignUp,
          show,
        }: {
          onHide: () => void;
          onShowSignUp: () => void;
          show: boolean;
        }) {
          return show ? (
            <section aria-label="Login modal">
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
          setLogin,
          show,
        }: {
          onHide: () => void;
          setLogin: (show: boolean) => void;
          show: boolean;
        }) {
          return show ? (
            <section aria-label="Sign-up modal">
              <button onClick={() => setLogin(true)}>Switch to login</button>
              <button onClick={onHide}>Close sign up</button>
            </section>
          ) : null;
        },
    );
    jest.doMock("@/components/shared/FitPageHeader", () => ({
      FitPageHeader: () => null,
    }));
    jest.doMock("@/components/shared/FitPageShell", () => ({
      FitPageShell: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
    }));
    jest.doMock("./ProfileAccountSections", () => ({
      ProfileSettingsPanel: ({
        onAvatarChange,
        onEditEmail,
        onEditIdentity,
        onEditPassword,
        onEditPhone,
        onResendVerification,
      }: {
        onAvatarChange: React.ChangeEventHandler<HTMLInputElement>;
        onEditEmail: () => void;
        onEditIdentity: () => void;
        onEditPassword: () => void;
        onEditPhone: () => void;
        onResendVerification: () => void;
      }) => (
        <div>
          <button onClick={onEditIdentity}>Open identity</button>
          <button onClick={onEditEmail}>Open email</button>
          <button onClick={onEditPhone}>Open phone</button>
          <button onClick={onEditPassword}>Open password</button>
          <button onClick={onResendVerification}>Resend verification</button>
          <input
            aria-label="Avatar upload"
            type="file"
            onChange={onAvatarChange}
          />
        </div>
      ),
    }));
    jest.doMock("./ProfileEditDialog", () => ({
      ProfileEditDialog: ({
        children,
        onClose,
        onSubmit,
        show,
        title,
      }: {
        children: React.ReactNode;
        onClose: () => void;
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
        show: boolean;
        title: string;
      }) =>
        show ? (
          <section aria-label={title}>
            <form onSubmit={onSubmit}>
              {children}
              <button type="submit">Submit dialog</button>
            </form>
            <button type="button" onClick={onClose}>
              Close dialog
            </button>
          </section>
        ) : null,
    }));
    jest.doMock("./ProfileField", () => ({
      ProfileField: ({
        error,
        id,
        onChange,
        value,
      }: {
        error?: string;
        id: string;
        onChange: (value: string) => void;
        value: string;
      }) => (
        <input
          id={id}
          data-error={error}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ),
    }));
    ProfileMain = require("./ProfileMain").ProfileMain;
  });

  beforeEach(() => {
    mockProfile = buildProfile();
  });

  it("closes dialogs and clears password drafts when the auth account changes", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ProfileMain />);
    });

    act(() => {
      renderer!.root.findByProps({ children: "Open password" }).props.onClick();
    });
    const passwordInput = renderer!.root
      .findAllByType("input")
      .find((input) => input.props.id === "profile-dialog-new-password")!;
    act(() =>
      passwordInput.props.onChange({ currentTarget: { value: "Secret7" } }),
    );
    expect(
      renderer!.root
        .findAllByType("input")
        .find((input) => input.props.id === "profile-dialog-new-password")!
        .props.value,
    ).toBe("Secret7");

    mockProfile = buildProfile({
      email: "bob@example.com",
      user: { id: "user-b" },
    });
    act(() => renderer!.update(<ProfileMain />));
    expect(
      renderer!.root.findAllByProps({ "aria-label": "Change password" }),
    ).toHaveLength(0);

    act(() => {
      renderer!.root.findByProps({ children: "Open password" }).props.onClick();
    });
    expect(
      renderer!.root
        .findAllByType("input")
        .find((input) => input.props.id === "profile-dialog-new-password")!
        .props.value,
    ).toBe("");
    renderer!.unmount();
  });

  it("removes password values from memory after a successful update", async () => {
    mockProfile = buildProfile({
      changePassword: jest.fn<any>().mockResolvedValue(true),
    });
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ProfileMain />);
    });
    act(() => {
      renderer!.root.findByProps({ children: "Open password" }).props.onClick();
    });

    const inputs = renderer!.root
      .findAllByType("input")
      .filter((input) => input.props.id?.startsWith("profile-dialog-"));
    act(() => {
      inputs[0].props.onChange({ currentTarget: { value: "Secret7" } });
      inputs[1].props.onChange({ currentTarget: { value: "Secret7" } });
    });
    await act(async () => {
      await renderer!.root.findByType("form").props.onSubmit({
        preventDefault: jest.fn(),
      });
    });

    act(() => {
      renderer!.root.findByProps({ children: "Open password" }).props.onClick();
    });
    const reopenedInputs = renderer!.root
      .findAllByType("input")
      .filter((input) => input.props.id?.startsWith("profile-dialog-"));
    expect(reopenedInputs.map((input) => input.props.value)).toEqual(["", ""]);
    renderer!.unmount();
  });

  it("submits each account draft through its focused controller action", async () => {
    const saveIdentity = jest.fn<any>().mockResolvedValue(true);
    const saveEmail = jest.fn<any>().mockResolvedValue(true);
    const savePhone = jest.fn<any>().mockResolvedValue(true);
    mockProfile = buildProfile({ saveEmail, saveIdentity, savePhone });
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ProfileMain />);
    });

    act(() =>
      renderer!.root.findByProps({ children: "Open identity" }).props.onClick(),
    );
    act(() => {
      renderer!.root
        .findByProps({ id: "profile-dialog-handle" })
        .props.onChange("alice_student");
      renderer!.root
        .findByProps({ id: "profile-dialog-first-name" })
        .props.onChange("Alicia");
      renderer!.root
        .findByProps({ id: "profile-dialog-last-name" })
        .props.onChange("Chen");
    });
    await act(async () => {
      await renderer!.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(saveIdentity).toHaveBeenCalledWith({
      firstName: "Alicia",
      handle: "alice_student",
      lastName: "Chen",
    });

    act(() =>
      renderer!.root.findByProps({ children: "Open email" }).props.onClick(),
    );
    act(() =>
      renderer!.root
        .findByProps({ id: "profile-dialog-email" })
        .props.onChange("alicia@example.com"),
    );
    await act(async () => {
      await renderer!.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(saveEmail).toHaveBeenCalledWith({ email: "alicia@example.com" });

    act(() =>
      renderer!.root.findByProps({ children: "Open phone" }).props.onClick(),
    );
    act(() =>
      renderer!.root
        .findByProps({ id: "profile-dialog-phone" })
        .props.onChange("+61 400 000 000"),
    );
    await act(async () => {
      await renderer!.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(savePhone).toHaveBeenCalledWith({ phone: "+61 400 000 000" });
    expect(renderer!.root.findAllByType("form")).toHaveLength(0);
    renderer!.unmount();
  });

  it("keeps invalid password drafts open with field-level feedback", async () => {
    const changePassword = jest.fn<any>();
    mockProfile = buildProfile({ changePassword });
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ProfileMain />);
    });
    act(() =>
      renderer!.root.findByProps({ children: "Open password" }).props.onClick(),
    );
    act(() => {
      renderer!.root
        .findByProps({ id: "profile-dialog-new-password" })
        .props.onChange("short");
      renderer!.root
        .findByProps({ id: "profile-dialog-confirm-password" })
        .props.onChange("different");
    });
    await act(async () => {
      await renderer!.root
        .findByType("form")
        .props.onSubmit({ preventDefault: jest.fn() });
    });

    expect(changePassword).not.toHaveBeenCalled();
    expect(
      renderer!.root.findByProps({ id: "profile-dialog-new-password" }).props
        .error,
    ).toBe("Password must be at least 6 characters.");
    expect(
      renderer!.root.findByProps({ id: "profile-dialog-confirm-password" })
        .props.error,
    ).toBe("New password and confirmation do not match.");
    renderer!.unmount();
  });

  it("renders signed-out and loading states without exposing account settings", () => {
    mockProfile = buildProfile({
      currentProfile: null,
      profileSnapshot: null,
      user: null,
    });
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ProfileMain />);
    });
    act(() =>
      renderer!.root.findByProps({ children: "Sign in" }).props.onClick(),
    );
    expect(
      renderer!.root.findAllByProps({ "aria-label": "Login modal" }),
    ).toHaveLength(1);
    act(() =>
      renderer!.root
        .findByProps({ children: "Switch to sign up" })
        .props.onClick(),
    );
    expect(
      renderer!.root.findAllByProps({ "aria-label": "Sign-up modal" }),
    ).toHaveLength(1);
    act(() =>
      renderer!.root
        .findByProps({ children: "Switch to login" })
        .props.onClick(),
    );
    act(() =>
      renderer!.root.findByProps({ children: "Close login" }).props.onClick(),
    );

    mockProfile = buildProfile({
      authLoading: true,
      profileSnapshot: null,
      user: null,
    });
    act(() => renderer!.update(<ProfileMain />));
    expect(
      renderer!.root.findByProps({ children: "Loading your profile" }),
    ).toBeTruthy();

    mockProfile = buildProfile({ profileLoading: true, profileSnapshot: null });
    act(() => renderer!.update(<ProfileMain />));
    expect(
      renderer!.root.findByProps({ children: "Loading your profile details" }),
    ).toBeTruthy();
    renderer!.unmount();
  });
});
