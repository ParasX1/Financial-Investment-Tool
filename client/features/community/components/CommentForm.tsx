import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import communityStyles from "../community.module.css";
import { COMMENT_IMAGE_TYPES } from "../constants";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";
import type { NewComment } from "../types";
import { getErrorMessage } from "../communityErrors";
import { validateCommentImage } from "../communityValidation";
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
  const attachImageLabel = canAttachImage
    ? "Attach image"
    : "Sign in to attach images";

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
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
      className={cn(communityUi.softPanel, "p-[12px]", communityStyles.softBorder)}
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
        onChange={(event) => setText(event.target.value)}
        placeholder="Add to the discussion…"
        rows={3}
        className={cn(
          "w-full resize-none overflow-hidden rounded-md bg-[#18181b] px-[12px] py-[10px] text-sm text-[#e2e7f2]",
          communityStyles.softBorder,
          "placeholder:text-[#7f8798] focus:border-[#6f7cff]/75 focus:outline-none focus:ring-2 focus:ring-[#6f7cff]/20"
        )}
      />

      {previewUrl ? (
        <div
          className={cn(
            "mt-[12px] overflow-hidden rounded-md bg-black/30",
            communityStyles.softBorder
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
          onChange={(event) => handleFile(event.currentTarget.files?.[0] ?? null)}
        />
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || !canAttachImage}
            className={cn(
              communityUi.iconButton,
              "h-9 w-9 text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#f3f6ff]",
              communityUi.disabled,
              FOCUS_VISIBLE
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
                "inline-flex min-w-0 touch-manipulation items-center gap-1 rounded-md px-2 py-1 text-xs text-[#c8d1e5] transition-colors hover:border-[#ff8aa3]/50 hover:text-[#ffc4d2]",
                communityUi.disabled,
                communityStyles.softBorder,
                FOCUS_VISIBLE
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
          disabled={busy || !text.trim()}
          className={cn(
            "inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-[#5d67ff] px-[14px] py-[8px] text-sm font-semibold text-white transition-colors",
            "hover:bg-[#7079ff]",
            communityUi.disabled,
            FOCUS_VISIBLE
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {busy ? "Posting…" : "Reply"}
        </button>
      </div>

      {errorMessage ? (
        <p
          className={cn(
            "mt-[12px] rounded-md border border-[#ff5b7c]/30 bg-[#ff3d68]/10 px-[12px] py-[8px] text-sm text-[#ffd9e2]",
            communityStyles.wrapAnywhere
          )}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
