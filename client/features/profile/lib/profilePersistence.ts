import type { ProfileFormValues } from "../types";

export function buildProfileDetailsPayload({
  avatarUrl,
  includeHandle = true,
  userId,
  values,
}: {
  avatarUrl: string | null;
  includeHandle?: boolean;
  userId: string;
  values: ProfileFormValues;
}) {
  const payload = {
    avatar_url: avatarUrl,
    first_name: values.firstName,
    id: userId,
    last_name: values.lastName,
    phone: values.phone,
  };

  return includeHandle ? { ...payload, handle: values.handle } : payload;
}
