// File purpose: Renders a single discussion card with markdown content, tags, comments, likes, and delete actions.
import * as React from "react";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ThumbUpOffAltRoundedIcon from "@mui/icons-material/ThumbUpOffAltRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";
import {
  getCommunityPostSignals,
  type CommunitySignalTone,
} from "../lib/communitySignals";
import { bodyContainsImageUrl } from "../lib/markdownEditor";
import type { CommentUI, NewComment, PostUI } from "../types";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { ExpandableText } from "./ExpandableText";

function signalToneClass(tone: CommunitySignalTone) {
  if (tone === "positive") return communityStyles.signalTonePositive;
  if (tone === "warning") return communityStyles.signalToneWarning;
  if (tone === "info") return communityStyles.signalToneInfo;
  return communityStyles.signalToneNeutral;
}

export function PostCard({
  post,
  comments,
  count,
  liked,
  likeBusy,
  onAddComment,
  canDeletePost,
  canDeleteComment,
  canAttachCommentImage,
  onDeleteComment,
  onDeletePost,
  onToggleLike,
}: {
  post: PostUI;
  comments: CommentUI[];
  count: number;
  liked: boolean;
  likeBusy: boolean;
  canDeletePost: boolean;
  canDeleteComment: (comment: CommentUI) => boolean;
  canAttachCommentImage: boolean;
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onToggleLike: (postId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const commentsId = React.useId();
  const formattedVotes = post.votes.toLocaleString();
  const hasInlineImage = bodyContainsImageUrl(post.body, post.imageUrl);
  const signals = React.useMemo(() => getCommunityPostSignals(post), [post]);
  const commentLabel = `${count.toLocaleString()} ${
    count === 1 ? "comment" : "comments"
  }`;
  const tickerBadges = signals.tickers.map((ticker) => (
    <span
      key={ticker}
      className={cn(
        communityStyles.signalBadge,
        communityStyles.signalBadgeTicker,
        communityStyles.wrapAnywhere,
      )}
    >
      {ticker}
    </span>
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
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
            style={{ background: post.avatarGradient }}
          >
            {post.initials}
          </div>
        </div>

        <div className="min-w-0">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-[7px] gap-y-1 text-sm">
              <span className="min-w-0 truncate font-bold text-[#f7f8ff]">
                {post.user}
              </span>
              <span
                aria-hidden
                className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#687184]"
              />
              <span className="inline-flex items-center gap-[4px] text-xs text-[#8d95a6]">
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
              "mt-[6px] text-[17px] font-semibold leading-[1.35] text-[#fbfbff] sm:text-[18px]",
              communityStyles.postCopyMeasure,
              communityStyles.wrapAnywhere,
            )}
          >
            {post.title}
          </h2>

          <ExpandableText text={post.body} />

          {post.imageUrl && !hasInlineImage ? (
            <div
              className={cn(
                "mt-[12px] overflow-hidden rounded-lg bg-black/30",
                communityStyles.softBorder,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
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
          aria-label={`Actions and signals for ${post.title}`}
        >
          <div className={communityStyles.postRailHeader}>
            <div>
              <p className={communityStyles.postRailLabel}>Signals</p>
              <p className={communityStyles.postRailTitle}>
                {signals.primaryLabel}
              </p>
            </div>

            {canDeletePost && onDeletePost ? (
              <button
                type="button"
                onClick={() => onDeletePost(post.id)}
                className={cn(
                  communityUi.iconButton,
                  "h-8 w-8 shrink-0 text-[#7f8798] hover:bg-[#ff3d68]/10 hover:text-[#ffc4d2]",
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

          <dl className={communityStyles.postSignalGrid}>
            <div>
              <dt>Horizon</dt>
              <dd className={signalToneClass(signals.horizon.tone)}>
                {signals.horizon.label}
              </dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd className={signalToneClass(signals.evidence.tone)}>
                {signals.evidence.label}
              </dd>
            </div>
          </dl>

          {signals.sourceCount ? (
            <p className={communityStyles.postSourceLine}>
              {signals.sourceCount.toLocaleString()} linked{" "}
              {signals.sourceCount === 1 ? "source" : "sources"}
            </p>
          ) : null}

          <div className={communityStyles.postEngagementGrid}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className={cn(
                "inline-flex min-h-8 touch-manipulation items-center gap-[8px] rounded-md px-[8px] py-[4px] text-sm font-semibold transition-colors",
                open
                  ? "bg-[#171b4a] text-[#cfd8ff]"
                  : "text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#f3f6ff]",
                FOCUS_VISIBLE,
              )}
              aria-expanded={open}
              aria-controls={commentsId}
              aria-label={`Toggle ${commentLabel} for ${post.title}`}
            >
              <ChatBubbleOutlineRoundedIcon
                sx={{ fontSize: 18 }}
                aria-hidden="true"
              />
              <span aria-live="polite">{commentLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleLike(post.id)}
              disabled={likeBusy}
              className={cn(
                "inline-flex min-h-8 touch-manipulation items-center gap-[7px] rounded-md px-[8px] py-[4px] text-sm font-semibold transition-colors",
                liked
                  ? "bg-[#171b4a] text-[#cfd8ff]"
                  : "text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#f3f6ff]",
                likeBusy ? "cursor-wait opacity-70" : "",
                FOCUS_VISIBLE,
              )}
              aria-pressed={liked}
              aria-label={`${
                liked ? "Unlike" : "Like"
              } post. ${formattedVotes} votes`}
            >
              {liked ? (
                <ThumbUpRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              ) : (
                <ThumbUpOffAltRoundedIcon
                  sx={{ fontSize: 18 }}
                  aria-hidden="true"
                />
              )}
              <span className="tabular-nums" aria-live="polite">
                {formattedVotes}
              </span>
            </button>
          </div>
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
