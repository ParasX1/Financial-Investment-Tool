export type ProfileSettingsGroup = {
  id: "profile" | "contact" | "security";
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
    label: "Contact methods",
    description: "Email and phone managed separately",
  },
  {
    id: "security",
    label: "Security",
    description: "Password",
  },
] as const;
