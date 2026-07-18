import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { FeedbackMessage } from "../types";
import { useCommunityReportActions } from "./useCommunityReportActions";

function renderHarness({
  currentUserId = "user-a" as string | null,
  reportPost = jest.fn<any>().mockResolvedValue(undefined),
  supabase = {} as any,
} = {}) {
  const feedback: Array<Omit<FeedbackMessage, "id">> = [];
  let latest!: ReturnType<typeof useCommunityReportActions>;
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = useCommunityReportActions(
      {
        currentUserId,
        pushFeedback: (message) => feedback.push(message),
        sessionKey: currentUserId ? `user:${currentUserId}` : "signed-out",
        supabase,
      },
      { reportPost },
    );
    return null;
  }

  act(() => {
    renderer = TestRenderer.create(<Probe />);
  });

  return {
    feedback,
    get latest() {
      return latest;
    },
    renderer,
    reportPost,
  };
}

describe("useCommunityReportActions", () => {
  it("requires an authenticated remote account before opening a report", () => {
    const harness = renderHarness({ currentUserId: null });

    act(() => harness.latest.requestReport("post-1"));

    expect(harness.latest.pendingReportPostId).toBeNull();
    expect(harness.reportPost).not.toHaveBeenCalled();
    expect(harness.feedback).toEqual([
      expect.objectContaining({
        tone: "info",
        title: "Sign in to report discussions",
      }),
    ]);
    harness.renderer.unmount();
  });

  it("submits a private normalized report and closes the dialog", async () => {
    const harness = renderHarness();
    act(() => harness.latest.requestReport("post-1"));

    await act(async () => {
      await harness.latest.submitReport(
        "misleading_financial_claim",
        "  No source supports the return claim.  ",
      );
    });

    expect(harness.reportPost).toHaveBeenCalledWith(
      expect.anything(),
      {
        postId: "post-1",
        reason: "misleading_financial_claim",
        details: "No source supports the return claim.",
        expectedUserId: "user-a",
      },
    );
    expect(harness.latest.pendingReportPostId).toBeNull();
    expect(harness.feedback).toEqual([
      expect.objectContaining({
        tone: "success",
        title: "Report sent for review",
      }),
    ]);
    harness.renderer.unmount();
  });

  it("keeps the dialog open when submission fails", async () => {
    const harness = renderHarness({
      reportPost: jest.fn<any>().mockRejectedValue(new Error("raw details")),
    });
    act(() => harness.latest.requestReport("post-1"));

    await act(async () => {
      await harness.latest.submitReport("spam_or_scam", "");
    });

    expect(harness.latest.pendingReportPostId).toBe("post-1");
    expect(harness.latest.reporting).toBe(false);
    expect(harness.feedback).toEqual([
      {
        tone: "error",
        title: "Report was not sent",
        message: "Could not submit this report. Please try again.",
      },
    ]);
    harness.renderer.unmount();
  });
});
