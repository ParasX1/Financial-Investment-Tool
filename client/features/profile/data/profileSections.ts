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
    id: "personal-settings",
    label: "Personal settings",
    targetSectionId: "profile-card",
  },
  {
    id: "security",
    label: "Security",
    targetSectionId: "security",
  },
] as const;

export const PROFILE_SECTION_NAV_ITEMS: readonly ProfileSectionNavItem[] = [
  {
    id: "profile-card",
    label: "What people see",
    description: "Avatar and display name",
  },
  {
    id: "personal-details",
    label: "Your personal details",
    description: "Name, email, and phone",
  },
  {
    id: "security",
    label: "Security",
    description: "Password settings",
  },
] as const;

export const PROFILE_SUPPORT_CARDS: readonly ProfileSupportCard[] = [
  {
    id: "privacy",
    title: "Public vs account details",
    body: "Your avatar and display name are the public identity fields shown on this page. Email and phone stay with account details.",
  },
  {
    id: "security",
    title: "Security changes",
    body: "Password updates are handled separately from profile saves so sensitive changes stay explicit.",
  },
] as const;
