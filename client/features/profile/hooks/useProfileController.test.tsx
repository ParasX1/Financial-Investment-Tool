import * as React from "react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { ProfileControllerDependencies } from "../data/profileDependencies";
import { ProfileAvatarStorageError } from "../data/profileAvatarStorage";

type TestUser = {
  email: string;
  email_change_sent_at?: string | null;
  email_confirmed_at?: string | null;
  id: string;
  new_email?: string | null;
};

let mockAuthState: { loading: boolean; user: TestUser | null };
let useProfileController: (typeof import("./useProfileController"))["useProfileController"];
const originalWindow = globalThis.window;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function user(id: string, email: string): TestUser {
  return {
    email,
    email_change_sent_at: null,
    email_confirmed_at: "2026-01-01T00:00:00Z",
    id,
    new_email: null,
  };
}

function createDependencies(): ProfileControllerDependencies {
  return {
    accountClient: {
      requestEmailChange: jest.fn<any>().mockResolvedValue({
        pendingEmail: null,
        sentAt: null,
      }),
      resendVerification: jest.fn<any>().mockResolvedValue(undefined),
      updatePassword: jest.fn<any>().mockResolvedValue(undefined),
    },
    avatarStorage: {
      remove: jest.fn<any>().mockResolvedValue(undefined),
      upload: jest.fn<any>().mockResolvedValue({
        path: "user-a/avatar",
        publicUrl: "https://cdn.example.com/user-a/avatar",
      }),
    },
    usersRepository: {
      findByUserId: jest.fn<any>().mockResolvedValue(null),
      saveAvatar: jest.fn<any>().mockResolvedValue(undefined),
      saveIdentity: jest.fn<any>().mockResolvedValue(undefined),
      savePhone: jest.fn<any>().mockResolvedValue(undefined),
    },
  };
}

