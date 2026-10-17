// File purpose: Declares Help feature data contracts shared by Help content, helpers, and components.
import type { LearningIcon } from "@/components/learning/types";

export interface FAQItem {
  readonly question: string;
  readonly answer: string;
}

export interface HelpSection {
  readonly id: string;
  readonly label: string;
  readonly subtitle: string;
  readonly icon: LearningIcon;
  readonly faqs: readonly FAQItem[];
}

export type HelpSectionCollection = readonly [
  HelpSection,
  ...HelpSection[],
];
