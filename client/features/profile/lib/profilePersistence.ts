import type { ProfileIdentityValues, ProfilePhoneValues } from "../types";

export function buildProfileIdentityPayload(values: ProfileIdentityValues) {
  return {
    first_name: values.firstName,
    handle: values.handle,
    last_name: values.lastName,
  };
}

export function buildProfilePhonePayload(values: ProfilePhoneValues) {
  return { phone: values.phone };
}

export function buildProfileAvatarPayload({
  avatarPath,
  avatarUrl,
}: {
  avatarPath: string;
  avatarUrl: string | null;
}) {
  return { avatar_path: avatarPath, avatar_url: avatarUrl };
}
