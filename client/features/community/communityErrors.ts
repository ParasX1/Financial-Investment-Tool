export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(
      (error as { message?: unknown }).message ?? "",
    ).trim();
    if (message) return message;
  }

  if (typeof error === "string" && error.trim()) return error.trim();

  return fallback;
}

export function getUploadErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Could not upload image.");

  if (message.toLowerCase().includes("row-level security")) {
    return "Image upload is blocked by the Supabase Storage policy for this bucket.";
  }

  return message;
}
