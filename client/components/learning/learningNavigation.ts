// File purpose: Provides generic navigation adapters for Guide and Help learning-style pages.
import type { LearningIcon, LearningNavItem } from "./types";

type LearningNavSource = {
  id: string;
  label: string;
  icon: LearningIcon;
};

export function getLearningSectionIds<TSection extends { id: string }>(
  sections: readonly TSection[],
) {
  return sections.map((section) => section.id);
}

export function getLearningNavItems<TSection extends LearningNavSource>(
  sections: readonly TSection[],
  getDescription: (section: TSection) => string,
): LearningNavItem[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    description: getDescription(section),
    icon: section.icon,
  }));
}

export function resolveLearningItem<TSection extends { id: string }>(
  sections: readonly TSection[],
  activeId: string,
): TSection | undefined {
  return sections.find((section) => section.id === activeId) ?? sections[0];
}
