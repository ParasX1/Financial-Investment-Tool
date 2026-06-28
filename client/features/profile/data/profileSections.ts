import type { ProfileSectionId } from "../types";

export type ProfileSectionNavItem = {
  id: ProfileSectionId;
  label: string;
  description: string;
};

export type ProfileSupportCard = {
  id: "privacy" | "security";
  title: string;
  body: string;
};

export const PROFILE_SECTION_NAV_ITEMS: readonly ProfileSectionNavItem[] = [
  {
    id: "profile-card",
    label: "Profile",
    description: "Avatar and display name",
  },
  {
    id: "personal-details",
    label: "Personal details",
    description: "Name, email, and phone",
  },
  {
    id: "security",
    label: "Sign-in security",
    description: "Email and password",
  },
] as const;

export const PROFILE_SUPPORT_CARDS: readonly ProfileSupportCard[] = [
  {
    id: "privacy",
    title: "Profile vs account details",
    body: "Avatar and display name identify this account. Email and phone stay with account details.",
  },
  {
    id: "security",
    title: "Sign-in security",
    body: "Email verification and password updates use their own actions.",
  },
] as const;
