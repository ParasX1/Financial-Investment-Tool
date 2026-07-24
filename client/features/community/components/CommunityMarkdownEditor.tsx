// File purpose: Owns the Community Write/Preview Markdown authoring experience.
import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertLinkRoundedIcon from "@mui/icons-material/InsertLinkRounded";
import StrikethroughSRoundedIcon from "@mui/icons-material/StrikethroughSRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import TitleRoundedIcon from "@mui/icons-material/TitleRounded";
import communityStyles from "../styles/community.module.css";
import {
  COMMUNITY_IMAGE_TYPES,
  MAX_COMMUNITY_POST_BODY_CHARS,
} from "../constants";
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
import { validateCommunityImage } from "../lib/communityValidation";
import { MarkdownBody } from "./MarkdownBody";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

type EditorMode = "write" | "preview";

const TOOLBAR_ACTIONS: Array<{
  command: MarkdownCommand;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}> = [
  {
    command: "bold",
    label: "Bold",
    icon: FormatBoldRoundedIcon,
    shortcut: "Ctrl+B",
  },
  {
    command: "italic",
    label: "Italic",
    icon: FormatItalicRoundedIcon,
    shortcut: "Ctrl+I",
  },
  {
    command: "strike",
    label: "Strikethrough",
    icon: StrikethroughSRoundedIcon,
  },
  { command: "heading", label: "Heading", icon: TitleRoundedIcon },
  { command: "blockquote", label: "Quote", icon: FormatQuoteRoundedIcon },
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
  { command: "inlineCode", label: "Inline code", icon: CodeRoundedIcon },
  { command: "codeBlock", label: "Code block", icon: TerminalRoundedIcon },
];

function modeButtonClass(active: boolean) {
  return cn(
    "relative min-h-10 px-3 text-[#9ba5b8] transition-colors",
    fitType.control,
    "hover:text-white",
    active &&
      "text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#7384ff]",
    FOCUS_VISIBLE,
  );
}

function runOnNextFrame(callback: () => void) {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    window.requestAnimationFrame(callback);
    return;
  }
  callback();
}

