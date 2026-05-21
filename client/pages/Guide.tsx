import * as React from "react";
import FunctionsRoundedIcon from "@mui/icons-material/FunctionsRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PsychologyAltRoundedIcon from "@mui/icons-material/PsychologyAltRounded";
import {
  FormulaBlock,
  LearningCard,
  LearningPageLayout,
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
        <section className="rounded-xl border border-[rgba(132,146,176,0.12)] bg-[#09090b] p-[18px] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#687184]">
            Current Topic
          </p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight text-white">
            {active.label}
          </h2>
          <p className="mt-3 max-w-[56rem] text-pretty text-[15px] leading-7 text-[#b9c1d0]">
            {active.description}
          </p>
        </section>

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
