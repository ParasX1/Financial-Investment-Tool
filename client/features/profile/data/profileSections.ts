import type { ProfilePrimaryTabId, ProfileSectionId } from "../types";

export type ProfilePrimaryTab = {
  id: ProfilePrimaryTabId;
  label: string;
  targetSectionId: ProfileSectionId;
};

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

export const PROFILE_PRIMARY_TABS: readonly ProfilePrimaryTab[] = [
  {
    id: "overview",
    label: "Overview",
    targetSectionId: "overview",
  },
  {
    id: "personal-settings",
    label: "Profile",
    targetSectionId: "profile-card",
  },
  {
    id: "security",
    label: "Sign-in security",
    targetSectionId: "security",
  },
] as const;

export const PROFILE_SECTION_NAV_ITEMS: readonly ProfileSectionNavItem[] = [
  {
    id: "profile-card",
    label: "Profile",
    description: "Avatar and display name",
  },
  {
    id: "personal-details",
    label: "Your personal details",
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
    body: "Your avatar and display name identify this FIT account. Email and phone stay with account details.",
  },
  {
    id: "security",
    title: "Sign-in security",
    body: "Email verification and password updates use their own actions so sensitive changes stay explicit.",
  },
] as const;
