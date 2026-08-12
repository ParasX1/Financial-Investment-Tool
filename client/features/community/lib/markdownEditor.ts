// File purpose: Provides markdown editing commands, link/image insertion, URL normalization, and draft image marker helpers.
export const DRAFT_IMAGE_MARKER = "community-draft-image";

export type MarkdownCommand =
  | "bold"
  | "italic"
  | "strike"
  | "superscript"
  | "heading"
  | "blockquote"
  | "bullet"
  | "numbered"
  | "inlineCode"
  | "codeBlock";

export type TextSelection = {
  start: number;
  end: number;
};

export type MarkdownEdit = {
  value: string;
  selection: TextSelection;
};

const DRAFT_IMAGE_PATTERN = /!\[([^\]]*)\]\(community-draft-image\)/g;
const DRAFT_IMAGE_WITH_SPACING_PATTERN =
  /[ \t]*!\[[^\]]*\]\(community-draft-image\)[ \t]*(?:\n)?/g;

function clampSelection(value: string, selection: TextSelection) {
  const start = Math.min(Math.max(selection.start, 0), value.length);
  const end = Math.min(Math.max(selection.end, start), value.length);
  return { start, end };
}

function replaceSelection(
  value: string,
  selection: TextSelection,
  replacement: string,
  nextSelection?: TextSelection,
): MarkdownEdit {
  const safeSelection = clampSelection(value, selection);
  const nextValue =
    value.slice(0, safeSelection.start) +
    replacement +
    value.slice(safeSelection.end);
  const cursor = safeSelection.start + replacement.length;

  return {
    value: nextValue,
    selection: nextSelection
      ? {
          start: safeSelection.start + nextSelection.start,
          end: safeSelection.start + nextSelection.end,
        }
      : { start: cursor, end: cursor },
  };
}

function wrapSelection(
  value: string,
  selection: TextSelection,
  before: string,
  after: string,
  placeholder: string,
) {
  const safeSelection = clampSelection(value, selection);
  const selected = value.slice(safeSelection.start, safeSelection.end);
  const inner = selected || placeholder;
  const replacement = `${before}${inner}${after}`;

  return replaceSelection(value, safeSelection, replacement, {
    start: before.length,
    end: before.length + inner.length,
  });
}

function applyLinePrefix(
  value: string,
  selection: TextSelection,
  getPrefix: (index: number) => string,
) {
  const safeSelection = clampSelection(value, selection);
  const lineStart = value.lastIndexOf("\n", safeSelection.start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", safeSelection.end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split("\n");
  const prefixed = lines
    .map((line, index) => {
      if (!line.trim()) return line;
      return `${getPrefix(index)}${line.replace(
        /^((#{1,6}|[-*]|\d+\.|>)\s+)/,
        "",
      )}`;
    })
    .join("\n");

  return replaceSelection(
    value,
    { start: lineStart, end: lineEnd },
    prefixed || getPrefix(0).trimEnd(),
  );
}

export function applyMarkdownCommand(
  value: string,
  selection: TextSelection,
  command: MarkdownCommand,
): MarkdownEdit {
  switch (command) {
    case "bold":
      return wrapSelection(value, selection, "**", "**", "bold text");
    case "italic":
      return wrapSelection(value, selection, "*", "*", "italic text");
    case "strike":
      return wrapSelection(value, selection, "~~", "~~", "struck text");
    case "superscript":
      return wrapSelection(value, selection, "^", "^", "superscript");
    case "heading":
      return applyLinePrefix(value, selection, () => "## ");
    case "blockquote":
      return applyLinePrefix(value, selection, () => "> ");
    case "bullet":
      return applyLinePrefix(value, selection, () => "- ");
    case "numbered":
      return applyLinePrefix(value, selection, (index) => `${index + 1}. `);
    case "inlineCode":
      return wrapSelection(value, selection, "`", "`", "code");
    case "codeBlock": {
      const safeSelection = clampSelection(value, selection);
      const selected = value.slice(safeSelection.start, safeSelection.end);
      const code = selected || "code";
      return replaceSelection(value, safeSelection, `\`\`\`\n${code}\n\`\`\``, {
        start: 4,
        end: 4 + code.length,
      });
    }
    default:
      return { value, selection: clampSelection(value, selection) };
  }
}

export function normalizeMarkdownUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return { error: "URL is required." };
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const isAllowed = ["http:", "https:", "mailto:"].includes(url.protocol);

    if (!isAllowed) {
      return { error: "Enter a valid http, https, or mailto URL." };
    }

    return {
      value: url.toString().replace(/\(/g, "%28").replace(/\)/g, "%29"),
    };
  } catch {
    return { error: "Enter a valid URL." };
  }
}

export function removeDraftImageMarkers(value: string) {
  return value
    .replace(DRAFT_IMAGE_WITH_SPACING_PATTERN, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeMarkdownLabel(value: string) {
  return value
    .trim()
    .replace(/[\[\]\n\r]/g, " ")
    .replace(/\s+/g, " ");
}

export function insertMarkdownLink(
  value: string,
  selection: TextSelection,
  displayText: string,
  rawUrl: string,
): MarkdownEdit & { error?: string } {
  const normalized = normalizeMarkdownUrl(rawUrl);
  if ("error" in normalized) {
    return {
      value,
      selection: clampSelection(value, selection),
      error: normalized.error,
    };
  }

  const safeSelection = clampSelection(value, selection);
  const selected = value.slice(safeSelection.start, safeSelection.end).trim();
  const label = escapeMarkdownLabel(
    displayText || selected || normalized.value,
  );
  const replacement = `[${label}](${normalized.value})`;

  return replaceSelection(value, safeSelection, replacement);
}

export function insertMarkdownImage(
  value: string,
  selection: TextSelection,
  fileName: string,
): MarkdownEdit {
  const safeSelection = clampSelection(value, selection);
  const alt = escapeMarkdownLabel(fileName.replace(/\.[^.]+$/, "")) || "image";
  const imageMarkdown = `![${alt}](${DRAFT_IMAGE_MARKER})`;
  const replacement =
    safeSelection.start > 0 && !/\s/.test(value[safeSelection.start - 1])
      ? ` ${imageMarkdown}\n`
      : `${imageMarkdown}\n`;

  return replaceSelection(value, safeSelection, replacement);
}

export function replaceDraftImageMarkers(
  value: string,
  imageUrl: string | null,
) {
  if (!imageUrl) return removeDraftImageMarkers(value);

  return value.replace(
    DRAFT_IMAGE_PATTERN,
    (_match, altText: string) =>
      `![${escapeMarkdownLabel(altText) || "image"}](${imageUrl})`,
  );
}

export function bodyContainsImageUrl(value: string, imageUrl?: string | null) {
  if (!imageUrl) return false;
  return value.includes(`](${imageUrl})`);
}
