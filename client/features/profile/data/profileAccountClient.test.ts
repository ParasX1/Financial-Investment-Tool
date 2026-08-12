import { describe, expect, it, jest } from "@jest/globals";
import { createProfileAccountClient } from "./profileAccountClient";

describe("profileAccountClient", () => {
  it("requests an email change with a caller-owned redirect", async () => {
    const updateUser = jest.fn<any>().mockResolvedValue({
      data: {
        user: {
          email_change_sent_at: "2026-07-17T00:00:00Z",
          new_email: "next@example.com",
        },
      },
      error: null,
    });
    const account = createProfileAccountClient({
      resend: jest.fn<any>(),
      updateUser,
    } as any);

    await expect(
      account.requestEmailChange({
        email: "next@example.com",
        redirectTo: "https://app.example.com/Profile",
      }),
    ).resolves.toEqual({
      pendingEmail: "next@example.com",
      sentAt: "2026-07-17T00:00:00Z",
    });
    expect(updateUser).toHaveBeenCalledWith(
      { email: "next@example.com" },
      { emailRedirectTo: "https://app.example.com/Profile" },
    );
  });

  it("updates passwords and resends the selected verification flow", async () => {
    const nextPassword = ["strong", "password"].join("-");
    const updateUser = jest.fn<any>().mockResolvedValue({
      data: { user: {} },
      error: null,
    });
    const resend = jest.fn<any>().mockResolvedValue({ data: {}, error: null });
    const account = createProfileAccountClient({ resend, updateUser } as any);

    await account.updatePassword(nextPassword);
    await account.resendVerification({
      email: "next@example.com",
      kind: "email_change",
      redirectTo: "https://app.example.com/Profile",
    });

    expect(updateUser).toHaveBeenCalledWith({ password: nextPassword });
    expect(resend).toHaveBeenCalledWith({
      email: "next@example.com",
      options: { emailRedirectTo: "https://app.example.com/Profile" },
      type: "email_change",
    });
  });

  it("converts raw auth failures to stable account errors", async () => {
    const updateUser = jest.fn<any>().mockResolvedValue({
      data: { user: null },
      error: new Error("auth provider internals"),
    });
    const account = createProfileAccountClient({
      resend: jest.fn<any>(),
      updateUser,
    } as any);

    await expect(
      account.updatePassword("strong-password"),
    ).rejects.toMatchObject({
      name: "ProfileAccountError",
      operation: "password_update",
    });
    await expect(account.updatePassword("strong-password")).rejects.not.toThrow(
      "auth provider internals",
    );
  });
});
