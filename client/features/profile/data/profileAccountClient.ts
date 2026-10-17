import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileAuthClient = Pick<SupabaseClient["auth"], "getSession" | "resend">;

type ProfileAccountTransport = {
  url: string;
  publishableKey: string;
  fetch?: typeof fetch;
};

export type ProfileVerificationKind = "email_change" | "signup";

export type EmailChangeResult = {
  pendingEmail: string | null;
  sentAt: string | null;
};

export interface ProfileAccountClient {
  getEmailChangeStatus(input: { userId: string }): Promise<EmailChangeResult>;
  requestEmailChange(input: {
    userId: string;
    email: string;
    redirectTo: string;
  }): Promise<EmailChangeResult>;
  resendVerification(input: {
    email: string;
    kind: ProfileVerificationKind;
    redirectTo: string;
  }): Promise<void>;
  updatePassword(input: { userId: string; password: string }): Promise<void>;
}

export class ProfileAccountError extends Error {
  readonly cause?: unknown;
  readonly operation:
    | "account_load"
    | "email_change"
    | "password_update"
    | "verification";

  constructor(operation: ProfileAccountError["operation"], cause?: unknown) {
    super("Profile account request failed");
    this.name = "ProfileAccountError";
    this.operation = operation;
    this.cause = cause;
  }
}

function requireEmail(
  email: string,
  operation: ProfileAccountError["operation"],
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new ProfileAccountError(operation);
  }
  return normalized;
}

function requireRedirect(
  redirectTo: string,
  operation: ProfileAccountError["operation"],
) {
  try {
    const url = new URL(redirectTo);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error();
    return url.toString();
  } catch {
    throw new ProfileAccountError(operation);
  }
}

export function createProfileAccountClient(
  auth: ProfileAuthClient,
  transport: ProfileAccountTransport,
): ProfileAccountClient {
  async function requestOwnedUser(
    method: "GET" | "PUT",
    userId: string,
    operation: "account_load" | "email_change" | "password_update",
    attributes?: { email: string } | { password: string },
    redirectTo?: string,
  ) {
    // The shared SDK's updateUser selects its session after acquiring a lock.
    // Bind this request to the intended owner once, before network dispatch.
    const { data, error } = await auth.getSession();
    if (error) throw error;
    const session = data.session;
    if (!session?.access_token || session.user.id !== userId) {
      throw new ProfileAccountError(operation);
    }
    const endpoint = new URL(
      "auth/v1/user",
      `${transport.url.replace(/\/$/, "")}/`,
    );
    if (redirectTo) endpoint.searchParams.set("redirect_to", redirectTo);
    let response: Response;
    try {
      response = await (transport.fetch ?? fetch)(endpoint.toString(), {
        method,
        headers: {
          apikey: transport.publishableKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "X-Supabase-Api-Version": "2024-01-01",
        },
        body: JSON.stringify(attributes),
      });
    } catch {
      throw new ProfileAccountError(operation, {
        name: "AuthRetryableFetchError",
      });
    }
    if ([502, 503, 504].includes(response.status)) {
      throw new ProfileAccountError(operation, {
        name: "AuthRetryableFetchError",
        status: response.status,
      });
    }
    const result = await response.json();
    if (!response.ok) {
      throw new ProfileAccountError(operation, {
        status: response.status,
        code: result?.code ?? result?.error_code,
      });
    }
    if (result?.id !== userId) throw new ProfileAccountError(operation);
    // Never save this response into the shared SDK: a newer account may be active.
    return result as { new_email?: string; email_change_sent_at?: string };
  }

  return {
    async getEmailChangeStatus({ userId }) {
      try {
        const user = await requestOwnedUser("GET", userId, "account_load");
        return {
          pendingEmail: user.new_email ?? null,
          sentAt: user.email_change_sent_at ?? null,
        };
      } catch (error) {
        if (error instanceof ProfileAccountError) throw error;
        throw new ProfileAccountError("account_load", error);
      }
    },

    async requestEmailChange({ userId, email, redirectTo }) {
      const normalizedEmail = requireEmail(email, "email_change");
      const safeRedirect = requireRedirect(redirectTo, "email_change");

      try {
        const user = await requestOwnedUser(
          "PUT",
          userId,
          "email_change",
          { email: normalizedEmail },
          safeRedirect,
        );

        return {
          pendingEmail: user.new_email ?? null,
          sentAt: user.email_change_sent_at ?? null,
        };
      } catch (error) {
        if (error instanceof ProfileAccountError) throw error;
        throw new ProfileAccountError("email_change", error);
      }
    },

    async resendVerification({ email, kind, redirectTo }) {
      const normalizedEmail = requireEmail(email, "verification");
      const safeRedirect = requireRedirect(redirectTo, "verification");

      try {
        const { error } = await auth.resend({
          email: normalizedEmail,
          options: { emailRedirectTo: safeRedirect },
          type: kind,
        });
        if (error) throw error;
      } catch (error) {
        if (error instanceof ProfileAccountError) throw error;
        throw new ProfileAccountError("verification", error);
      }
    },

    async updatePassword({ userId, password }) {
      if (!password) throw new ProfileAccountError("password_update");

      try {
        await requestOwnedUser("PUT", userId, "password_update", { password });
      } catch (error) {
        if (error instanceof ProfileAccountError) throw error;
        throw new ProfileAccountError("password_update", error);
      }
    },
  };
}
