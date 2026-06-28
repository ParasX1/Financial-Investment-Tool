export type ProfileFieldKey = "firstName" | "lastName" | "email" | "phone";

export type ProfileErrors = Partial<Record<ProfileFieldKey, string>>;

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type ProfileSnapshot = ProfileFormValues & {
  avatarUrl: string | null;
};

export type ProfileMessageTone = "info" | "success" | "error";

export type ProfileMessage = {
  tone: ProfileMessageTone;
  text: string;
};

export type ProfileSectionId = "profile-card" | "personal-details" | "security";

export type ProfilePrimaryTabId = "personal-settings" | "security";