describe("useProfileController session lifecycle", () => {
  beforeAll(() => {
    jest.doMock("@/features/auth", () => ({
      useAuth: () => mockAuthState,
    }));
    useProfileController =
      require("./useProfileController").useProfileController;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { loading: true, user: null };
    (globalThis as any).window = {
      location: { origin: "https://app.example.com" },
    };
    (URL as any).createObjectURL = jest.fn(() => "blob:avatar-preview");
    (URL as any).revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
      writable: true,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
      writable: true,
    });
  });

  it("never renders the previous account profile while the next account loads", async () => {
    const userBLoad = deferred<any>();
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockImplementation((userId: string) =>
      userId === "user-a"
        ? Promise.resolve({
            avatarUrl: "https://cdn.example.com/alice.png",
            firstName: "Alice",
            handle: "alice_01",
            lastName: "Ng",
            phone: "+61 400 000 001",
          })
        : userBLoad.promise,
    );
    const renders: Array<Record<string, unknown>> = [];
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      const state = useProfileController(dependencies);
      latest = state;
      renders.push({
        authUserId: mockAuthState.user?.id ?? null,
        avatarDisplayUrl: state.avatarDisplayUrl,
        firstName: state.firstName,
        handle: state.handle,
        lastName: state.lastName,
        phone: state.phone,
        profileSnapshot: state.profileSnapshot,
      });
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(renders.at(-1)).toMatchObject({ firstName: "Alice" });

    renders.length = 0;
    mockAuthState = { loading: false, user: user("user-b", "bob@example.com") };
    act(() => renderer!.update(<Probe />));

    expect(
      renders.filter((render) => render.authUserId === "user-b"),
    ).not.toContainEqual(expect.objectContaining({ firstName: "Alice" }));
    expect(
      renders.some(
        (render) =>
          render.authUserId === "user-b" &&
          (render.avatarDisplayUrl === "https://cdn.example.com/alice.png" ||
            render.handle === "alice_01" ||
            render.phone === "+61 400 000 001" ||
            render.profileSnapshot !== null),
      ),
    ).toBe(false);
    await act(async () => {
      expect(
        await latest!.saveIdentity({
          firstName: "Stale",
          handle: "stale_01",
          lastName: "Draft",
        }),
      ).toBe(false);
    });
    expect(dependencies.usersRepository.saveIdentity).not.toHaveBeenCalled();

    await act(async () => {
      userBLoad.resolve({
        avatarUrl: null,
        firstName: "Bob",
        handle: "bob_02",
        lastName: "Yu",
        phone: "",
      });
      await flushPromises();
    });
    expect(renders.at(-1)).toMatchObject({
      firstName: "Bob",
      handle: "bob_02",
    });
    renderer!.unmount();
  });

  it("does not reload profile details for a same-account auth object refresh", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer;

    function Probe() {
      useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(dependencies.usersRepository.findByUserId).toHaveBeenCalledTimes(1);

    mockAuthState = {
      loading: false,
      user: { ...user("user-a", "alice@example.com") },
    };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(dependencies.usersRepository.findByUserId).toHaveBeenCalledTimes(1);
    renderer!.unmount();
  });

  it("keeps the confirmed auth email separate from a pending email change", async () => {
    mockAuthState = {
      loading: false,
      user: {
        ...user("user-a", "alice@example.com"),
        email_change_sent_at: "2026-07-17T00:00:00Z",
        new_email: "next@example.com",
      },
    };
    const dependencies = createDependencies();
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest).toMatchObject({
      email: "alice@example.com",
      hasPendingEmailChange: true,
      pendingEmail: "next@example.com",
      profileSnapshot: { email: "alice@example.com" },
    });
    renderer!.unmount();
  });

  it("masks profile data immediately during auth reload and sign-out", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockResolvedValue({
      avatarUrl: "https://cdn.example.com/alice.png",
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "+61 400 000 001",
    });
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest!.firstName).toBe("Alice");

    mockAuthState = {
      loading: true,
      user: user("user-a", "alice@example.com"),
    };
    act(() => renderer!.update(<Probe />));
    expect(latest).toMatchObject({
      avatarDisplayUrl: null,
      firstName: "",
      handle: "",
      lastName: "",
      phone: "",
      profileSnapshot: null,
    });

    mockAuthState = { loading: false, user: null };
    act(() => renderer!.update(<Probe />));
    expect(latest).toMatchObject({
      avatarDisplayUrl: null,
      email: "",
      firstName: "",
      profileSnapshot: null,
    });
    renderer!.unmount();
  });

  it("finishes a rejected load with a stable, non-sensitive error", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockRejectedValue(new Error("postgres host and policy details"));
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    expect(latest!.profileLoading).toBe(false);
    expect(latest!.message).toEqual({
      tone: "error",
      text: "Profile details could not be loaded. Refresh the page or sign in again.",
    });
    expect(latest!.message?.text).not.toContain("postgres");
    renderer!.unmount();
  });

  it("discards a previous session mutation after the account changes", async () => {
    const saveA = deferred<void>();
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockImplementation((userId: string) =>
      Promise.resolve(
        userId === "user-a"
          ? {
              avatarUrl: null,
              firstName: "Alice",
              handle: "alice_01",
              lastName: "Ng",
              phone: "",
            }
          : {
              avatarUrl: null,
              firstName: "Bob",
              handle: "bob_02",
              lastName: "Yu",
              phone: "",
            },
      ),
    );
    (
      dependencies.usersRepository.saveIdentity as jest.Mock<any>
    ).mockReturnValue(saveA.promise);
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    act(() => {
      void latest!.saveIdentity({
        firstName: "Alicia",
        handle: "alicia_01",
        lastName: "Ng",
      });
    });

    mockAuthState = { loading: false, user: user("user-b", "bob@example.com") };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest!.firstName).toBe("Bob");

    await act(async () => {
      saveA.resolve();
      await flushPromises();
    });
    expect(latest!.firstName).toBe("Bob");
    expect(latest!.message?.text).not.toBe("Profile identity updated.");
    renderer!.unmount();
  });

  it("persists identity, phone, and auth email through their narrow adapters", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockResolvedValue({
      avatarPath: "user-a/old.png",
      avatarUrl:
        "https://project.supabase.co/storage/v1/object/public/avatars/user-a/old.png",
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "",
    });
    (
      dependencies.accountClient.requestEmailChange as jest.Mock<any>
    ).mockResolvedValue({
      pendingEmail: "next@example.com",
      sentAt: "2026-07-17T00:00:00Z",
    });
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    let identitySaved = false;
    await act(async () => {
      identitySaved = await latest!.saveIdentity({
        firstName: " Alicia ",
        handle: "alicia_01",
        lastName: " Ng ",
      });
    });
    expect(identitySaved).toBe(true);
    expect(latest).toMatchObject({
      firstName: "Alicia",
      handle: "alicia_01",
      message: { tone: "success", text: "Profile identity updated." },
      savingDetails: false,
    });

    let phoneSaved = false;
    await act(async () => {
      phoneSaved = await latest!.savePhone({ phone: "+61 400 000 002" });
    });
    expect(phoneSaved).toBe(true);
    expect(latest!.phone).toBe("+61 400 000 002");

    let emailSaved = false;
    await act(async () => {
      emailSaved = await latest!.saveEmail({ email: "NEXT@example.com" });
    });
    expect(emailSaved).toBe(true);
    expect(dependencies.accountClient.requestEmailChange).toHaveBeenCalledWith({
      email: "next@example.com",
      redirectTo: expect.stringMatching(/\/Profile$/),
    });
    expect(latest).toMatchObject({
      email: "alice@example.com",
      hasPendingEmailChange: true,
      pendingEmail: "next@example.com",
      savingContact: false,
    });
    renderer!.unmount();
  });

  it("rejects invalid edits before I/O and restores busy state after failures", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockResolvedValue({
      avatarPath: "user-a/old.png",
      avatarUrl:
        "https://project.supabase.co/storage/v1/object/public/avatars/user-a/old.png",
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "",
    });
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    await act(async () => {
      expect(
        await latest!.saveIdentity({
          firstName: "",
          handle: "BAD!",
          lastName: "",
        }),
      ).toBe(false);
      expect(await latest!.saveEmail({ email: "not-an-email" })).toBe(false);
      expect(await latest!.savePhone({ phone: "123" })).toBe(false);
      expect(await latest!.changePassword("short", "different")).toBe(false);
    });
    expect(dependencies.usersRepository.saveIdentity).not.toHaveBeenCalled();
    expect(dependencies.usersRepository.savePhone).not.toHaveBeenCalled();
    expect(
      dependencies.accountClient.requestEmailChange,
    ).not.toHaveBeenCalled();
    expect(dependencies.accountClient.updatePassword).not.toHaveBeenCalled();

    (
      dependencies.usersRepository.saveIdentity as jest.Mock<any>
    ).mockRejectedValueOnce(new Error("database internals"));
    await act(async () => {
      expect(
        await latest!.saveIdentity({
          firstName: "Alicia",
          handle: "alicia_01",
          lastName: "Ng",
        }),
      ).toBe(false);
    });
    expect(latest).toMatchObject({
      message: { tone: "error", text: "Profile save failed. Try again." },
      savingDetails: false,
    });

    (
      dependencies.accountClient.updatePassword as jest.Mock<any>
    ).mockRejectedValueOnce(new Error("auth internals"));
    await act(async () => {
      expect(await latest!.changePassword("strong7", "strong7")).toBe(false);
    });
    expect(latest).toMatchObject({
      message: {
        tone: "error",
        text: "Password update failed. Please sign in again and retry.",
      },
      updatingPassword: false,
    });
    renderer!.unmount();
  });

  it("uploads avatars, rolls back failed profile saves, and revokes previews", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (
      dependencies.usersRepository.findByUserId as jest.Mock<any>
    ).mockResolvedValue({
      avatarPath: null,
      avatarUrl: null,
      firstName: "Alice",
      handle: "alice_01",
      lastName: "Ng",
      phone: "",
    });
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    const unsupportedEvent = {
      target: {
        files: [{ name: "avatar.svg", size: 100, type: "image/svg+xml" }],
        value: "avatar.svg",
      },
    } as any;
    await act(async () => {
      expect(await latest!.changeAvatar(unsupportedEvent)).toBe(false);
    });
    expect(dependencies.avatarStorage.upload).not.toHaveBeenCalled();

    const imageEvent = () =>
      ({
        target: {
          files: [{ name: "avatar.png", size: 100, type: "image/png" }],
          value: "avatar.png",
        },
      }) as any;
    (
      dependencies.usersRepository.saveAvatar as jest.Mock<any>
    ).mockRejectedValueOnce(new Error("profile save failed"));
    await act(async () => {
      expect(await latest!.changeAvatar(imageEvent())).toBe(false);
    });
    expect(dependencies.avatarStorage.remove).toHaveBeenCalledWith({
      path: "user-a/avatar",
      userId: "user-a",
    });
    expect(latest).toMatchObject({ savingAvatar: false });

    await act(async () => {
      expect(await latest!.changeAvatar(imageEvent())).toBe(true);
    });
    expect(dependencies.usersRepository.saveAvatar).toHaveBeenLastCalledWith({
      avatarPath: "user-a/avatar",
      avatarUrl: "https://cdn.example.com/user-a/avatar",
      userId: "user-a",
    });
    expect(latest).toMatchObject({
      avatarUrl: "https://cdn.example.com/user-a/avatar",
      message: { tone: "success", text: "Profile photo updated." },
      savingAvatar: false,
    });

    (dependencies.usersRepository.saveAvatar as jest.Mock<any>).mockClear();
    (dependencies.avatarStorage.remove as jest.Mock<any>).mockClear();
    await act(async () => {
      expect(await latest!.changeAvatar(imageEvent())).toBe(true);
    });
    expect(dependencies.usersRepository.saveAvatar).not.toHaveBeenCalled();
    expect(dependencies.avatarStorage.remove).not.toHaveBeenCalled();
    expect((URL as any).revokeObjectURL).toHaveBeenCalledWith(
      "blob:avatar-preview",
    );
    renderer!.unmount();
  });

  it("classifies unavailable avatar storage and handles password and verification", async () => {
    mockAuthState = {
      loading: false,
      user: user("user-a", "alice@example.com"),
    };
    const dependencies = createDependencies();
    (dependencies.avatarStorage.upload as jest.Mock<any>).mockRejectedValue(
      new ProfileAvatarStorageError("bucket_missing"),
    );
    let latest: ReturnType<typeof useProfileController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useProfileController(dependencies);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    await act(async () => {
      expect(
        await latest!.changeAvatar({
          target: {
            files: [{ name: "avatar.png", size: 100, type: "image/png" }],
            value: "avatar.png",
          },
        } as any),
      ).toBe(false);
    });
    expect(latest!.message).toEqual({
      tone: "info",
      text: "Avatar storage is not available yet.",
    });

    await act(async () => {
      expect(await latest!.changePassword("strong7", "strong7")).toBe(true);
      await latest!.resendVerification();
    });
    expect(dependencies.accountClient.updatePassword).toHaveBeenCalledWith(
      "strong7",
    );
    expect(dependencies.accountClient.resendVerification).toHaveBeenCalledWith({
      email: "alice@example.com",
      kind: "signup",
      redirectTo: expect.stringMatching(/\/Profile$/),
    });
    expect(latest!.message).toEqual({
      tone: "success",
      text: "Verification email sent. Check your inbox.",
    });
    renderer!.unmount();
  });
});
