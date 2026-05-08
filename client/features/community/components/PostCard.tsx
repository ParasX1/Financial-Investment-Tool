import * as React from "react";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ThumbUpOffAltRoundedIcon from "@mui/icons-material/ThumbUpOffAltRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import communityStyles from "@/styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";
import type { CommentUI, NewComment, PostUI } from "../types";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { ExpandableText } from "./ExpandableText";

export function PostCard({
  post,
  comments,
  count,
  liked,
  likeBusy,
  onAddComment,
  canDeletePost,
  canDeleteComment,
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
  onAddComment: (postId: string, data: NewComment) => Promise<void> | void;
  onDeleteComment: (commentId: string, postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onToggleLike: (postId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const commentsId = React.useId();
  const formattedVotes = post.votes.toLocaleString();
  const commentLabel = `${count.toLocaleString()} ${
    count === 1 ? "comment" : "comments"
  }`;
  const tagBadges = post.tags.length
    ? post.tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded-md bg-[#101747] px-[10px] py-[4px] text-xs font-medium text-[#9eb2ff]",
            communityStyles.tagBorder,
            communityStyles.wrapAnywhere
          )}
        >
          {tag}
        </span>
      ))
    : null;

  return (
    <article
      className={cn(
        communityUi.card,
        "overflow-hidden px-[18px] py-[18px] transition-colors duration-200 hover:border-[#303444] sm:px-[24px] sm:py-[20px]",
        communityStyles.panelBorder
      )}
    >
      <div className="flex min-w-0 gap-[14px]">
        <div
          className="mt-[2px] grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          style={{ background: post.avatarGradient }}
        >
          {post.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-[12px]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-[7px] gap-y-1 text-sm">
              <span className="min-w-0 truncate font-bold text-[#f7f8ff]">
                {post.user}
              </span>
              <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#687184]" />
              <span className="inline-flex items-center gap-[4px] text-xs text-[#8d95a6]">
                <AccessTimeRoundedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
                {post.time}
              </span>
            </div>

            {canDeletePost && onDeletePost ? (
              <button
                type="button"
                onClick={() => onDeletePost(post.id)}
                className={cn(
                  communityUi.iconButton,
                  "h-8 w-8 shrink-0 text-[#7f8798] hover:bg-[#ff3d68]/10 hover:text-[#ffc4d2]",
                  FOCUS_VISIBLE
                )}
                title="Delete post"
                aria-label="Delete post"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <h2
            className={cn(
              "mt-[6px] text-[17px] font-semibold leading-[1.35] text-[#fbfbff] sm:text-[18px]",
              communityStyles.postCopyMeasure,
              communityStyles.wrapAnywhere
            )}
          >
            {post.title}
          </h2>

          <ExpandableText footer={tagBadges} text={post.body} />

          <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className={cn(
                "inline-flex min-h-8 touch-manipulation items-center gap-[8px] rounded-md px-[8px] py-[4px] text-sm font-semibold transition-colors",
                open
                  ? "bg-[#171b4a] text-[#cfd8ff]"
                  : "text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#f3f6ff]",
                FOCUS_VISIBLE
              )}
              aria-expanded={open}
              aria-controls={commentsId}
              aria-label={`Toggle ${commentLabel} for ${post.title}`}
            >
              <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
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
                FOCUS_VISIBLE
              )}
              aria-pressed={liked}
              aria-label={`${liked ? "Unlike" : "Like"} post. ${formattedVotes} votes`}
            >
              {liked ? (
                <ThumbUpRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              ) : (
                <ThumbUpOffAltRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              )}
              <span className="tabular-nums" aria-live="polite">
                {formattedVotes}
              </span>
            </button>
          </div>

          {open ? (
            <div
              id={commentsId}
              className={cn("mt-[14px] space-y-3 pt-[14px]", communityStyles.dividerTop)}
            >
              <CommentList
                items={comments}
                canDelete={canDeleteComment}
                onDelete={(commentId) => onDeleteComment(commentId, post.id)}
              />
              <CommentForm
                busy={busy}
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
        </div>
      </div>
    </article>
  );
}
