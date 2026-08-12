export type ProfileFieldKey =
  | "email"
  | "firstName"
  | "handle"
  | "lastName"
  | "phone";

export type ProfileErrors = Partial<Record<ProfileFieldKey, string>>;

export type ProfileFormValues = {
  firstName: string;
  handle: string;
  lastName: string;
  email: string;
  phone: string;
};

export type ProfileSnapshot = ProfileFormValues & {
  avatarUrl: string | null;
};

export type ProfileDetailsValues = Pick<
  ProfileFormValues,
  "firstName" | "handle" | "lastName" | "phone"
>;

export type ProfileIdentityValues = Pick<
  ProfileFormValues,
  "firstName" | "handle" | "lastName"
>;

export type ProfileEmailValues = Pick<ProfileFormValues, "email">;

export type ProfilePhoneValues = Pick<ProfileFormValues, "phone">;

export type ProfileMessageTone = "info" | "success" | "error";

export type ProfileMessage = {
  tone: ProfileMessageTone;
  text: string;
};
