import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { DiscussionDraft } from "../types";
import { useCommunityDraftNavigation } from "./useCommunityDraftNavigation";

function createDraft(title = ""): DiscussionDraft {
  return {
    title,
    body: "",
    tags: [],
    imageFile: null,
    imagePreviewUrl: null,
  };
}

async function renderHarness(initialDraft: DiscussionDraft) {
  const feedback: Array<{ title: string }> = [];
  const listeners = new Map<string, EventListener>();
  const originalWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window: unknown }).window = {
    addEventListener: jest.fn((name: string, listener: EventListener) => {
      listeners.set(name, listener);
    }),
    removeEventListener: jest.fn((name: string) => {
      listeners.delete(name);
    }),
  };
  let popHandler: () => boolean = () => true;
  const router = {
    beforePopState: jest.fn((handler: () => boolean) => {
      popHandler = handler;
    }),
  } as any;
  let draft = initialDraft;
  let latest: ReturnType<typeof useCommunityDraftNavigation> | null = null;
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = useCommunityDraftNavigation({
      draft,
      pushFeedback: (message) => feedback.push(message),
      router,
    });
    return null;
  }

  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
  });

  return {
    feedback,
    listeners,
    get latest() {
      return latest!;
    },
    get popHandler() {
      return popHandler;
    },
    renderer,
    restoreWindow() {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = originalWindow;
      }
    },
    async updateDraft(nextDraft: DiscussionDraft) {
      draft = nextDraft;
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
  };
}

describe("useCommunityDraftNavigation", () => {
  it("requires a second matching action before abandoning a dirty draft", async () => {
    const harness = await renderHarness(createDraft("Unsaved idea"));
    const navigate = jest.fn();

    act(() => harness.latest.navigateWithDraftGuard("back", navigate));
    expect(navigate).not.toHaveBeenCalled();
    expect(harness.feedback).toHaveLength(1);

    act(() => harness.latest.navigateWithDraftGuard("back", navigate));
    expect(navigate).toHaveBeenCalledTimes(1);
    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });

  it("resets an old confirmation when the draft is edited", async () => {
    const harness = await renderHarness(createDraft("First version"));
    const navigate = jest.fn();

    act(() => harness.latest.navigateWithDraftGuard("back", navigate));
    await harness.updateDraft(createDraft("Second version"));
    act(() => harness.latest.navigateWithDraftGuard("back", navigate));

    expect(navigate).not.toHaveBeenCalled();
    expect(harness.feedback).toHaveLength(2);
    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });

  it("allows clean drafts to leave immediately", async () => {
    const harness = await renderHarness(createDraft());
    const navigate = jest.fn();

    act(() => harness.latest.navigateWithDraftGuard("back", navigate));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(harness.feedback).toEqual([]);
    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });

  it("guards browser Back twice before abandoning a dirty draft", async () => {
    const harness = await renderHarness(createDraft("Unsaved idea"));

    expect(harness.popHandler()).toBe(false);
    expect(harness.feedback).toHaveLength(1);
    expect(harness.popHandler()).toBe(true);

    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });

  it("lets browser Back pass immediately for a clean draft", async () => {
    const harness = await renderHarness(createDraft());

    expect(harness.popHandler()).toBe(true);
    expect(harness.feedback).toEqual([]);

    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });

  it("registers and removes the refresh guard only while the draft is dirty", async () => {
    const harness = await renderHarness(createDraft("Unsaved idea"));
    const preventDefault = jest.fn();
    const beforeUnload = harness.listeners.get("beforeunload");

    expect(beforeUnload).toBeDefined();
    beforeUnload?.({ preventDefault, returnValue: undefined } as unknown as Event);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    await harness.updateDraft(createDraft());
    expect(harness.listeners.has("beforeunload")).toBe(false);

    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });

  it("requires a fresh confirmation when the user chooses another exit", async () => {
    const harness = await renderHarness(createDraft("Unsaved idea"));
    const navigateBack = jest.fn();
    const navigateTopic = jest.fn();

    act(() => harness.latest.navigateWithDraftGuard("back", navigateBack));
    act(() => harness.latest.navigateWithDraftGuard("topic:top", navigateTopic));

    expect(navigateBack).not.toHaveBeenCalled();
    expect(navigateTopic).not.toHaveBeenCalled();
    expect(harness.feedback).toHaveLength(2);

    act(() => harness.renderer.unmount());
    harness.restoreWindow();
  });
});
