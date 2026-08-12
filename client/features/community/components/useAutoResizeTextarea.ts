// File purpose: Provides textarea auto-resize behavior for long comment and post drafts.
import * as React from "react";

export function useAutoResizeTextarea(value: string) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return textareaRef;
}
