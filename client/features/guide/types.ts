// File purpose: Declares Guide feature data contracts shared by Guide content, helpers, and components.
import type { LearningIcon } from "@/components/learning/types";

export interface GuideSection {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly formula: string;
  readonly interpretation: string;
  readonly takeaway: string;
  readonly icon: LearningIcon;
}

export type GuideSectionCollection = readonly [GuideSection, ...GuideSection[]];
