// File purpose: Renders the create-post form, markdown toolbar, tag suggestions, and draft image controls.
import * as React from "react";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import communityStyles from "../styles/community.module.css";
import { MAX_COMMUNITY_POST_TITLE_CHARS } from "../constants";
import { FOCUS_VISIBLE, cn, communityUi, fitText, fitType } from "../design";
import {
  getCommunityPostTypeLabel,
  getCommunityTimeFrameLabel,
} from "../lib/communityPostMetadata";
import {
  detectTickerTags,
  getSmartTagSuggestions,
  mergeSelectedTagSuggestions,
} from "../lib/smartTags";
import type {
  CommunityPostType,
  CommunityTimeFrame,
  DiscussionDraft,
  DiscussionDraftField,
  DiscussionDraftMetadataField,
} from "../types";
import { validateCommunityPostContent } from "../lib/communityValidation";
import { CommunityMarkdownEditor } from "./CommunityMarkdownEditor";
import { SmartTagSuggestions } from "./SmartTagSuggestions";
import { CommunityTickerField } from "./CommunityTickerField";

const COMMUNITY_POST_TYPE_OPTIONS: CommunityPostType[] = [
  "question",
  "analysis",
  "news",
  "portfolio",
  "discussion",
];

const COMMUNITY_TIME_FRAME_OPTIONS: CommunityTimeFrame[] = [
  "short",
  "medium",
  "long",
];

export function CommunityComposer({
  className,
  draft,
  creating,
  canAttachImage,
  onDraftChange,
  onDraftMetadataChange,
  onDraftTickersChange,
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
  onDraftMetadataChange: (
    field: DiscussionDraftMetadataField,
    value: string,
  ) => void;
  onDraftTickersChange: (tickers: string[]) => void;
  onClearTags: () => void;
  onDraftImageChange: (file: File | null) => void;
  onToggleTag: (tag: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = Boolean(
    draft.postType && !validateCommunityPostContent(draft),
  );
  const smartTags = React.useMemo(() => getSmartTagSuggestions(draft), [draft]);
  const suggestedTickers = React.useMemo(
    () => detectTickerTags(draft).map((ticker) => ticker.replace(/^\$/, "")),
    [draft],
  );
  const visibleTags = React.useMemo(
    () =>
      mergeSelectedTagSuggestions(
        draft.tags,
        smartTags.filter((tag) => tag.kind !== "ticker"),
      ),
    [draft.tags, smartTags],
  );

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
        <div
          className={cn(
            communityUi.avatar,
            "h-10 w-10 bg-gradient-to-br from-[#4f63ff] to-[#7c3aed]",
            fitType.avatarMd,
          )}
        >
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
            maxLength={MAX_COMMUNITY_POST_TITLE_CHARS}
            value={draft.title}
            onChange={(event) => onDraftChange("title", event.target.value)}
            placeholder="Title"
            className={cn(
              "h-11 w-full px-[16px]",
              communityUi.field,
              communityStyles.inputBorder,
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          />
          <span
            className={cn(
              "-mt-1 block text-right text-[#7f899c]",
              fitType.caption,
            )}
            aria-label="Post title character count"
          >
            {draft.title.length}/{MAX_COMMUNITY_POST_TITLE_CHARS}
          </span>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,14rem)_minmax(0,12rem)_minmax(18rem,1fr)_minmax(0,1fr)]">
            <label className={cn(fitType.eyebrow, fitText.label)}>
              Post type
              <select
                value={draft.postType}
                disabled={creating}
                onChange={(event) =>
                  onDraftMetadataChange("postType", event.target.value)
                }
                className={cn(
                  "mt-1 h-10 w-full px-3 normal-case",
                  communityUi.field,
                  communityStyles.inputBorder,
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <option value="">Choose a type</option>
                {COMMUNITY_POST_TYPE_OPTIONS.map((postType) => (
                  <option key={postType} value={postType}>
                    {getCommunityPostTypeLabel(postType)}
                  </option>
                ))}
              </select>
            </label>

            <label className={cn(fitType.eyebrow, fitText.label)}>
              Time frame (optional)
              <select
                value={draft.timeFrame}
                disabled={creating}
                onChange={(event) =>
                  onDraftMetadataChange("timeFrame", event.target.value)
                }
                className={cn(
                  "mt-1 h-10 w-full px-3 normal-case",
                  communityUi.field,
                  communityStyles.inputBorder,
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <option value="">Not specified</option>
                {COMMUNITY_TIME_FRAME_OPTIONS.map((timeFrame) => (
                  <option key={timeFrame} value={timeFrame}>
                    {getCommunityTimeFrameLabel(timeFrame)}
                  </option>
                ))}
              </select>
            </label>

            <CommunityTickerField
              disabled={creating}
              input={draft.tickerInput}
              suggestedTickers={suggestedTickers}
              tickers={draft.tickers}
              onInputChange={(value) =>
                onDraftMetadataChange("tickerInput", value)
              }
              onTickersChange={onDraftTickersChange}
            />

            <label
              className={cn(
                fitType.eyebrow,
                fitText.label,
                "md:col-span-2 xl:col-span-1",
              )}
            >
              Source URL
              <input
                value={draft.sourceUrl}
                disabled={creating}
                onChange={(event) =>
                  onDraftMetadataChange("sourceUrl", event.target.value)
                }
                className={cn(
                  "mt-1 h-10 w-full px-3 normal-case",
                  communityUi.field,
                  communityStyles.inputBorder,
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                placeholder="https://example.com/research"
              />
            </label>
          </div>

          <CommunityMarkdownEditor
            canAttachImage={canAttachImage}
            disabled={creating}
            imageFile={draft.imageFile}
            imagePreviewUrl={draft.imagePreviewUrl}
            value={draft.body}
            onChange={(value) => onDraftChange("body", value)}
            onImageChange={onDraftImageChange}
          />

          <SmartTagSuggestions
            items={visibleTags}
            selectedTags={draft.tags}
            onClear={onClearTags}
            onToggle={onToggleTag}
          />
        </div>
      </div>

      <div className="mt-[12px] flex justify-end pl-0 sm:pl-14">
        <button
          type="submit"
          disabled={creating || !canSubmit}
          className={cn(
            "inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-[#5d67ff] px-[16px] text-white transition-colors",
            fitType.control,
            "hover:bg-[#7079ff]",
            communityUi.disabled,
            FOCUS_VISIBLE,
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          {creating ? "Posting…" : "Post"}
        </button>
      </div>

      {!draft.postType ? (
        <p className={cn("mt-[12px] text-[#8d95a6]", fitType.bodySm)}>
          Choose a post type so readers know whether this is a question, news
          discussion, portfolio review, or analysis.
        </p>
      ) : null}
    </form>
  );
}
