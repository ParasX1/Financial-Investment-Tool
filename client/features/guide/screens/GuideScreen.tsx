// File purpose: Composes the route-ready Guide screen from shared learning primitives and Guide content.
import FunctionsRoundedIcon from "@mui/icons-material/FunctionsRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PsychologyAltRoundedIcon from "@mui/icons-material/PsychologyAltRounded";
import {
  FormulaBlock,
  LearningCard,
  LearningPageLayout,
  LearningTopicCard,
} from "@/components/learning/LearningPageLayout";
import { useLearningSection } from "@/components/learning/useLearningSection";
import {
  defaultGuideSectionId,
  getGuideNavItems,
  guideSectionIds,
  resolveGuideSection,
} from "../lib/guideNavigation";

const guideNavItems = getGuideNavItems();

export function GuideScreen() {
  const { activeId, selectSection } = useLearningSection(
    guideSectionIds,
    defaultGuideSectionId,
  );
  const active = resolveGuideSection(activeId);

  return (
    <LearningPageLayout
      activeId={active.id}
      navIcon={MenuBookRoundedIcon}
      navItems={guideNavItems}
      navTitle="Guide Topics"
      onNavChange={selectSection}
      skipLabel="Skip to guide content"
      subtitle="Understand the risk, return, and portfolio metrics used across FIT without leaving the app workflow."
      title="Guide"
    >
      <div className="space-y-4">
        <LearningTopicCard eyebrow="Current Topic" title={active.label}>
          {active.description}
        </LearningTopicCard>

        <LearningCard icon={FunctionsRoundedIcon} title="Formula">
          <FormulaBlock>{active.formula}</FormulaBlock>
        </LearningCard>

        <LearningCard icon={PsychologyAltRoundedIcon} title="Interpretation">
          {active.interpretation}
        </LearningCard>

        <LearningCard
          icon={LightbulbOutlinedIcon}
          title="Key Takeaway"
          tone="accent"
        >
          {active.takeaway}
        </LearningCard>
      </div>
    </LearningPageLayout>
  );
}
