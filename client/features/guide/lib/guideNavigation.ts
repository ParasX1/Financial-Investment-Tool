// File purpose: Maps Guide topic data into navigation models and resolves the active Guide topic.
import {
  getLearningNavItems,
  getLearningSectionIds,
  resolveLearningItem,
} from "@/components/learning/learningNavigation";
import type { LearningNavItem } from "@/components/learning/types";
import { guideSections } from "../data/guideContent";
import type { GuideSection } from "../types";

export const guideSectionIds = getLearningSectionIds(guideSections);

export const defaultGuideSectionId = guideSections[0]!.id;

export function getGuideNavItems(
  sections: readonly GuideSection[] = guideSections,
): LearningNavItem[] {
  return getLearningNavItems(sections, (section) => section.description);
}

export function resolveGuideSection(activeId: string): GuideSection {
  return resolveLearningItem(guideSections, activeId) ?? guideSections[0]!;
}
