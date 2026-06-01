// File purpose: Maps Guide topic data into navigation models and resolves the active Guide topic.
import type { LearningNavItem } from "@/components/learning/types";
import { guideSections } from "../data/guideContent";
import type { GuideSection } from "../types";

export const guideSectionIds = guideSections.map((section) => section.id);

export const defaultGuideSectionId = guideSections[0]!.id;

export function getGuideNavItems(
  sections: readonly GuideSection[] = guideSections,
): LearningNavItem[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    icon: section.icon,
  }));
}

export function resolveGuideSection(activeId: string): GuideSection {
  return (
    guideSections.find((section) => section.id === activeId) ??
    guideSections[0]!
  );
}
