import dynamic from "next/dynamic";
import type { ResearchMetric } from "../data/researchDesk";
import styles from "../styles/ResearchDesk.module.css";

export function ResearchChartFallback({
  failed = false,
}: {
  failed?: boolean;
}) {
  return (
    <p className={styles.chartFallback}>
      {failed ? "Chart unavailable." : "Chart available with JavaScript."}{" "}
      Figures and sample data remain available.
    </p>
  );
}

const Charts = dynamic(() => import("./HomeResearchCharts"), {
  ssr: false,
  loading: ({ error }) => <ResearchChartFallback failed={Boolean(error)} />,
});

export function ResearchDeskChart({ kind }: { kind: ResearchMetric }) {
  return (
    <div className={styles.chart} data-research-chart>
      <Charts kind={kind} />
    </div>
  );
}
