// File purpose: Renders collapsible long discussion copy with tags and footer content.
import * as React from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import communityStyles from "../styles/community.module.css";
import { POST_BODY_PREVIEW_MAX_CHARS } from "../constants";
import { FOCUS_VISIBLE, cn, fitType } from "../design";
import { getExpandableText } from "../lib/communityText";
import { MarkdownBody } from "./MarkdownBody";

export function ExpandableText({
  allowedImageUrl,
  text,
  maxChars = POST_BODY_PREVIEW_MAX_CHARS,
}: {
  allowedImageUrl?: string | null;
  text: string;
  maxChars?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const contentId = React.useId();
  const { shouldCollapse, preview } = React.useMemo(
    () => getExpandableText(text, maxChars),
    [maxChars, text],
  );
  const visibleText = shouldCollapse && !expanded ? preview : text;

  React.useEffect(() => {
    setExpanded(false);
  }, [text]);

  return (
    <div className={cn("mt-[10px]", communityStyles.postCopyMeasure)}>
      <MarkdownBody
        allowedImageUrl={allowedImageUrl}
        id={contentId}
        className={cn(
          "text-[var(--fit-color-text-body)]",
          fitType.body,
          communityStyles.wrapAnywhere,
        )}
        optimizeForStreaming={shouldCollapse && !expanded}
        text={visibleText}
      />

      {shouldCollapse ? (
        <div className="mt-[9px] flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[7px]">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              "inline-flex min-h-8 touch-manipulation items-center gap-[4px] rounded-md px-[8px] py-[4px] text-[var(--fit-color-accent)] transition-colors hover:bg-[var(--fit-color-surface-soft)] hover:text-[var(--fit-color-text-body)]",
              fitType.control,
              FOCUS_VISIBLE,
            )}
            aria-expanded={expanded}
            aria-controls={contentId}
          >
            {expanded ? "Collapse" : "Read more"}
            {expanded ? (
              <KeyboardArrowUpRoundedIcon
                sx={{ fontSize: 18 }}
                aria-hidden="true"
              />
            ) : (
              <KeyboardArrowDownRoundedIcon
                sx={{ fontSize: 18 }}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
