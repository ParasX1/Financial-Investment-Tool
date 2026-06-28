import type { ProfileFormValues } from "../types";

export function buildProfileDetailsPayload({
  avatarUrl,
  userId,
  values,
}: {
  avatarUrl: string | null;
  userId: string;
  values: ProfileFormValues;
}) {
  return {
    avatar_url: avatarUrl,
    first_name: values.firstName,
    handle: values.handle,
    id: userId,
    last_name: values.lastName,
    phone: values.phone,
  };
}
