import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import type { MouseEvent } from "react";
import Link from "next/link";
import { fitButton } from "@/components/shared/fitStyles";
import communityStyles from "@/styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";

export function CommunityToolbar({
  actionHref,
  actionLabel,
  actionType = "create",
  query,
  onActionClick,
  onQueryChange,
  onSearchSubmit,
}: {
  actionHref: string;
  actionLabel: string;
  actionType?: "create" | "back";
  query: string;
  onActionClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onQueryChange: (value: string) => void;
  onSearchSubmit?: () => void;
}) {
  return (
    <section
      className={cn(
        "fixed right-0 top-0 z-[850] border-b border-[#202230] bg-black/95 px-3 backdrop-blur-md sm:px-8 lg:px-10",
        communityStyles.toolbar,
      )}
      data-community-toolbar
    >
      <form
        className={cn(
          "mx-auto flex min-w-0 items-center gap-3",
          communityStyles.toolbarInner,
        )}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit?.();
        }}
      >
      <div className="relative min-w-0 flex-1">
        <label htmlFor="community-search" className="sr-only">
          Search discussions
        </label>
        <SearchRoundedIcon
          className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[#7f8798]"
          sx={{ fontSize: 20 }}
          aria-hidden="true"
        />
        <input
          id="community-search"
          name="community-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search discussions…"
          className={cn(
            "w-full pl-[44px] pr-[16px] text-[15px]",
            communityStyles.toolbarControl,
            communityUi.field,
            communityStyles.panelBorder
          )}
        />
      </div>

        <Link
          href={actionHref}
          onClick={onActionClick}
          className={cn(
            "inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-lg px-3 text-sm font-bold text-white no-underline transition-colors hover:no-underline sm:px-4",
            communityStyles.toolbarControl,
            actionType === "create" ? fitButton.primary : fitButton.secondary,
            FOCUS_VISIBLE,
          )}
        >
          {actionType === "create" ? (
            <AddRoundedIcon sx={{ fontSize: 19 }} aria-hidden="true" />
          ) : (
            <ArrowBackRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{actionLabel}</span>
          <span className="sm:hidden">
            {actionType === "create" ? "Post" : "Back"}
          </span>
        </Link>
      </form>
    </section>
  );
}
