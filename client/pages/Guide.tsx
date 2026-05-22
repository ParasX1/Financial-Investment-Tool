import * as React from "react";
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
import type { LearningNavItem } from "@/components/learning/types";
import { useLearningSection } from "@/components/learning/useLearningSection";
import {
  guideSectionIds,
  guideSections,
} from "@/features/guide/guideContent";

const guideNavItems: LearningNavItem[] = guideSections.map((section) => ({
  id: section.id,
  label: section.label,
  description: section.description,
  icon: section.icon,
}));

export default function Guide() {
  const { activeId, selectSection } = useLearningSection(
    guideSectionIds,
    guideSections[0].id,
  );
  const active =
    guideSections.find((section) => section.id === activeId) ?? guideSections[0];

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
