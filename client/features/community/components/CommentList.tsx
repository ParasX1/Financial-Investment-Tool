// File purpose: Renders a discussion comment list with optional images and delete actions.
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi, fitType } from "../design";
import type { CommentUI } from "../types";
import { initials, toRelativeTime } from "../lib/communityFormat";

export function CommentList({
  items,
  canDelete,
  onDelete,
}: {
  items: CommentUI[];
  canDelete?: (comment: CommentUI) => boolean;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  if (!items.length) {
    return (
      <div
        className={cn(
          communityUi.softPanel,
          "px-[12px] py-[10px] text-[#8f98aa]",
          fitType.bodySm,
          communityStyles.softBorder,
        )}
      >
        No comments yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((comment) => (
        <li
          key={comment.id}
          className={cn(
            communityUi.softPanel,
            "p-[12px]",
            communityStyles.softBorder,
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-[12px]">
            <div
              className={cn(
                "flex min-w-0 items-center gap-2 text-[#8f98aa]",
                fitType.caption,
              )}
            >
              <div
                className={cn(
                  communityUi.avatar,
                  "h-7 w-7 bg-[#1d2030] text-[#e2e7f2]",
                  fitType.avatarSm,
                )}
              >
                {initials(comment.user)}
              </div>
              <span className="min-w-0 truncate font-semibold text-[#e2e7f2]">
                {comment.user}
              </span>
              <span
                aria-hidden
                className="h-1 w-1 shrink-0 rounded-full bg-[#687184]"
              />
              <time dateTime={comment.createdAt}>
                {toRelativeTime(comment.createdAt)}
              </time>
            </div>

            {onDelete && canDelete?.(comment) ? (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className={cn(
                  communityUi.iconButton,
                  "h-8 w-8 shrink-0 text-[#7f8798] hover:bg-[#ff3d68]/10 hover:text-[#ffc4d2]",
                  FOCUS_VISIBLE,
                )}
                title="Delete comment"
                aria-label="Delete comment"
              >
                <DeleteOutlineRoundedIcon
                  sx={{ fontSize: 18 }}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>

          <p
            className={cn(
              "whitespace-pre-wrap text-[#d8deea]",
              fitType.bodySm,
              communityStyles.wrapAnywhere,
            )}
          >
            {comment.text}
          </p>

          {comment.imageUrl ? (
            <div
              className={cn(
                "mt-[12px] overflow-hidden rounded-md bg-black/30",
                communityStyles.softBorder,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comment.imageUrl}
                alt="Comment attachment"
                width={720}
                height={420}
                loading="lazy"
                className="max-h-80 w-full object-contain"
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
