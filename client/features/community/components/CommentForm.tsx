// File purpose: Renders the comment composer, image attachment controls, validation feedback, and submit action.
import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import communityStyles from "../styles/community.module.css";
import {
  COMMENT_IMAGE_TYPES,
  MAX_COMMUNITY_COMMENT_BODY_CHARS,
} from "../constants";
import { FOCUS_VISIBLE, cn, communityUi, fitType } from "../design";
import type { NewComment } from "../types";
import { getErrorMessage } from "../lib/communityErrors";
import {
  countCommunityCommentCharacters,
  validateCommentImage,
  validateCommunityCommentContent,
} from "../lib/communityValidation";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

export function CommentForm({
  onSubmit,
  canAttachImage,
  busy = false,
}: {
  onSubmit: (data: NewComment) => Promise<void> | void;
  canAttachImage: boolean;
  busy?: boolean;
}) {
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const commentInput = useAutoResizeTextarea(text);
  const commentInputId = React.useId();
  const commentLimitId = `${commentInputId}-limit`;
  const commentErrorId = `${commentInputId}-error`;
  const contentError = validateCommunityCommentContent(text);
  const displayedError = contentError ?? errorMessage;
  const attachImageLabel = canAttachImage
    ? "Attach image"
    : "Sign in to attach images";

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handleFile(nextFile?: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!nextFile) {
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    if (!canAttachImage) {
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      setErrorMessage("Sign in before attaching an image.");
      return;
    }

    const validationError = validateCommentImage(nextFile);
    if (validationError) {
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !text.trim()) return;

    if (contentError) {
      setErrorMessage(contentError);
      return;
    }

    setErrorMessage(null);

    try {
      await onSubmit({ text: text.trim(), file, previewUrl });
      setText("");
      handleFile(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not post reply."));
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        communityUi.softPanel,
        "p-[12px]",
        communityStyles.softBorder,
      )}
    >
      <label htmlFor={commentInputId} className="sr-only">
        Add a comment
      </label>
      <textarea
        ref={commentInput}
        id={commentInputId}
        name="community-comment"
        autoComplete="off"
        disabled={busy}
        value={text}
        // Native maxlength counts UTF-16 units: allow two per code point so a
        // valid 2,000-emoji comment fits. Code-point validation owns the limit.
        maxLength={MAX_COMMUNITY_COMMENT_BODY_CHARS * 2}
        aria-invalid={Boolean(contentError)}
        aria-describedby={`${commentLimitId}${displayedError ? ` ${commentErrorId}` : ""}`}
        onChange={(event) => {
          setText(event.target.value);
          setErrorMessage(null);
        }}
        placeholder="Add to the discussion…"
        rows={3}
        className={cn(
          "w-full resize-none overflow-hidden rounded-md bg-[var(--fit-color-field)] px-[12px] py-[10px] text-[var(--fit-color-text-strong)]",
          fitType.bodySm,
          communityStyles.softBorder,
          "placeholder:text-[var(--fit-color-text-muted)] focus:border-[var(--fit-color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--fit-color-accent)]",
        )}
      />

      <p
        id={commentLimitId}
        className={cn(
          "mt-2 text-[var(--fit-color-text-muted)]",
          fitType.caption,
        )}
      >
        {countCommunityCommentCharacters(text).toLocaleString("en-US")} /{" "}
        {MAX_COMMUNITY_COMMENT_BODY_CHARS.toLocaleString("en-US")} characters
      </p>

      {previewUrl ? (
        <div
          className={cn(
            "mt-[12px] overflow-hidden rounded-md bg-[var(--fit-color-inner-surface)]",
            communityStyles.softBorder,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected comment attachment"
            width={640}
            height={360}
            className="max-h-60 w-full object-contain"
          />
        </div>
      ) : null}

      <div className="mt-[10px] flex items-center justify-between gap-[12px]">
        <input
          ref={fileInput}
          type="file"
          accept={COMMENT_IMAGE_TYPES.join(",")}
          className="hidden"
          disabled={busy || !canAttachImage}
          onChange={(event) =>
            handleFile(event.currentTarget.files?.[0] ?? null)
          }
        />
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || !canAttachImage}
            className={cn(
              communityUi.iconButton,
              "h-9 w-9 text-[var(--fit-color-text-muted)] hover:bg-[var(--fit-color-surface-soft)] hover:text-[var(--fit-color-text-strong)]",
              communityUi.disabled,
              FOCUS_VISIBLE,
            )}
            title={attachImageLabel}
            aria-label={attachImageLabel}
          >
            <ImageOutlinedIcon fontSize="small" aria-hidden="true" />
          </button>

          {file ? (
            <button
              type="button"
              onClick={() => handleFile(null)}
              disabled={busy}
              className={cn(
                "inline-flex min-w-0 touch-manipulation items-center gap-1 rounded-md px-2 py-1 text-[var(--fit-color-text-body)] transition-colors hover:border-[var(--fit-color-danger)] hover:text-[var(--fit-color-danger)]",
                fitType.caption,
                communityUi.disabled,
                communityStyles.softBorder,
                FOCUS_VISIBLE,
              )}
              title="Remove attachment"
              aria-label={`Remove attachment ${file.name}`}
            >
              <span className="truncate">{file.name}</span>
              <CloseRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy || !text.trim() || Boolean(contentError)}
          className={cn(
            "inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-[var(--fit-color-accent)] px-[14px] py-[8px] text-[var(--fit-color-action-ink)] transition-colors",
            fitType.control,
            "hover:bg-[var(--fit-color-action-hover)]",
            communityUi.disabled,
            FOCUS_VISIBLE,
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {busy ? "Posting…" : "Reply"}
        </button>
      </div>

      {displayedError ? (
        <p
          id={commentErrorId}
          className={cn(
            "mt-[12px] rounded-md border border-[var(--fit-color-danger)] bg-[var(--fit-color-danger-soft)] px-[12px] py-[8px] text-[var(--fit-color-danger)]",
            fitType.bodySm,
            communityStyles.wrapAnywhere,
          )}
          role="alert"
        >
          {displayedError}
        </p>
      ) : null}
    </form>
  );
}
