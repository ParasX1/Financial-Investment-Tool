// File purpose: Provides Community text helpers for previewing and expanding long body copy.
import { POST_BODY_PREVIEW_MIN_WORD_BOUNDARY } from "../constants";

export function getExpandableText(text: string, maxChars: number) {
  const clean = text.trim();

  if (clean.length <= maxChars) {
    return {
      shouldCollapse: false,
      preview: clean,
    };
  }

  const slice = clean.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const lastLineBreak = slice.lastIndexOf("\n");
  const boundary = Math.max(lastSpace, lastLineBreak);
  const end =
    boundary >= POST_BODY_PREVIEW_MIN_WORD_BOUNDARY ? boundary : maxChars;

  return {
    shouldCollapse: true,
    preview: `${clean.slice(0, end).trimEnd()}...`,
  };
}
