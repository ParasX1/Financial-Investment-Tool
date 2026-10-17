import * as React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { useCommunityOwnedDraft } from "./useCommunityOwnedDraft";

async function renderHarness(initialSessionKey: string) {
  let sessionKey = initialSessionKey;
  let latest: ReturnType<typeof useCommunityOwnedDraft> | null = null;
  const renders: Array<{ owner: string; title: string }> = [];
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = useCommunityOwnedDraft(sessionKey);
    renders.push({ owner: sessionKey, title: latest.draft.title });
    return null;
  }

  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
  });

  return {
    get latest() {
      return latest!;
    },
    renders,
    renderer,
    async updateSession(nextSessionKey: string) {
      sessionKey = nextSessionKey;
      await act(async () => {
        renderer.update(<Probe />);
      });
    },
    updateSessionBeforeEffects(
      nextSessionKey: string,
      edit: (draft: ReturnType<typeof useCommunityOwnedDraft>) => void,
    ) {
      sessionKey = nextSessionKey;
      act(() => {
        renderer.update(<Probe />);
        edit(latest!);
      });
    },
  };
}

describe("useCommunityOwnedDraft", () => {
  it("synchronously masks account A's draft from account B", async () => {
    const harness = await renderHarness("user:user-a");
    await act(async () => {
      harness.latest.setDraftField("title", "A private draft");
    });
    const renderCountBeforeSwitch = harness.renders.length;

    await harness.updateSession("user:user-b");

    const accountBRenders = harness.renders.slice(renderCountBeforeSwitch);
    expect(accountBRenders.length).toBeGreaterThan(0);
    expect(accountBRenders.every((render) => render.title === "")).toBe(true);
    expect(harness.latest.draft.title).toBe("");
    harness.renderer.unmount();
  });

  it("transfers a signed-out draft to the user who signs in", async () => {
    const harness = await renderHarness("signed-out");
    await act(async () => {
      harness.latest.setDraftField("title", "Keep this after sign in");
    });

    await harness.updateSession("user:user-a");

    expect(harness.latest.draft.title).toBe("Keep this after sign in");
    harness.renderer.unmount();
  });

  it("transfers a draft started while authentication is loading", async () => {
    const harness = await renderHarness("auth-loading");
    await act(async () => {
      harness.latest.setDraftField("body", "Keep this while the session resolves");
    });

    await harness.updateSession("user:user-a");

    expect(harness.latest.draft.body).toBe(
      "Keep this while the session resolves",
    );
    harness.renderer.unmount();
  });

  it("does not expose an account draft while auth is unsettled", async () => {
    const harness = await renderHarness("user:user-a");
    await act(async () => {
      harness.latest.setDraftField("title", "A private draft");
    });
    const renderCountBeforeSwitch = harness.renders.length;

    await harness.updateSession("auth-loading");

    const loadingRenders = harness.renders.slice(renderCountBeforeSwitch);
    expect(loadingRenders.every((render) => render.title === "")).toBe(true);
    harness.renderer.unmount();
  });

  it("ignores draft commands during an account ownership transition", async () => {
    const harness = await renderHarness("user:user-a");
    await act(async () => {
      harness.latest.setDraftField("title", "A private draft");
    });

    harness.updateSessionBeforeEffects("user:user-b", (draft) => {
      draft.setDraftField("title", "Must not reach B");
      draft.toggleDraftTag("Risk");
      draft.clearDraftTags();
      draft.setDraftImage(null);
      draft.resetDraft();
    });

    expect(harness.latest.draft).toMatchObject({
      title: "",
      body: "",
      tags: [],
      imageFile: null,
      imagePreviewUrl: null,
    });
    harness.renderer.unmount();
  });

  it("lets the current owner manage tags and reset their draft", async () => {
    const harness = await renderHarness("user:user-a");

    await act(async () => {
      harness.latest.setDraftField("title", "Risk review");
      harness.latest.toggleDraftTag("Education");
    });
    expect(harness.latest.draft.tags).toContain("Education");

    await act(async () => {
      harness.latest.clearDraftTags();
      harness.latest.setDraftImage(null);
    });
    expect(harness.latest.draft.tags).toEqual([]);

    await act(async () => {
      harness.latest.resetDraft();
    });
    expect(harness.latest.draft.title).toBe("");
    harness.renderer.unmount();
  });
});
