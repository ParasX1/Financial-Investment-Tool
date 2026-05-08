import * as React from "react";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import communityStyles from "@/styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";
import { getSmartTagSuggestions, mergeSelectedTagSuggestions } from "../smartTags";
import type { DiscussionDraft, DiscussionDraftField } from "../types";
import { SmartTagSuggestions } from "./SmartTagSuggestions";

export function CommunityComposer({
  draft,
  creating,
  onDraftChange,
  onClearTags,
  onToggleTag,
  onSubmit,
}: {
  draft: DiscussionDraft;
  creating: boolean;
  onDraftChange: (field: DiscussionDraftField, value: string) => void;
  onClearTags: () => void;
  onToggleTag: (tag: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = Boolean(draft.title.trim() && draft.body.trim());
  const smartTags = React.useMemo(
    () => getSmartTagSuggestions(draft),
    [draft]
  );
  const visibleTags = React.useMemo(
    () => mergeSelectedTagSuggestions(draft.tags, smartTags),
    [draft.tags, smartTags]
  );

  return (
    <form
      className={cn(communityUi.panel, "mt-7 p-[16px] sm:p-[20px]", communityStyles.panelBorder)}
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
            id="community-draft-body"
            name="community-draft-body"
            autoComplete="off"
            disabled={creating}
            value={draft.body}
            onChange={(event) => onDraftChange("body", event.target.value)}
            placeholder="Write the discussion…"
            rows={4}
            className={cn(
              "min-h-[112px] w-full resize-none px-[16px] py-[14px] text-[15px] leading-6 sm:min-h-[98px]",
              communityUi.field,
              communityStyles.inputBorder,
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />

          <SmartTagSuggestions
            items={visibleTags}
            selectedTags={draft.tags}
            onClear={onClearTags}
            onToggle={onToggleTag}
          />
        </div>
      </div>

      <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[12px] pl-0 sm:pl-14">
        <button
          type="button"
          className={cn(
            communityUi.iconButton,
            "h-10 w-10 text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#e2e7f2]",
            FOCUS_VISIBLE
          )}
          title="Image attachments are available in replies"
          aria-label="Image attachments are available in replies"
        >
          <ImageOutlinedIcon aria-hidden="true" />
        </button>

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
    </form>
  );
}
