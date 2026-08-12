import analysisRecordsStyles from "./analysisRecords.module.css";
import foundationStyles from "./quantAnalysis.module.css";
import stageWorkspaceStyles from "./stageWorkspace.module.css";

const quantAnalysisStyles = {
  ...foundationStyles,
  ...stageWorkspaceStyles,
  ...analysisRecordsStyles,
} as const;

export default quantAnalysisStyles;
