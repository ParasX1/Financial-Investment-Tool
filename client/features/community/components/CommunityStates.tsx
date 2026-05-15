import communityStyles from "@/styles/community.module.css";
import { cn, communityUi } from "../design";

export function LoadingDiscussions() {
  return (
    <div
      className={cn(
        communityUi.card,
        "px-[16px] py-[18px] sm:px-[16px] sm:py-[20px]",
        communityStyles.panelBorder
      )}
      role="status"
      aria-label="Loading community discussions"
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-full", communityStyles.skeleton)} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={cn("h-3 w-28 rounded", communityStyles.skeleton)} />
          <div className={cn("h-3 w-20 rounded", communityStyles.skeleton)} />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className={cn("h-5 w-3/4 rounded", communityStyles.skeleton)} />
        <div className={cn("h-3 w-full rounded", communityStyles.skeleton)} />
        <div className={cn("h-3 w-5/6 rounded", communityStyles.skeleton)} />
      </div>
      <p className="mt-5 text-sm text-[#8f98aa]">Loading latest discussions…</p>
    </div>
  );
}

export function EmptyState({ query }: { query: string }) {
  const hasSearch = Boolean(query.trim());

  return (
    <div
      className={cn(
        communityUi.card,
        "px-6 py-12 text-center text-sm text-[#8f98aa]",
        communityStyles.panelBorder
      )}
    >
      <p className="font-semibold text-[#e2e7f2]">
        {hasSearch ? "No discussions match your search." : "No discussions yet."}
      </p>
      <p className="mt-2">
        {hasSearch
          ? "Try a different keyword or clear the search field."
          : "Start a discussion to create the first community post."}
      </p>
    </div>
  );
}
