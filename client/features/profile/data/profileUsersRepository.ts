import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildProfileAvatarPayload,
  buildProfileIdentityPayload,
  buildProfilePhonePayload,
} from "../lib/profilePersistence";
import type {
  ProfileDetailsValues,
  ProfileIdentityValues,
  ProfilePhoneValues,
} from "../types";

const PROFILE_TABLE = "Users";
const PROFILE_COLUMNS =
  "first_name,last_name,handle,phone,avatar_path,avatar_url";
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

type ProfileUsersClient = Pick<SupabaseClient, "from">;

type ProfileUsersRow = {
  avatar_path?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  handle?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

export type PersistedProfileDetails = ProfileDetailsValues & {
  avatarPath: string | null;
  avatarUrl: string | null;
};

export interface ProfileUsersRepository {
  findByUserId(userId: string): Promise<PersistedProfileDetails | null>;
  saveAvatar(input: {
    avatarPath: string;
    avatarUrl: string | null;
    userId: string;
  }): Promise<void>;
  saveIdentity(
    input: ProfileIdentityValues & { userId: string },
  ): Promise<void>;
  savePhone(input: ProfilePhoneValues & { userId: string }): Promise<void>;
}

export class ProfileUsersRepositoryError extends Error {
  readonly cause?: unknown;
  readonly operation: "load" | "save";

  constructor(operation: "load" | "save", cause?: unknown) {
    super(
      operation === "load"
        ? "Profile details could not be loaded"
        : "Profile details could not be saved",
    );
    this.name = "ProfileUsersRepositoryError";
    this.operation = operation;
    this.cause = cause;
  }
}

function requireUserId(userId: string, operation: "load" | "save") {
  const normalized = userId.trim();
  if (!USER_ID_PATTERN.test(normalized)) {
    throw new ProfileUsersRepositoryError(operation);
  }
  return normalized;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function createProfileUsersRepository(
  client: ProfileUsersClient,
): ProfileUsersRepository {
  const updatePatch = async (
    userId: string,
    payload: Record<string, unknown>,
  ) => {
    const id = requireUserId(userId, "save");

    try {
      const { data, error } = await client
        .from(PROFILE_TABLE)
        .update(payload)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!Array.isArray(data) || data.length !== 1) {
        throw new ProfileUsersRepositoryError("save");
      }
    } catch (error) {
      if (error instanceof ProfileUsersRepositoryError) throw error;
      throw new ProfileUsersRepositoryError("save", error);
    }
  };

  return {
    async findByUserId(userId) {
      const id = requireUserId(userId, "load");

      try {
        const { data, error } = await client
          .from(PROFILE_TABLE)
          .select(PROFILE_COLUMNS)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const row = data as ProfileUsersRow;
        return {
          avatarPath: optionalText(row.avatar_path),
          avatarUrl: optionalText(row.avatar_url),
          firstName: text(row.first_name),
          handle: optionalText(row.handle) ?? "",
          lastName: text(row.last_name),
          phone: text(row.phone),
        };
      } catch (error) {
        if (error instanceof ProfileUsersRepositoryError) throw error;
        throw new ProfileUsersRepositoryError("load", error);
      }
    },

    saveAvatar(input) {
      return updatePatch(input.userId, buildProfileAvatarPayload(input));
    },

    saveIdentity(input) {
      return updatePatch(input.userId, buildProfileIdentityPayload(input));
    },

    savePhone(input) {
      return updatePatch(input.userId, buildProfilePhonePayload(input));
    },
  };
}
