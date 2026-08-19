// File purpose: Guards create-post navigation when a draft contains unsaved content.
import * as React from "react";
import type { NextRouter } from "next/router";
import { isDiscussionDraftDirty } from "../lib/communityDraft";
import type { DiscussionDraft, FeedbackMessage } from "../types";

export function useCommunityDraftNavigation({
  draft,
  pushFeedback,
  router,
}: {
  draft: DiscussionDraft;
  pushFeedback: (message: Omit<FeedbackMessage, "id">) => void;
  router: NextRouter;
}) {
  const blockedNavigationRef = React.useRef<string | null>(null);
  const draftDirty = React.useMemo(
    () => isDiscussionDraftDirty(draft),
    [draft],
  );

  React.useEffect(() => {
    blockedNavigationRef.current = null;
  }, [draft]);

  React.useEffect(() => {
    if (!draftDirty) return;

    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [draftDirty]);

  React.useEffect(() => {
    router.beforePopState(() => {
      if (!draftDirty) return true;

      if (blockedNavigationRef.current === "browser-back") {
        blockedNavigationRef.current = null;
        return true;
      }

      blockedNavigationRef.current = "browser-back";
      pushFeedback({
        tone: "info",
        title: "Unsaved discussion",
        message:
          "Your draft has unsaved content. Press Back again to leave without posting.",
      });
      return false;
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [draftDirty, pushFeedback, router]);

  const navigateWithDraftGuard = React.useCallback(
    (key: string, navigate: () => void) => {
      if (!draftDirty) {
        blockedNavigationRef.current = null;
        navigate();
        return;
      }

      if (blockedNavigationRef.current === key) {
        blockedNavigationRef.current = null;
        navigate();
        return;
      }

      blockedNavigationRef.current = key;
      pushFeedback({
        tone: "info",
        title: "Unsaved discussion",
        message:
          "Your draft has unsaved content. Select the action again to leave this page.",
      });
    },
    [draftDirty, pushFeedback],
  );

  return {
    draftDirty,
    navigateWithDraftGuard,
  };
}
