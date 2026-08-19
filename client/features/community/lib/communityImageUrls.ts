// File purpose: Derives display URLs from trusted Community storage paths and validates upload references.
import { COMMUNITY_IMAGE_BUCKET } from "../constants";
import type { CommentUI, PostUI } from "../types";

const IMAGE_EXTENSION = String.raw`\.(?:jpe?g|png|webp|gif)`;
const POST_IMAGE_PATH = new RegExp(
  String.raw`^posts\/[A-Za-z0-9_-]+${IMAGE_EXTENSION}$`,
  "i",
);
const COMMENT_IMAGE_PATH = new RegExp(
  String.raw`^comments\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+${IMAGE_EXTENSION}$`,
  "i",
);

type CommunityImageReference = {
  fromDB?: boolean;
  imagePath?: string | null;
  imageUrl?: string | null;
};

function normalizeUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).toString();
  } catch {
    return null;
  }
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getCanonicalStorageUrl(
  imagePath: string | null | undefined,
  expectedPath: RegExp,
) {
  const supabaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const normalizedPath = imagePath?.trim();
  if (!supabaseUrl || !normalizedPath || !expectedPath.test(normalizedPath)) {
    return null;
  }

  return new URL(
    `/storage/v1/object/public/${encodeURIComponent(
      COMMUNITY_IMAGE_BUCKET,
    )}/${encodeStoragePath(normalizedPath)}`,
    supabaseUrl,
  ).toString();
}

function getDisplayableCommunityImageUrl(
  reference: CommunityImageReference,
  expectedPath: RegExp,
) {
  if (!reference.fromDB) {
    const imageUrl = normalizeUrl(reference.imageUrl);
    return imageUrl && new URL(imageUrl).protocol === "blob:" ? imageUrl : null;
  }

  return getCanonicalStorageUrl(reference.imagePath, expectedPath);
}

function validateCommunityImageReference(
  reference: Pick<CommunityImageReference, "imagePath" | "imageUrl">,
  expectedPath: RegExp,
  subject: "post" | "comment",
) {
  if (!reference.imagePath && !reference.imageUrl) return null;

  const canonicalUrl = getCanonicalStorageUrl(
    reference.imagePath,
    expectedPath,
  );
  const suppliedUrl = normalizeUrl(reference.imageUrl);
  return canonicalUrl && suppliedUrl === canonicalUrl
    ? null
    : `The ${subject} image reference is invalid. Reattach the image and try again.`;
}

export function getDisplayableCommunityPostImageUrl(
  post: Pick<PostUI, "fromDB" | "imagePath" | "imageUrl">,
) {
  return getDisplayableCommunityImageUrl(post, POST_IMAGE_PATH);
}

export function getDisplayableCommunityCommentImageUrl(
  comment: Pick<CommentUI, "fromDB" | "imagePath" | "imageUrl">,
) {
  return getDisplayableCommunityImageUrl(comment, COMMENT_IMAGE_PATH);
}

export function validateCommunityPostImageReference(input: {
  imagePath?: string | null;
  imageUrl?: string | null;
}) {
  return validateCommunityImageReference(input, POST_IMAGE_PATH, "post");
}

export function validateCommunityCommentImageReference(input: {
  imagePath?: string | null;
  imageUrl?: string | null;
}) {
  return validateCommunityImageReference(input, COMMENT_IMAGE_PATH, "comment");
}
