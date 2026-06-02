// File purpose: Maps Help topic data into navigation models and resolves the active Help topic.
import {
  getLearningNavItems,
  getLearningSectionIds,
  resolveLearningItem,
} from "@/components/learning/learningNavigation";
import type { LearningNavItem } from "@/components/learning/types";
import { helpSections } from "../data/helpContent";
import type { HelpSection } from "../types";

export const helpSectionIds = getLearningSectionIds(helpSections);

export const defaultHelpSectionId = helpSections[0]!.id;

export function getHelpNavItems(
  sections: readonly HelpSection[] = helpSections,
): LearningNavItem[] {
  return getLearningNavItems(sections, (section) => section.subtitle);
}

export function resolveHelpSection(activeId: string): HelpSection {
  return resolveLearningItem(helpSections, activeId) ?? helpSections[0]!;
}
