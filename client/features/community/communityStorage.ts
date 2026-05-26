import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMUNITY_IMAGE_BUCKET } from "./constants";
import { getUploadErrorMessage, validateCommunityImage } from "./utils";

export type UploadedCommunityImage = {
  path: string;
  publicUrl: string;
};

export function uniqueImagePaths(paths: Array<string | null | undefined>) {
  return Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
}

export async function uploadCommentImage(
  db: SupabaseClient,
  postId: string,
  file: File,
): Promise<UploadedCommunityImage> {
  return uploadCommunityImage(db, `comments/${postId}`, file);
}

export async function uploadPostImage(
  db: SupabaseClient,
  file: File,
): Promise<UploadedCommunityImage> {
  return uploadCommunityImage(db, "posts", file);
}

export async function removeCommunityImage(db: SupabaseClient, path: string) {
  await removeCommunityImages(db, [path]);
}

export async function removeCommunityImages(
  db: SupabaseClient,
  paths: Array<string | null | undefined>,
) {
  const uniquePaths = uniqueImagePaths(paths);
  if (!uniquePaths.length) return;

  const { error } = await db.storage
    .from(COMMUNITY_IMAGE_BUCKET)
    .remove(uniquePaths);

  if (error) {
    console.error("image cleanup failed:", error.message);
  }
}

async function uploadCommunityImage(
  db: SupabaseClient,
  folder: string,
  file: File,
): Promise<UploadedCommunityImage> {
  const validationError = validateCommunityImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "jpg";
  const path = `${folder}/${randomUUID()}.${extension}`;
  const { error } = await db.storage
    .from(COMMUNITY_IMAGE_BUCKET)
    .upload(path, file);

  if (error) {
    console.error("upload failed:", error.message);
    throw new Error(getUploadErrorMessage(error));
  }

  return {
    path,
    publicUrl: db.storage.from(COMMUNITY_IMAGE_BUCKET).getPublicUrl(path).data
      .publicUrl,
  };
}
