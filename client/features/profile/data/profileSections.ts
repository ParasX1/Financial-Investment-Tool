export type ProfileSettingsGroup = {
  id: "profile" | "contact" | "sign-in";
  label: string;
  description: string;
};

export const PROFILE_SETTINGS_GROUPS: readonly ProfileSettingsGroup[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Name and photo",
  },
  {
    id: "contact",
    label: "Contact",
    description: "Email and phone",
  },
  {
    id: "sign-in",
    label: "Security & sign-in",
    description: "Password and login",
  },
] as const;
