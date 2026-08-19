import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileAuthClient = Pick<SupabaseClient["auth"], "resend" | "updateUser">;

export type ProfileVerificationKind = "email_change" | "signup";

export type EmailChangeResult = {
  pendingEmail: string | null;
  sentAt: string | null;
};

export interface ProfileAccountClient {
  requestEmailChange(input: {
    email: string;
    redirectTo: string;
  }): Promise<EmailChangeResult>;
  resendVerification(input: {
    email: string;
    kind: ProfileVerificationKind;
    redirectTo: string;
  }): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

export class ProfileAccountError extends Error {
  readonly cause?: unknown;
  readonly operation: "email_change" | "password_update" | "verification";

  constructor(
    operation: "email_change" | "password_update" | "verification",
    cause?: unknown,
  ) {
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
): ProfileAccountClient {
  return {
    async requestEmailChange({ email, redirectTo }) {
      const normalizedEmail = requireEmail(email, "email_change");
      const safeRedirect = requireRedirect(redirectTo, "email_change");

      try {
        const { data, error } = await auth.updateUser(
          { email: normalizedEmail },
          { emailRedirectTo: safeRedirect },
        );
        if (error) throw error;

        return {
          pendingEmail: data.user?.new_email ?? null,
          sentAt: data.user?.email_change_sent_at ?? null,
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

    async updatePassword(password) {
      if (!password) throw new ProfileAccountError("password_update");

      try {
        const { error } = await auth.updateUser({ password });
        if (error) throw error;
      } catch (error) {
        if (error instanceof ProfileAccountError) throw error;
        throw new ProfileAccountError("password_update", error);
      }
    },
  };
}
