import * as React from "react";
import ContactSupportRoundedIcon from "@mui/icons-material/ContactSupportRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import {
  LearningActionPanel,
  LearningCard,
  LearningPageLayout,
  QuestionCard,
} from "@/components/learning/LearningPageLayout";
import type { LearningNavItem } from "@/components/learning/types";
import { useLearningSection } from "@/components/learning/useLearningSection";
import { helpSectionIds, helpSections } from "@/features/help/helpContent";

const helpNavItems: LearningNavItem[] = helpSections.map((section) => ({
  id: section.id,
  label: section.label,
  description: section.subtitle,
  icon: section.icon,
}));

export default function Help() {
  const [supportStatus, setSupportStatus] = React.useState("");
  const { activeId, selectSection } = useLearningSection(
    helpSectionIds,
    helpSections[0].id,
  );
  const active =
    helpSections.find((section) => section.id === activeId) ?? helpSections[0];

  React.useEffect(() => {
    setSupportStatus("");
  }, [active.id]);

  return (
    <LearningPageLayout
      activeId={active.id}
      navIcon={HelpOutlineRoundedIcon}
      navItems={helpNavItems}
      navTitle="Help Topics"
      onNavChange={selectSection}
      skipLabel="Skip to help content"
      subtitle="Find practical answers for each FIT workflow, from account access to Community activity."
      title="Help Center"
    >
      <div className="space-y-4">
        <LearningCard icon={active.icon} title={active.label} tone="support">
          {active.subtitle}
        </LearningCard>

        <div className="space-y-3" aria-label={`${active.label} questions`}>
          {active.faqs.map((faq, index) => (
            <QuestionCard
              key={faq.question}
              answer={faq.answer}
              index={index}
              question={faq.question}
            />
          ))}
        </div>

        <LearningActionPanel
          actionLabel="Contact Support"
          icon={ContactSupportRoundedIcon}
          onAction={() =>
            setSupportStatus(
              "Support contact routing is not connected yet. Please raise this with the project team if you need help now.",
            )
          }
          status={supportStatus}
          title="Still Need Help?"
        >
          Can&apos;t find what you&apos;re looking for? Use this area for the
          future support workflow without interrupting the page with browser
          popups.
        </LearningActionPanel>
      </div>
    </LearningPageLayout>
  );
}
