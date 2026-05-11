import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import communityStyles from "@/styles/community.module.css";
import { COMMUNITY_IMAGE_TYPES } from "../constants";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";
import { getSmartTagSuggestions, mergeSelectedTagSuggestions } from "../smartTags";
import type { DiscussionDraft, DiscussionDraftField } from "../types";
import { validateCommunityImage } from "../utils";
import { SmartTagSuggestions } from "./SmartTagSuggestions";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

export function CommunityComposer({
  className,
  draft,
  creating,
  canAttachImage,
  onDraftChange,
  onClearTags,
  onDraftImageChange,
  onToggleTag,
  onSubmit,
}: {
  className?: string;
  draft: DiscussionDraft;
  creating: boolean;
  canAttachImage: boolean;
  onDraftChange: (field: DiscussionDraftField, value: string) => void;
  onClearTags: () => void;
  onDraftImageChange: (file: File | null) => void;
  onToggleTag: (tag: string) => void;
  onSubmit: () => void;
}) {
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const bodyInput = useAutoResizeTextarea(draft.body);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);
  const canSubmit = Boolean(draft.title.trim() && draft.body.trim());
  const attachImageLabel = canAttachImage
    ? "Attach image"
    : "Sign in to attach images";
  const smartTags = React.useMemo(
    () => getSmartTagSuggestions(draft),
    [draft]
  );
  const visibleTags = React.useMemo(
    () => mergeSelectedTagSuggestions(draft.tags, smartTags),
    [draft.tags, smartTags]
  );

  React.useEffect(() => {
    if (!draft.imageFile && fileInput.current) fileInput.current.value = "";
  }, [draft.imageFile]);

  function handleImageFile(nextFile?: File | null) {
    if (!nextFile) {
      setAttachmentError(null);
      onDraftImageChange(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    if (!canAttachImage) {
      setAttachmentError("Sign in before attaching an image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    const validationError = validateCommunityImage(nextFile);
    if (validationError) {
      setAttachmentError(validationError);
      onDraftImageChange(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    setAttachmentError(null);
    onDraftImageChange(nextFile);
  }

  return (
    <form
      className={cn(
        communityUi.panel,
        className,
        communityStyles.primaryPanelPadding,
        communityStyles.panelBorder,
      )}
      data-community-content-start
      aria-busy={creating}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !creating) onSubmit();
      }}
    >
      <div className="flex flex-col gap-[14px] sm:flex-row sm:items-start">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#4f63ff] to-[#7c3aed] text-sm font-extrabold text-white">
          YU
        </div>

        <div className="min-w-0 flex-1 space-y-[10px]">
          <label htmlFor="community-draft-title" className="sr-only">
            Discussion title
          </label>
          <input
            id="community-draft-title"
            name="community-draft-title"
            type="text"
            autoComplete="off"
            disabled={creating}
            value={draft.title}
            onChange={(event) => onDraftChange("title", event.target.value)}
            placeholder="Title"
            className={cn(
              "h-11 w-full px-[16px] text-[15px] font-semibold leading-6",
              communityUi.field,
              communityStyles.inputBorder,
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />

          <label htmlFor="community-draft-body" className="sr-only">
            Discussion body
          </label>
          <textarea
            ref={bodyInput}
            id="community-draft-body"
            name="community-draft-body"
            autoComplete="off"
            disabled={creating}
            value={draft.body}
            onChange={(event) => onDraftChange("body", event.target.value)}
            placeholder="Write the discussion…"
            rows={4}
            className={cn(
              "min-h-[112px] w-full resize-none overflow-hidden px-[16px] py-[14px] text-[15px] leading-6 sm:min-h-[98px]",
              communityUi.field,
              communityStyles.inputBorder,
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />

          {draft.imagePreviewUrl ? (
            <div
              className={cn(
                "overflow-hidden rounded-lg bg-black/30",
                communityStyles.softBorder
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.imagePreviewUrl}
                alt="Selected discussion attachment"
                width={960}
                height={540}
                className="max-h-72 w-full object-contain"
              />
            </div>
          ) : null}

          <SmartTagSuggestions
            items={visibleTags}
            selectedTags={draft.tags}
            onClear={onClearTags}
            onToggle={onToggleTag}
          />
        </div>
      </div>

      <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[12px] pl-0 sm:pl-14">
        <input
          ref={fileInput}
          type="file"
          accept={COMMUNITY_IMAGE_TYPES.join(",")}
          className="hidden"
          disabled={creating || !canAttachImage}
          onChange={(event) => handleImageFile(event.currentTarget.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={creating || !canAttachImage}
          className={cn(
            communityUi.iconButton,
            "h-10 w-10 text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#e2e7f2]",
            communityUi.disabled,
            FOCUS_VISIBLE
          )}
          title={attachImageLabel}
          aria-label={attachImageLabel}
        >
          <ImageOutlinedIcon aria-hidden="true" />
        </button>

        {draft.imageFile ? (
          <button
            type="button"
            onClick={() => handleImageFile(null)}
            disabled={creating}
            className={cn(
              "mr-auto inline-flex min-w-0 touch-manipulation items-center gap-1 rounded-md px-2 py-1 text-xs text-[#c8d1e5] transition-colors hover:border-[#ff8aa3]/50 hover:text-[#ffc4d2]",
              communityUi.disabled,
              communityStyles.softBorder,
              FOCUS_VISIBLE
            )}
            title="Remove attachment"
            aria-label={`Remove attachment ${draft.imageFile.name}`}
          >
            <span className="max-w-[14rem] truncate">{draft.imageFile.name}</span>
            <CloseRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="submit"
          disabled={creating || !canSubmit}
          className={cn(
            "inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-[#5d67ff] px-[16px] text-sm font-bold text-white transition-colors",
            "hover:bg-[#7079ff]",
            communityUi.disabled,
            FOCUS_VISIBLE
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          {creating ? "Posting…" : "Post"}
        </button>
      </div>

      {attachmentError ? (
        <p
          className={cn(
            "mt-[12px] rounded-md border border-[#ff5b7c]/30 bg-[#ff3d68]/10 px-[12px] py-[8px] text-sm text-[#ffd9e2]",
            communityStyles.wrapAnywhere
          )}
          role="alert"
        >
          {attachmentError}
        </p>
      ) : null}
    </form>
  );
}
