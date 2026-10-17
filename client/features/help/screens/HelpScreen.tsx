// File purpose: Composes the route-ready Help screen from shared learning primitives and Help content.
import ContactSupportRoundedIcon from "@mui/icons-material/ContactSupportRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import {
  LearningCard,
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

export function HelpScreen() {
  const { activeId, selectSection } = useLearningSection(
    helpSectionIds,
    defaultHelpSectionId,
  );
  const active = resolveHelpSection(activeId);

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

        <section
          className="space-y-3"
          aria-label={`${active.label} questions`}
        >
          {active.faqs.map((faq, index) => (
            <QuestionCard
              key={faq.question}
              answer={faq.answer}
              index={index}
              question={faq.question}
            />
          ))}
        </section>

        <LearningCard
          icon={ContactSupportRoundedIcon}
          title="Support availability"
          tone="support"
        >
          Direct support is not connected in this build. Use the relevant Help
          topic to troubleshoot a workflow, and do not post passwords, account
          details, or other sensitive information in Community.
        </LearningCard>
      </div>
    </LearningPageLayout>
  );
}
