// File purpose: Renders loading and empty states for Community discussions.
import communityStyles from "../styles/community.module.css";
import { cn, communityUi, fitText, fitType } from "../design";
import type { CommunityFeedView } from "../types";

export function LoadingDiscussions() {
  return (
    <div
      className={cn(
        communityUi.card,
        communityStyles.primaryPanelPadding,
        communityStyles.panelBorder,
      )}
      role="status"
      aria-label="Loading community discussions"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn("h-10 w-10 rounded-full", communityStyles.skeleton)}
        />
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
      <p className={cn("mt-5", fitType.bodySm, fitText.subtle)}>
        Loading latest discussions…
      </p>
    </div>
  );
}

const emptyCopy: Record<CommunityFeedView, { title: string; body: string }> = {
  top: {
    title: "No discussions yet.",
    body: "Start a discussion to create the first community post.",
  },
  new: {
    title: "No recent discussions yet.",
    body: "New posts will appear here as the community gets active.",
  },
  "my-posts": {
    title: "You have not posted any discussions yet.",
    body: "Create a discussion and it will show up here.",
  },
  saved: {
    title: "No saved discussions yet.",
    body: "Save a discussion to keep it in this view.",
  },
  liked: {
    title: "No liked discussions yet.",
    body: "Like a discussion to keep it in this view.",
  },
  commented: {
    title: "No commented discussions yet.",
    body: "Join a conversation and it will appear here.",
  },
};

export function EmptyState({
  query,
  view = "top",
}: {
  query: string;
  view?: CommunityFeedView;
}) {
  const hasSearch = Boolean(query.trim());
  const copy = emptyCopy[view];

  return (
    <div
      className={cn(
        communityUi.card,
        "px-6 py-12 text-center",
        fitType.bodySm,
        fitText.subtle,
        communityStyles.panelBorder,
      )}
    >
      <p className={cn(fitType.panelTitle, fitText.strong)}>
        {hasSearch ? "No discussions match your search." : copy.title}
      </p>
      <p className="mt-2">
        {hasSearch
          ? "Try a different keyword or clear the search field."
          : copy.body}
      </p>
    </div>
  );
}
