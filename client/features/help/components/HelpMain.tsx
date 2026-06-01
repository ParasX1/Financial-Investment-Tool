// File purpose: Composes the Help Center page from shared learning layout primitives and Help feature data.
import * as React from "react";
import ContactSupportRoundedIcon from "@mui/icons-material/ContactSupportRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import {
  LearningActionPanel,
  LearningPageLayout,
  LearningTopicCard,
  QuestionCard,
} from "@/components/learning/LearningPageLayout";
import { useLearningSection } from "@/components/learning/useLearningSection";
import {
  defaultHelpSectionId,
  getHelpNavItems,
  helpSectionIds,
  resolveHelpSection,
} from "../lib/helpNavigation";

const helpNavItems = getHelpNavItems();

export function HelpMain() {
  const [supportStatus, setSupportStatus] = React.useState("");
  const { activeId, selectSection } = useLearningSection(
    helpSectionIds,
    defaultHelpSectionId,
  );
  const active = resolveHelpSection(activeId);

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
        <LearningTopicCard eyebrow="Current Topic" title={active.label}>
          {active.subtitle}
        </LearningTopicCard>

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
