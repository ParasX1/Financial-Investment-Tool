// File purpose: Declares Help feature data contracts shared by Help content, helpers, and components.
import type { LearningIcon } from "@/components/learning/types";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HelpSection {
  id: string;
  label: string;
  subtitle: string;
  icon: LearningIcon;
  faqs: FAQItem[];
}
