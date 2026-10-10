// File purpose: Maps Help topic data into navigation models and resolves the active Help topic.
import type { LearningNavItem } from "@/components/learning/types";
import { helpSections } from "../data/helpContent";
import type { HelpSection, HelpSectionCollection } from "../types";

export const helpSectionIds = Object.freeze(
  helpSections.map((section) => section.id),
);

export const defaultHelpSectionId = helpSections[0].id;

export function getHelpNavItems(
  sections: readonly HelpSection[] = helpSections,
): LearningNavItem[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.subtitle,
    icon: section.icon,
  }));
}

export function resolveHelpSection(
  activeId: string,
  sections: HelpSectionCollection = helpSections,
): HelpSection {
  return sections.find((section) => section.id === activeId) ?? sections[0];
}
