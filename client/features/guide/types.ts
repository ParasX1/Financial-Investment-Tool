// File purpose: Declares Guide feature data contracts shared by Guide content, helpers, and components.
import type { LearningIcon } from "@/components/learning/types";

export interface GuideSection {
  id: string;
  label: string;
  description: string;
  formula: string;
  interpretation: string;
  takeaway: string;
  icon: LearningIcon;
}
