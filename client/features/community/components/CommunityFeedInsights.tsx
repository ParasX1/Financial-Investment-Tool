// File purpose: Displays a compact investor signal summary for the visible Community feed.
import * as React from "react";
import communityStyles from "../styles/community.module.css";
import { cn, communityUi } from "../design";
import type { CommunityFeedInsights as CommunityFeedInsightsModel } from "../lib/communityFeedInsights";

function formatCount(value: number) {
  return value.toLocaleString();
}

export function CommunityFeedInsights({
  insights,
}: {
  insights: CommunityFeedInsightsModel;
}) {
  if (!insights.postCount) return null;

  const metrics = [
    {
      label: "Posts",
      value: formatCount(insights.postCount),
    },
    {
      label: "Signal posts",
      value: `${formatCount(insights.signalPostCount)}/${formatCount(
        insights.postCount,
      )}`,
    },
    {
      label: "Source-backed",
      value: formatCount(insights.sourceBackedCount),
    },
    {
      label: "Replies",
      value: formatCount(insights.activeReplyCount),
    },
  ];

  return (
    <section
      className={cn(
        communityUi.card,
        communityStyles.feedInsights,
        communityStyles.panelBorder,
      )}
      aria-label="Community feed signal summary"
    >
      <div className={communityStyles.feedInsightsHeader}>
        <div>
          <p className={communityStyles.postRailLabel}>Investor radar</p>
          <h2 className={communityStyles.feedInsightsTitle}>
            Signals in this feed
          </h2>
        </div>
        <div className={communityStyles.feedInsightTickerStrip}>
          {insights.topTickers.length ? (
            insights.topTickers.map((item) => (
              <span
                key={item.label}
                className={cn(
                  communityStyles.signalBadge,
                  communityStyles.signalBadgeTicker,
                )}
              >
                {item.label}
              </span>
            ))
          ) : (
            <span className={communityStyles.feedInsightMuted}>No tickers</span>
          )}
        </div>
      </div>

      <dl className={communityStyles.feedInsightMetrics}>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>

      {insights.topSetups.length ? (
        <div className={communityStyles.feedInsightSetups}>
          {insights.topSetups.map((item) => (
            <span key={item.label}>
              {item.label}
              <strong>{item.count.toLocaleString()}</strong>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
