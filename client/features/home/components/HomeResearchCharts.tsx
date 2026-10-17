import { useEffect, useRef, useState } from "react";
import LineGraph from "@/components/charts/LineGraph";
import BarGraph from "@/components/charts/BarGraph";
import {
  formatResearchValue,
  researchLineData,
  researchCompanyContext,
  researchMetricDefinitions,
  researchPeriod,
  researchSeriesColors,
  researchVolatilityData,
  type ResearchMetric,
} from "../data/researchDesk";
import styles from "../styles/ResearchDesk.module.css";

const formatters = {
  return: (value: number) => formatResearchValue("return", value),
  volatility: (value: number) => formatResearchValue("volatility", value),
  drawdown: (value: number) => formatResearchValue("drawdown", value),
};

export default function HomeResearchCharts({ kind }: { kind: ResearchMetric }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () =>
      setWidth(
        Math.max(240, Math.floor(element.getBoundingClientRect().width)),
      );
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const label = researchMetricDefinitions[kind].metric.label;
  return (
    <div className={styles.chartCanvas} ref={container}>
      {kind === "volatility" ? (
        <BarGraph
          data={researchVolatilityData}
          width={width}
          height={210}
          compact
          lineColors={researchSeriesColors}
          valueFormat={formatters[kind]}
          ariaLabel={`${label} for ${researchCompanyContext}, ${researchPeriod}`}
        />
      ) : (
        <LineGraph
          data={researchLineData[kind]}
          width={width}
          height={210}
          compact
          lineColors={researchSeriesColors}
          valueFormat={formatters[kind]}
          ariaLabel={`${label} for ${researchCompanyContext}, ${researchPeriod}`}
        />
      )}
    </div>
  );
}
