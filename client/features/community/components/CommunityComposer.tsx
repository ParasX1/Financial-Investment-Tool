// File purpose: Renders the create-post form, markdown toolbar, tag suggestions, and draft image controls.
import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertLinkRoundedIcon from "@mui/icons-material/InsertLinkRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import StrikethroughSRoundedIcon from "@mui/icons-material/StrikethroughSRounded";
import SuperscriptRoundedIcon from "@mui/icons-material/SuperscriptRounded";
import TitleRoundedIcon from "@mui/icons-material/TitleRounded";
import communityStyles from "../styles/community.module.css";
import { COMMUNITY_IMAGE_TYPES } from "../constants";
import { FOCUS_VISIBLE, cn, communityUi, fitText, fitType } from "../design";
import {
  applyMarkdownCommand,
  insertMarkdownImage,
  insertMarkdownLink,
  removeDraftImageMarkers,
  replaceDraftImageMarkers,
  type MarkdownCommand,
  type MarkdownEdit,
  type TextSelection,
} from "../lib/markdownEditor";
import {
  getSmartTagSuggestions,
  mergeSelectedTagSuggestions,
} from "../lib/smartTags";
import type { DiscussionDraft, DiscussionDraftField } from "../types";
import { validateCommunityImage } from "../lib/communityValidation";
import { SmartTagSuggestions } from "./SmartTagSuggestions";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