export function CommunityMarkdownEditor({
  canAttachImage,
  disabled,
  imageFile,
  imagePreviewUrl,
  onChange,
  onImageChange,
  value,
}: {
  canAttachImage: boolean;
  disabled: boolean;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  onChange: (value: string) => void;
  onImageChange: (file: File | null) => void;
  value: string;
}) {
  const [mode, setMode] = React.useState<EditorMode>("write");
  const [attachmentError, setAttachmentError] = React.useState<string | null>(
    null,
  );
  const [linkPanelOpen, setLinkPanelOpen] = React.useState(false);
  const [linkText, setLinkText] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const textareaRef = useAutoResizeTextarea(value);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const linkUrlInputRef = React.useRef<HTMLInputElement | null>(null);
  const cachedSelectionRef = React.useRef<TextSelection | null>(null);
  const linkSelectionRef = React.useRef<TextSelection | null>(null);

  const previewText = React.useMemo(
    () => replaceDraftImageMarkers(value, imagePreviewUrl),
    [imagePreviewUrl, value],
  );

  React.useEffect(() => {
    if (!imageFile && fileInputRef.current) fileInputRef.current.value = "";
  }, [imageFile]);

  React.useEffect(() => {
    if (!linkPanelOpen) return;
    runOnNextFrame(() => linkUrlInputRef.current?.focus());
  }, [linkPanelOpen]);

  function getSelection(): TextSelection {
    const textarea = textareaRef.current;
    if (!textarea) {
      return (
        cachedSelectionRef.current ?? { start: value.length, end: value.length }
      );
    }

    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function rememberSelection() {
    cachedSelectionRef.current = getSelection();
  }

  function restoreSelection(selection: TextSelection) {
    cachedSelectionRef.current = selection;
    runOnNextFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selection.start, selection.end);
    });
  }

  function applyEdit(edit: MarkdownEdit) {
    onChange(edit.value);
    restoreSelection(edit.selection);
  }

  function applyCommand(command: MarkdownCommand) {
    if (disabled) return;
    applyEdit(
      applyMarkdownCommand(
        value,
        cachedSelectionRef.current ?? getSelection(),
        command,
      ),
    );
  }

  function openLinkPanel() {
    if (disabled) return;
    const selection = getSelection();
    linkSelectionRef.current = selection;
    setLinkText(value.slice(selection.start, selection.end).trim());
    setLinkUrl("");
    setLinkError(null);
    setLinkPanelOpen(true);
  }

  function cancelLink() {
    const selection = linkSelectionRef.current;
    linkSelectionRef.current = null;
    setLinkPanelOpen(false);
    setLinkError(null);
    if (selection) restoreSelection(selection);
  }

  function saveLink() {
    const edit = insertMarkdownLink(
      value,
      linkSelectionRef.current ?? getSelection(),
      linkText,
      linkUrl,
    );

    if (edit.error) {
      setLinkError(edit.error);
      return;
    }

    applyEdit(edit);
    linkSelectionRef.current = null;
    setLinkPanelOpen(false);
    setLinkError(null);
  }

  function handleLinkInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveLink();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelLink();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier) return;

    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      applyCommand(key === "b" ? "bold" : "italic");
      return;
    }
    if (key === "k") {
      event.preventDefault();
      openLinkPanel();
    }
  }

  function handleImageFile(file?: File | null) {
    if (!file) {
      setAttachmentError(null);
      onChange(replaceDraftImageMarkers(value, null));
      onImageChange(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!canAttachImage) {
      setAttachmentError("Sign in before inserting an image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validationError = validateCommunityImage(file);
    if (validationError) {
      setAttachmentError(validationError);
      onImageChange(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAttachmentError(null);
    const bodyWithoutExistingImage = removeDraftImageMarkers(value);
    applyEdit(
      insertMarkdownImage(
        bodyWithoutExistingImage,
        cachedSelectionRef.current ?? getSelection(),
        file.name,
      ),
    );
    onImageChange(file);
  }

  function keepTextareaSelection(event: React.MouseEvent | React.PointerEvent) {
    event.preventDefault();
    rememberSelection();
  }

  function switchMode(nextMode: EditorMode) {
    if (nextMode === mode) return;
    setLinkPanelOpen(false);
    setLinkError(null);
    setMode(nextMode);
  }

  const attachImageLabel = canAttachImage
    ? "Insert image"
    : "Sign in to insert images";

  return (
    <div>
      <div
        className={cn(
          "overflow-hidden rounded-lg bg-[var(--fit-color-field)]",
          communityStyles.inputBorder,
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-2">
          <div
            role="group"
            aria-label="Writing mode"
            className="flex items-center"
          >
            {(["write", "preview"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                disabled={disabled}
                onClick={() => switchMode(item)}
                className={modeButtonClass(mode === item)}
              >
                {item === "write" ? "Write" : "Preview"}
              </button>
            ))}
          </div>

          <span
            className={cn("px-2 text-[#7f899c]", fitType.caption)}
            aria-label="Post body character count"
          >
            {value.length.toLocaleString("en-US")}/
            {MAX_COMMUNITY_POST_BODY_CHARS.toLocaleString("en-US")}
          </span>
        </div>

        {mode === "write" ? (
          <>
            <div
              role="toolbar"
              aria-label="Discussion formatting tools"
              className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] px-2 py-2"
            >
              {TOOLBAR_ACTIONS.map(
                ({ command, icon: Icon, label, shortcut }) => (
                  <button
                    key={command}
                    type="button"
                    disabled={disabled}
                    onMouseDown={keepTextareaSelection}
                    onPointerDown={keepTextareaSelection}
                    onClick={() => applyCommand(command)}
                    className={cn(
                      communityUi.iconButton,
                      "h-9 w-9 text-[#95a0b2] hover:bg-white/[0.06] hover:text-[#f3f6ff]",
                      communityUi.disabled,
                      FOCUS_VISIBLE,
                    )}
                    title={shortcut ? `${label} (${shortcut})` : label}
                    aria-label={label}
                  >
                    <Icon sx={{ fontSize: 19 }} aria-hidden="true" />
                  </button>
                ),
              )}

              <span className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />

              <button
                type="button"
                disabled={disabled}
                onMouseDown={keepTextareaSelection}
                onPointerDown={keepTextareaSelection}
                onClick={openLinkPanel}
                className={cn(
                  communityUi.iconButton,
                  "h-9 w-9 text-[#95a0b2] hover:bg-white/[0.06] hover:text-[#f3f6ff]",
                  communityUi.disabled,
                  FOCUS_VISIBLE,
                )}
                title="Insert link (Ctrl+K)"
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
                ref={fileInputRef}
                type="file"
                accept={COMMUNITY_IMAGE_TYPES.join(",")}
                className="hidden"
                disabled={disabled || !canAttachImage}
                onChange={(event) =>
                  handleImageFile(event.currentTarget.files?.[0] ?? null)
                }
              />
              <button
                type="button"
                onMouseDown={keepTextareaSelection}
                onPointerDown={keepTextareaSelection}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || !canAttachImage}
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
                      onKeyDown={handleLinkInputKeyDown}
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
                      ref={linkUrlInputRef}
                      value={linkUrl}
                      onChange={(event) => {
                        setLinkUrl(event.target.value);
                        setLinkError(null);
                      }}
                      onKeyDown={handleLinkInputKeyDown}
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
                    Add link
                  </button>
                </div>
              </div>
            ) : null}

            <label htmlFor="community-draft-body" className="sr-only">
              Discussion body
            </label>
            <textarea
              ref={textareaRef}
              id="community-draft-body"
              name="community-draft-body"
              autoComplete="off"
              disabled={disabled}
              maxLength={MAX_COMMUNITY_POST_BODY_CHARS}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={rememberSelection}
              onKeyUp={rememberSelection}
              onPointerUp={rememberSelection}
              placeholder="Share your thesis, evidence, and questions…"
              rows={7}
              className={cn(
                "min-h-[190px] w-full resize-y overflow-y-auto bg-transparent px-4 py-4 text-[#e2e7f2] outline-none placeholder:text-[#7f8798]",
                fitType.body,
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            />
          </>
        ) : (
          <div
            aria-label="Markdown preview"
            className="min-h-[190px] px-4 py-4"
          >
            {previewText.trim() ? (
              <MarkdownBody
                text={previewText}
                allowedImageUrl={imagePreviewUrl}
              />
            ) : (
              <p className={cn("text-[#7f899c]", fitType.body)}>
                Nothing to preview yet.
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "mt-2 flex flex-wrap items-center gap-2",
          imageFile ? "justify-between" : "justify-end",
        )}
      >
        {imageFile ? (
          <button
            type="button"
            onClick={() => handleImageFile(null)}
            disabled={disabled}
            className={cn(
              "inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-1 text-[#c8d1e5] hover:text-[#ffc4d2]",
              fitType.caption,
              communityUi.disabled,
              communityStyles.softBorder,
              FOCUS_VISIBLE,
            )}
            aria-label={`Remove inline image ${imageFile.name}`}
          >
            <span className="max-w-[14rem] truncate">{imageFile.name}</span>
            <CloseRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
          </button>
        ) : null}

        <details className="text-right">
          <summary
            className={cn(
              "cursor-pointer text-[#9eb2ff] hover:text-[#dce3ff]",
              fitType.caption,
              FOCUS_VISIBLE,
            )}
          >
            Formatting help
          </summary>
          <p
            className={cn(
              "mt-2 max-w-md text-left text-[#8f99ac]",
              fitType.caption,
            )}
          >
            Use Markdown for headings, quotes, lists, links, inline code, code
            blocks, task lists, and tables. Raw HTML is ignored for safety.
          </p>
        </details>
      </div>

      {attachmentError ? (
        <p
          className={cn(
            "mt-2 rounded-md border border-[#ff5b7c]/30 bg-[#ff3d68]/10 px-3 py-2 text-[#ffd9e2]",
            fitType.bodySm,
          )}
          role="alert"
        >
          {attachmentError}
        </p>
      ) : null}
    </div>
  );
}
