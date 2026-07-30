// File purpose: Renders a single discussion card with markdown content, tags, comments, likes, and delete actions.
import * as React from "react";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import Link from "next/link";
import { getMarketNewsRouteHref } from "@/features/market-news/lib/marketNewsRouting";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi, fitType } from "../design";
import { getCommunityPostSignals } from "../lib/communitySignals";
import {
  getCommunityTimeFrameLabel,
  normalizeCommunitySourceUrl,
} from "../lib/communityPostMetadata";
import { getDisplayableCommunityPostImageUrl } from "../lib/communityImageUrls";
import { bodyContainsImageUrl } from "../lib/markdownEditor";
import type { CommentUI, NewComment, PostUI } from "../types";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { ExpandableText } from "./ExpandableText";
import { PostEngagementBar } from "./PostEngagementBar";

export function PostCard({
  post,
  comments,
  count,
  liked,
  likeBusy,
  saved,
  saveBusy,
  onAddComment,
  canDeletePost,
  canDeleteComment,
  canAttachCommentImage,
  onDeleteComment,
  onDeletePost,
  onToggleLike,
  onToggleSave,
  onReport,
}: {
  post: PostUI;
  comments: CommentUI[];
  count: number;
  liked: boolean;
  likeBusy: boolean;
  saved: boolean;
  saveBusy: boolean;
  canDeletePost: boolean;
  canDeleteComment: (comment: CommentUI) => boolean;
  canAttachCommentImage: boolean;
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onToggleLike: (postId: string) => Promise<void> | void;
  onToggleSave: (postId: string) => Promise<void> | void;
  onReport: (postId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const commentsId = React.useId();
  const formattedVotes = post.votes.toLocaleString();
  const formattedCommentCount = count.toLocaleString();
  const voteLabel = `${formattedVotes} ${post.votes === 1 ? "vote" : "votes"}`;
  const displayImageUrl = getDisplayableCommunityPostImageUrl(post);
  const hasInlineImage = bodyContainsImageUrl(post.body, displayImageUrl);
  const signals = React.useMemo(() => getCommunityPostSignals(post), [post]);
  const commentLabel = `${formattedCommentCount} ${
    count === 1 ? "comment" : "comments"
  }`;
  const timeFrameLabel = getCommunityTimeFrameLabel(post.timeFrame ?? null);
  const sourceHref = normalizeCommunitySourceUrl(post.sourceUrl);
  const tickerBadges = signals.tickers.map((ticker) => (
    <Link
      key={ticker}
      href={getMarketNewsRouteHref({
        tickerSymbol: ticker.replace(/^\$/, ""),
      })}
      aria-label={`View market news for ${ticker.replace(/^\$/, "")}`}
      title={`View market news for ${ticker.replace(/^\$/, "")}`}
      className={cn(
        communityStyles.signalBadge,
        communityStyles.signalBadgeTicker,
        communityStyles.wrapAnywhere,
        FOCUS_VISIBLE,
      )}
    >
      {ticker}
    </Link>
  ));
  const topicBadges = signals.topicLabels
    .filter((topic) => topic !== signals.primaryLabel)
    .slice(0, 4)
    .map((topic) => (
      <span
        key={topic}
        className={cn(
          communityStyles.signalBadge,
          communityStyles.signalBadgeTopic,
          communityStyles.wrapAnywhere,
        )}
      >
        {topic}
      </span>
    ));
  const hasSignalBadges = tickerBadges.length || topicBadges.length;

  return (
    <article
      className={cn(
        communityUi.card,
        communityStyles.primaryPanelPadding,
        "overflow-hidden transition-colors duration-200 hover:border-[#303444]",
        communityStyles.panelBorder,
      )}
    >
      <div className={communityStyles.postCardGrid}>
        <div className={communityStyles.postIdentityColumn}>
          <div
            className={cn(
              communityUi.avatar,
              "h-10 w-10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
              fitType.avatarMd,
            )}
            style={{ background: post.avatarGradient }}
          >
            {post.initials}
          </div>
        </div>

        <div className="min-w-0">
          <div className="min-w-0">
            <div
              className={cn(
                "flex min-w-0 flex-wrap items-center gap-x-[7px] gap-y-1",
                fitType.bodySm,
              )}
            >
              <span className="min-w-0 truncate font-semibold text-[#f7f8ff]">
                {post.user}
              </span>
              <span
                aria-hidden
                className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#687184]"
              />
              <span
                className={cn(
                  "inline-flex items-center gap-[4px] text-[#8d95a6]",
                  fitType.caption,
                )}
              >
                <AccessTimeRoundedIcon
                  sx={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                {post.time}
              </span>
            </div>
          </div>

          <h2
            className={cn(
              "mt-[6px] text-[#fbfbff]",
              fitType.panelTitle,
              communityStyles.postCopyMeasure,
              communityStyles.wrapAnywhere,
            )}
          >
            {post.title}
          </h2>

          <ExpandableText text={post.body} allowedImageUrl={displayImageUrl} />

          {displayImageUrl && !hasInlineImage ? (
            <div
              className={cn(
                "mt-[12px] overflow-hidden rounded-lg bg-black/30",
                communityStyles.softBorder,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageUrl}
                alt="Discussion attachment"
                width={960}
                height={540}
                loading="lazy"
                className="max-h-[28rem] w-full object-contain"
              />
            </div>
          ) : null}
        </div>

        <aside
          className={communityStyles.postMetaRail}
          aria-label={`Actions and context for ${post.title}`}
        >
          <div className={communityStyles.postRailHeader}>
            <div>
              <p className={communityStyles.postRailLabel}>Post type</p>
              <p className={communityStyles.postRailTitle}>
                {signals.primaryLabel}
              </p>
            </div>

            <div className={communityStyles.postRailHeaderActions}>
              <button
                type="button"
                onClick={() => onReport(post.id)}
                className={cn(
                  "inline-flex min-h-8 touch-manipulation items-center gap-[6px] rounded-md px-[7px] py-[4px] text-[#7f8798] transition-[background-color,color,transform] duration-150 hover:bg-white/[0.04] hover:text-[#f3f6ff] active:translate-y-px",
                  fitType.control,
                  FOCUS_VISIBLE,
                )}
                aria-label="Report discussion"
              >
                <FlagOutlinedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
                <span>Report</span>
              </button>

              {canDeletePost && onDeletePost ? (
                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  className={cn(
                    communityUi.iconButton,
                    "h-8 w-8 shrink-0 text-[#7f8798] transition-transform duration-150 hover:bg-[#ff3d68]/10 hover:text-[#ffc4d2] active:translate-y-px",
                    FOCUS_VISIBLE,
                  )}
                  title="Delete post"
                  aria-label="Delete post"
                >
                  <DeleteOutlineRoundedIcon
                    sx={{ fontSize: 18 }}
                    aria-hidden="true"
                  />
                </button>
              ) : null}
            </div>
          </div>

          {hasSignalBadges ? (
            <div className={communityStyles.postTagCluster}>
              {tickerBadges}
              {topicBadges}
            </div>
          ) : (
            <p className={communityStyles.postRailHint}>
              {signals.emptySignalLabel}
            </p>
          )}

          {signals.sourceCount ? (
            <p className={communityStyles.postSourceLine}>
              {signals.sourceCount.toLocaleString()}{" "}
              {signals.sourceCount === 1 ? "source" : "sources"}
              {signals.sourceDomains.length
                ? ` · ${signals.sourceDomains.slice(0, 2).join(" · ")}`
                : ""}
            </p>
          ) : null}

          {timeFrameLabel ? (
            <p className={communityStyles.postSourceLine}>
              Time frame · {timeFrameLabel}
            </p>
          ) : null}

          {sourceHref ? (
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex min-h-8 touch-manipulation items-center gap-[8px] rounded-md px-[8px] py-[4px] text-[#8f98aa] transition-colors hover:bg-white/[0.04] hover:text-[#f3f6ff]",
                fitType.control,
                FOCUS_VISIBLE,
              )}
            >
              <OpenInNewRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              <span>Open source</span>
            </a>
          ) : null}

          <PostEngagementBar
            commentsId={commentsId}
            commentLabel={commentLabel}
            formattedCommentCount={formattedCommentCount}
            postId={post.id}
            postTitle={post.title}
            formattedVotes={formattedVotes}
            voteLabel={voteLabel}
            commentsOpen={open}
            liked={liked}
            likeBusy={likeBusy}
            saved={saved}
            saveBusy={saveBusy}
            onToggleComments={() => setOpen((value) => !value)}
            onToggleLike={onToggleLike}
            onToggleSave={onToggleSave}
          />
        </aside>
      </div>

      {open ? (
        <div
          id={commentsId}
          className={cn(
            "mt-[14px] space-y-3 pt-[14px]",
            communityStyles.dividerTop,
          )}
        >
          <CommentList
            items={comments}
            canDelete={canDeleteComment}
            onDelete={(commentId) => onDeleteComment(commentId, post.id)}
          />
          <CommentForm
            busy={busy}
            canAttachImage={canAttachCommentImage}
            onSubmit={async (data) => {
              try {
                setBusy(true);
                await onAddComment(post.id, data);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      ) : null}
    </article>
  );
}
