import type { ProfileFormValues, ProfileSnapshot } from "../types";

export function buildDisplayName({
  email,
  firstName,
  lastName,
}: Pick<ProfileFormValues, "email" | "firstName" | "lastName">) {
  const name = `${firstName} ${lastName}`.trim();
  return name || email.split("@")[0] || "Profile";
}

export function buildProfileHandle({
  email,
  handle,
}: Pick<ProfileFormValues, "email" | "handle">) {
  const normalized = handle.trim().replace(/^@+/, "").toLowerCase();
  const fallback = email
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);

  return `@${normalized || fallback || "profile"}`;
}

export function buildInitials({
  email,
  firstName,
  lastName,
}: Pick<ProfileFormValues, "email" | "firstName" | "lastName">) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const fromEmail = email.trim().charAt(0);

  return `${first || fromEmail || "F"}${last || ""}`.toUpperCase();
}

export function formatUserIdPreview(userId?: string) {
  if (!userId) return "Not signed in";
  if (userId.length < 18) return userId;

  return `${userId.slice(0, 8)}-${userId.slice(9, 13)}-${userId.slice(
    14,
    18,
  )}...`;
}

export function buildAvatarDisplayUrl(
  avatarUrl: string | null,
  avatarVersion: number,
) {
  if (!avatarUrl) return null;

  const separator = avatarUrl.includes("?") ? "&" : "?";
  return `${avatarUrl}${separator}v=${avatarVersion}`;
}

export function hasProfileChanges(
  current: ProfileSnapshot,
  snapshot: ProfileSnapshot | null,
) {
  if (!snapshot) return true;

  return (
    current.firstName !== snapshot.firstName ||
    current.handle !== snapshot.handle ||
    current.lastName !== snapshot.lastName ||
    current.email !== snapshot.email ||
    current.phone !== snapshot.phone ||
    current.avatarUrl !== snapshot.avatarUrl
  );
}
