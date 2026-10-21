// File purpose: Owns the authenticated, private Community report workflow.
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reportCommunityPost } from "../data/communityService";
import type { CommunityReportReason, FeedbackMessage } from "../types";

type PushFeedback = (message: Omit<FeedbackMessage, "id">) => void;

export type CommunityReportDependencies = {
  reportPost: typeof reportCommunityPost;
};

const defaultDependencies: CommunityReportDependencies = {
  reportPost: reportCommunityPost,
};

export function useCommunityReportActions(
  {
    currentUserId,
    pushFeedback,
    sessionKey,
    supabase,
  }: {
    currentUserId: string | null;
    pushFeedback: PushFeedback;
    sessionKey: string;
    supabase: SupabaseClient | null;
  },
  dependencies: CommunityReportDependencies = defaultDependencies,
) {
  const [pendingReportPostId, setPendingReportPostId] = React.useState<
    string | null
  >(null);
  const [reporting, setReporting] = React.useState(false);
  const committedSessionKeyRef = React.useRef(sessionKey);
  const inFlightTokenRef = React.useRef<symbol | null>(null);

  React.useEffect(() => {
    committedSessionKeyRef.current = sessionKey;
    inFlightTokenRef.current = null;
    setPendingReportPostId(null);
    setReporting(false);
  }, [sessionKey]);

  function requestReport(postId: string) {
    if (!supabase) {
      pushFeedback({
        tone: "info",
        title: "Reporting is unavailable in demo mode",
        message: "Connect Supabase to send a private moderation report.",
      });
      return;
    }
    if (!currentUserId) {
      pushFeedback({
        tone: "info",
        title: "Sign in to report discussions",
        message: "Reports are private and linked to your signed-in account.",
      });
      return;
    }
    if (!postId.trim()) return;
    setPendingReportPostId(postId);
  }

  function cancelReport() {
    if (!reporting) setPendingReportPostId(null);
  }

  async function submitReport(reason: CommunityReportReason, details: string) {
    if (
      !pendingReportPostId ||
      !supabase ||
      !currentUserId ||
      inFlightTokenRef.current
    ) {
      return;
    }

    const requestToken = Symbol(pendingReportPostId);
    const startedSessionKey = committedSessionKeyRef.current;
    inFlightTokenRef.current = requestToken;
    setReporting(true);

    try {
      await dependencies.reportPost(supabase, {
        postId: pendingReportPostId,
        reason,
        details: details.trim(),
        expectedUserId: currentUserId,
      });
      if (committedSessionKeyRef.current !== startedSessionKey) return;

      setPendingReportPostId(null);
      pushFeedback({
        tone: "success",
        title: "Report sent for review",
        message: "Your report is private and will be reviewed by moderators.",
      });
    } catch {
      if (committedSessionKeyRef.current !== startedSessionKey) return;
      pushFeedback({
        tone: "error",
        title: "Report was not sent",
        message: "Could not submit this report. Please try again.",
      });
    } finally {
      if (inFlightTokenRef.current === requestToken) {
        inFlightTokenRef.current = null;
        if (committedSessionKeyRef.current === startedSessionKey) {
          setReporting(false);
        }
      }
    }
  }

  return {
    cancelReport,
    pendingReportPostId,
    reporting,
    requestReport,
    submitReport,
  };
}
