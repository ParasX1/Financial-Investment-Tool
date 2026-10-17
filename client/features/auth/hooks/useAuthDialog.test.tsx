import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useAuthDialog } from "./useAuthDialog";

function renderHook() {
  let latest!: ReturnType<typeof useAuthDialog>;
  function Probe() {
    latest = useAuthDialog();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<Probe />); });
  return { get latest() { return latest; }, renderer };
}

describe("useAuthDialog", () => {
  it("preserves the requested destination for sign-in", () => {
    const harness = renderHook();
    act(() => harness.latest.openSignIn("/MarketNews"));
    expect(harness.latest.dialogProps).toEqual({
      initialMode: "sign-in",
      redirectTo: "/MarketNews",
      show: true,
    });
    act(() => harness.latest.close());
    expect(harness.latest.dialogProps.show).toBe(false);
    act(() => harness.renderer.unmount());
  });

  it("opens directly in create-account mode", () => {
    const harness = renderHook();
    act(() => harness.latest.openSignUp("/Watchlist"));
    expect(harness.latest.dialogProps).toMatchObject({
      initialMode: "sign-up",
      redirectTo: "/Watchlist",
      show: true,
    });
    act(() => harness.renderer.unmount());
  });
});
