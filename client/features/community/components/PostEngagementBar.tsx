// File purpose: Groups the frequent discussion actions into one compact, accessible control row.
import * as React from "react";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ThumbUpOffAltRoundedIcon from "@mui/icons-material/ThumbUpOffAltRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, fitType } from "../design";

interface PostEngagementBarProps {
  commentsId: string;
  commentLabel: string;
  formattedCommentCount: string;
  postId: string;
  postTitle: string;
  formattedVotes: string;
  voteLabel: string;
  commentsOpen: boolean;
  liked: boolean;
  likeBusy: boolean;
  saved: boolean;
  saveBusy: boolean;
  onToggleComments: () => void;
  onToggleLike: (postId: string) => Promise<void> | void;
  onToggleSave: (postId: string) => Promise<void> | void;
}

const actionBase =
  "inline-flex min-h-9 min-w-0 touch-manipulation items-center gap-[7px] rounded-md bg-white/[0.025] px-[9px] py-[5px] transition-[background-color,color,transform] duration-150 active:translate-y-px";

function actionState(active: boolean, busy = false) {
  return cn(
    active
      ? "bg-[#171b4a] text-[#cfd8ff]"
      : "text-[#8f98aa] hover:bg-white/[0.055] hover:text-[#f3f6ff]",
    busy ? "cursor-wait opacity-70" : "",
  );
}

export function PostEngagementBar({
  commentsId,
  commentLabel,
  formattedCommentCount,
  postId,
  postTitle,
  formattedVotes,
  voteLabel,
  commentsOpen,
  liked,
  likeBusy,
  saved,
  saveBusy,
  onToggleComments,
  onToggleLike,
  onToggleSave,
}: PostEngagementBarProps) {
  return (
    <div
      role="group"
      aria-label="Discussion engagement"
      className={communityStyles.postEngagementGrid}
    >
      <button
        type="button"
        onClick={onToggleComments}
        className={cn(
          actionBase,
          "justify-start",
          fitType.control,
          actionState(commentsOpen),
          FOCUS_VISIBLE,
        )}
        aria-expanded={commentsOpen}
        aria-controls={commentsId}
        aria-label={`Toggle ${commentLabel} for ${postTitle}`}
        title={commentLabel}
      >
        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        <span className="tabular-nums" aria-live="polite">
          {formattedCommentCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleLike(postId)}
        disabled={likeBusy}
        className={cn(
          actionBase,
          "justify-center",
          fitType.control,
          actionState(liked, likeBusy),
          FOCUS_VISIBLE,
        )}
        aria-pressed={liked}
        aria-label={`${liked ? "Unlike" : "Like"} post. ${voteLabel}`}
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

      <button
        type="button"
        onClick={() => onToggleSave(postId)}
        disabled={saveBusy}
        className={cn(
          actionBase,
          "justify-center",
          fitType.control,
          actionState(saved, saveBusy),
          FOCUS_VISIBLE,
        )}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove saved" : "Save"} discussion`}
      >
        {saved ? (
          <BookmarkRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        ) : (
          <BookmarkBorderRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        )}
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    </div>
  );
}
