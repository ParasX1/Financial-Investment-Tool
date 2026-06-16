// File purpose: Renders collapsible long discussion copy with tags and footer content.
import * as React from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import communityStyles from "../styles/community.module.css";
import { POST_BODY_PREVIEW_MAX_CHARS } from "../constants";
import { FOCUS_VISIBLE, cn } from "../design";
import { getExpandableText } from "../lib/communityText";
import { MarkdownBody } from "./MarkdownBody";

export function ExpandableText({
  text,
  maxChars = POST_BODY_PREVIEW_MAX_CHARS,
}: {
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
        id={contentId}
        className={cn(
          "text-[15px] leading-[1.65] text-[#c4ccdc]",
          communityStyles.wrapAnywhere,
        )}
        text={visibleText}
      />

      {shouldCollapse ? (
        <div className="mt-[9px] flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[7px]">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              "inline-flex min-h-8 touch-manipulation items-center gap-[4px] rounded-md px-[8px] py-[4px] text-sm font-semibold text-[#9eb2ff] transition-colors hover:bg-white/[0.04] hover:text-[#d9e0ff]",
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
