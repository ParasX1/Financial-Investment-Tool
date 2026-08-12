// File purpose: Validates Community image attachments for file type and size limits.
import {
  COMMUNITY_IMAGE_EXTENSIONS,
  COMMUNITY_IMAGE_TYPES,
  MAX_COMMUNITY_POST_BODY_CHARS,
  MAX_COMMUNITY_POST_TITLE_CHARS,
  MAX_COMMUNITY_IMAGE_BYTES,
} from "../constants";

export function validateCommunityPostContent(input: {
  title: string;
  body: string;
}) {
  const title = input.title.trim();

  if (!title) return "Add a title.";
  if (title.length > MAX_COMMUNITY_POST_TITLE_CHARS) {
    return `Keep the title to ${MAX_COMMUNITY_POST_TITLE_CHARS} characters or fewer.`;
  }
  if (input.body.length > MAX_COMMUNITY_POST_BODY_CHARS) {
    return `Keep the post body to ${MAX_COMMUNITY_POST_BODY_CHARS.toLocaleString(
      "en-US",
    )} characters or fewer.`;
  }

  return null;
}

export function validateCommunityImage(file: File) {
  if (!COMMUNITY_IMAGE_TYPES.includes(file.type)) {
    return "Attach a JPG, PNG, WebP, or GIF image.";
  }

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !COMMUNITY_IMAGE_EXTENSIONS.includes(extension)) {
    return "Attach a JPG, PNG, WebP, or GIF image.";
  }

  if (file.size > MAX_COMMUNITY_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }

  return null;
}

export function validateCommentImage(file: File) {
  return validateCommunityImage(file);
}
