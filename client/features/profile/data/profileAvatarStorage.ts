import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_AVATAR_SIZE } from "../lib/profileValidation";

type ProfileStorageClient = Pick<SupabaseClient["storage"], "from">;

const ALLOWED_FILE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const AVATAR_OBJECT_NAME = "avatar";
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export type UploadedProfileAvatar = {
  path: string;
  publicUrl: string;
};

export interface ProfileAvatarStorage {
  remove(input: { path: string; userId: string }): Promise<void>;
  upload(input: { file: File; userId: string }): Promise<UploadedProfileAvatar>;
}

export type ProfileAvatarStorageErrorCode =
  | "bucket_missing"
  | "invalid_file"
  | "invalid_path"
  | "public_url_missing"
  | "remove_failed"
  | "upload_failed";

export class ProfileAvatarStorageError extends Error {
  readonly cause?: unknown;
  readonly code: ProfileAvatarStorageErrorCode;

  constructor(code: ProfileAvatarStorageErrorCode, cause?: unknown) {
    super("Profile avatar storage request failed");
    this.name = "ProfileAvatarStorageError";
    this.code = code;
    this.cause = cause;
  }
}

function requireUserId(userId: string) {
  const normalized = userId.trim();
  if (!USER_ID_PATTERN.test(normalized)) {
    throw new ProfileAvatarStorageError("invalid_path");
  }
  return normalized;
}

function avatarPath(userId: string) {
  return `${requireUserId(userId)}/${AVATAR_OBJECT_NAME}`;
}

function isMissingBucket(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("bucket not found")
  );
}

export function createProfileAvatarStorage(
  storage: ProfileStorageClient,
  { bucket }: { bucket: string },
): ProfileAvatarStorage {
  const bucketName = bucket.trim();

  return {
    async remove({ path, userId }) {
      const canonicalPath = avatarPath(userId);
      if (path !== canonicalPath) {
        throw new ProfileAvatarStorageError("invalid_path");
      }
      if (!bucketName) throw new ProfileAvatarStorageError("bucket_missing");

      try {
        const { error } = await storage.from(bucketName).remove([path]);
        if (error) throw error;
      } catch (error) {
        if (error instanceof ProfileAvatarStorageError) throw error;
        throw new ProfileAvatarStorageError("remove_failed", error);
      }
    },

    async upload({ file, userId }) {
      const path = avatarPath(userId);
      if (!ALLOWED_FILE_TYPES.has(file.type) || file.size > MAX_AVATAR_SIZE) {
        throw new ProfileAvatarStorageError("invalid_file");
      }
      if (!bucketName) throw new ProfileAvatarStorageError("bucket_missing");

      const bucketClient = storage.from(bucketName);

      try {
        const { data } = bucketClient.getPublicUrl(path);
        if (!data?.publicUrl) {
          throw new ProfileAvatarStorageError("public_url_missing");
        }

        const { error } = await bucketClient.upload(path, file, {
          contentType: file.type,
          upsert: true,
        });
        if (error) {
          throw new ProfileAvatarStorageError(
            isMissingBucket(error) ? "bucket_missing" : "upload_failed",
            error,
          );
        }

        return { path, publicUrl: data.publicUrl };
      } catch (error) {
        if (error instanceof ProfileAvatarStorageError) throw error;
        throw new ProfileAvatarStorageError("upload_failed", error);
      }
    },
  };
}