const toolbarActions: Array<{
  command: MarkdownCommand;
  label: string;
  icon: React.ElementType;
}> = [
  { command: "bold", label: "Bold", icon: FormatBoldRoundedIcon },
  { command: "italic", label: "Italic", icon: FormatItalicRoundedIcon },
  {
    command: "strike",
    label: "Strikethrough",
    icon: StrikethroughSRoundedIcon,
  },
  {
    command: "superscript",
    label: "Superscript",
    icon: SuperscriptRoundedIcon,
  },
  { command: "heading", label: "Heading", icon: TitleRoundedIcon },
  {
    command: "bullet",
    label: "Bullet list",
    icon: FormatListBulletedRoundedIcon,
  },
  {
    command: "numbered",
    label: "Numbered list",
    icon: FormatListNumberedRoundedIcon,
  },
];

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
  const linkSelection = React.useRef<TextSelection | null>(null);
  const linkUrlInput = React.useRef<HTMLInputElement | null>(null);
  const cachedSelection = React.useRef<TextSelection | null>(null);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(
    null,
  );
  const [linkPanelOpen, setLinkPanelOpen] = React.useState(false);
  const [linkText, setLinkText] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const canSubmit = Boolean(draft.title.trim());
  const attachImageLabel = canAttachImage
    ? "Insert image"
    : "Sign in to insert images";
  const smartTags = React.useMemo(() => getSmartTagSuggestions(draft), [draft]);
  const visibleTags = React.useMemo(
    () => mergeSelectedTagSuggestions(draft.tags, smartTags),
    [draft.tags, smartTags],
  );

  React.useEffect(() => {
    if (!draft.imageFile && fileInput.current) fileInput.current.value = "";
  }, [draft.imageFile]);

  React.useEffect(() => {
    if (!linkPanelOpen) return;
    window.requestAnimationFrame(() => linkUrlInput.current?.focus());
  }, [linkPanelOpen]);

  function getBodySelection(): TextSelection {
    const textarea = bodyInput.current;
    if (!textarea) {
      return (
        cachedSelection.current ?? {
          start: draft.body.length,
          end: draft.body.length,
        }
      );
    }
    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function rememberBodySelection() {
    cachedSelection.current = getBodySelection();
  }

  function restoreBodySelection(selection: TextSelection) {
    cachedSelection.current = selection;
    window.requestAnimationFrame(() => {
      const textarea = bodyInput.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selection.start, selection.end);
    });
  }

  function applyBodyEdit(edit: MarkdownEdit) {
    onDraftChange("body", edit.value);
    restoreBodySelection(edit.selection);
  }

  function handleToolbarCommand(command: MarkdownCommand) {
    if (creating) return;
    applyBodyEdit(
      applyMarkdownCommand(
        draft.body,
        cachedSelection.current ?? getBodySelection(),
        command,
      ),
    );
  }

  function openLinkPanel() {
    const selection = getBodySelection();
    linkSelection.current = selection;
    setLinkText(draft.body.slice(selection.start, selection.end).trim());
    setLinkUrl("");
    setLinkError(null);
    setLinkPanelOpen(true);
  }

  function saveLink() {
    const edit = insertMarkdownLink(
      draft.body,
      linkSelection.current ?? getBodySelection(),
      linkText,
      linkUrl,
    );

    if (edit.error) {
      setLinkError(edit.error);
      return;
    }

    applyBodyEdit(edit);
    linkSelection.current = null;
    setLinkPanelOpen(false);
    setLinkError(null);
  }

  function cancelLink() {
    const selection = linkSelection.current;
    linkSelection.current = null;
    setLinkPanelOpen(false);
    setLinkError(null);
    if (selection) restoreBodySelection(selection);
  }

  function handleImageFile(nextFile?: File | null) {
    if (!nextFile) {
      setAttachmentError(null);
      onDraftChange("body", replaceDraftImageMarkers(draft.body, null));
      onDraftImageChange(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    if (!canAttachImage) {
      setAttachmentError("Sign in before inserting an image.");
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
    const bodyWithoutExistingImage = removeDraftImageMarkers(draft.body);
    const selection = cachedSelection.current ?? getBodySelection();
    applyBodyEdit(
      insertMarkdownImage(bodyWithoutExistingImage, selection, nextFile.name),
    );
    onDraftImageChange(nextFile);
  }

  function keepTextareaSelection(event: React.MouseEvent | React.PointerEvent) {
    event.preventDefault();
    rememberBodySelection();
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
        if (linkPanelOpen) return;
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

          <div
            className={cn(
              "overflow-hidden rounded-lg bg-[var(--fit-color-field)]",
              communityStyles.inputBorder,
            )}
          >
            <div
              role="toolbar"
              aria-label="Discussion formatting tools"
              className={cn(
                "flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-2",
                "bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))]",
              )}
            >
              {toolbarActions.map(({ command, label, icon: Icon }) => (
                <button
                  key={command}
                  type="button"
                  disabled={creating}
                  onMouseDown={keepTextareaSelection}
                  onPointerDown={keepTextareaSelection}
                  onClick={() => handleToolbarCommand(command)}
                  className={cn(
                    communityUi.iconButton,
                    "h-9 w-9 text-[#95a0b2] hover:bg-white/[0.06] hover:text-[#f3f6ff]",
                    communityUi.disabled,
                    FOCUS_VISIBLE,
                  )}
                  title={label}
                  aria-label={label}
                >
                  <Icon sx={{ fontSize: 19 }} aria-hidden="true" />
                </button>
              ))}

              <span className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />

              <button
                type="button"
                disabled={creating}
                onMouseDown={keepTextareaSelection}
                onPointerDown={keepTextareaSelection}
                onClick={openLinkPanel}
                className={cn(
                  communityUi.iconButton,
                  "h-9 w-9 text-[#95a0b2] hover:bg-white/[0.06] hover:text-[#f3f6ff]",
                  communityUi.disabled,
                  FOCUS_VISIBLE,
                )}
                title="Insert link"
                aria-label="Insert link"
                aria-expanded={linkPanelOpen}
                aria-controls="community-link-panel"
              >
                <InsertLinkRoundedIcon
                  sx={{ fontSize: 20 }}
                  aria-hidden="true"
                />
              </button>

              <input
                ref={fileInput}
                type="file"
                accept={COMMUNITY_IMAGE_TYPES.join(",")}
                className="hidden"
                disabled={creating || !canAttachImage}
                onChange={(event) =>
                  handleImageFile(event.currentTarget.files?.[0] ?? null)
                }
              />
              <button
                type="button"
                onMouseDown={keepTextareaSelection}
                onPointerDown={keepTextareaSelection}
                onClick={() => fileInput.current?.click()}
                disabled={creating || !canAttachImage}
                className={cn(
                  communityUi.iconButton,
                  "h-9 w-9 text-[#95a0b2] hover:bg-white/[0.06] hover:text-[#f3f6ff]",
                  communityUi.disabled,
                  FOCUS_VISIBLE,
                )}
                title={attachImageLabel}
                aria-label={attachImageLabel}
              >
                <ImageOutlinedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
              </button>
            </div>

            {linkPanelOpen ? (
              <div
                id="community-link-panel"
                role="dialog"
                aria-label="Insert link"
                className="border-b border-white/10 bg-[#101116] px-3 py-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={cn(fitType.eyebrow, fitText.label)}>
                    Display text
                    <input
                      value={linkText}
                      onChange={(event) => setLinkText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveLink();
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          cancelLink();
                        }
                      }}
                      className={cn(
                        "mt-1 h-10 w-full px-3 normal-case",
                        communityUi.field,
                        communityStyles.inputBorder,
                      )}
                      placeholder="Optional"
                    />
                  </label>

                  <label className={cn(fitType.eyebrow, fitText.label)}>
                    URL
                    <input
                      ref={linkUrlInput}
                      value={linkUrl}
                      onChange={(event) => {
                        setLinkUrl(event.target.value);
                        setLinkError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveLink();
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          cancelLink();
                        }
                      }}
                      className={cn(
                        "mt-1 h-10 w-full px-3 normal-case",
                        communityUi.field,
                        communityStyles.inputBorder,
                      )}
                      placeholder="https://example.com"
                      aria-invalid={Boolean(linkError)}
                    />
                  </label>
                </div>

                {linkError ? (
                  <p
                    className={cn("mt-2 text-[#ffd9e2]", fitType.bodySm)}
                    role="alert"
                  >
                    {linkError}
                  </p>
                ) : null}

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelLink}
                    className={cn(
                      "h-9 rounded-lg px-3 text-[#aeb7c9] hover:bg-white/[0.05]",
                      fitType.control,
                      FOCUS_VISIBLE,
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveLink}
                    className={cn(
                      "h-9 rounded-lg bg-[#5d67ff] px-3 text-white hover:bg-[#7079ff]",
                      fitType.control,
                      FOCUS_VISIBLE,
                    )}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : null}

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
              onSelect={rememberBodySelection}
              onKeyUp={rememberBodySelection}
              onPointerUp={rememberBodySelection}
              placeholder="Body text (optional)"
              rows={5}
              className={cn(
                "min-h-[142px] w-full resize-none overflow-hidden bg-transparent px-[16px] py-[14px] text-[#e2e7f2] outline-none placeholder:text-[#7f8798] sm:min-h-[126px]",
                fitType.body,
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            />
          </div>

          <SmartTagSuggestions
            items={visibleTags}
            selectedTags={draft.tags}
            onClear={onClearTags}
            onToggle={onToggleTag}
          />
        </div>
      </div>

      <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[12px] pl-0 sm:pl-14">
        {draft.imageFile ? (
          <button
            type="button"
            onClick={() => handleImageFile(null)}
            disabled={creating}
            className={cn(
              "mr-auto inline-flex min-w-0 touch-manipulation items-center gap-1 rounded-md px-2 py-1 text-[#c8d1e5] transition-colors hover:border-[#ff8aa3]/50 hover:text-[#ffc4d2]",
              fitType.caption,
              communityUi.disabled,
              communityStyles.softBorder,
              FOCUS_VISIBLE,
            )}
            title="Remove inline image"
            aria-label={`Remove inline image ${draft.imageFile.name}`}
          >
            <span className="max-w-[14rem] truncate">
              {draft.imageFile.name}
            </span>
            <CloseRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
          </button>
        ) : (
          <span className={cn("mr-auto", fitType.caption, fitText.label)}>
            Formatting is saved as Markdown.
          </span>
        )}

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

      {attachmentError ? (
        <p
          className={cn(
            "mt-[12px] rounded-md border border-[#ff5b7c]/30 bg-[#ff3d68]/10 px-[12px] py-[8px] text-[#ffd9e2]",
            fitType.bodySm,
            communityStyles.wrapAnywhere,
          )}
          role="alert"
        >
          {attachmentError}
        </p>
      ) : null}
    </form>
  );
}
