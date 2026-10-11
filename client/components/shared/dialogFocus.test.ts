import { wrapDialogTabBoundary } from "./dialogFocus";

function control(
  id: string,
  {
    tabIndex = 0,
    disabled = false,
    visible = true,
    details = null,
  }: {
    tabIndex?: number;
    disabled?: boolean;
    visible?: boolean;
    details?: HTMLDetailsElement | null;
  } = {},
) {
  return {
    id,
    tabIndex,
    matches: () => disabled,
    getClientRects: () => (visible ? [{}] : []),
    closest: () => details,
    focus: jest.fn(),
  } as unknown as HTMLElement;
}

function closedDetails(
  summaryControls: HTMLElement[],
  parent: HTMLDetailsElement | null = null,
) {
  return {
    querySelector: () => ({
      contains: (node: HTMLElement) => summaryControls.includes(node),
    }),
    parentElement: parent ? { closest: () => parent } : null,
  } as unknown as HTMLDetailsElement;
}

function keyboardEvent(controls: HTMLElement[], activeElement: Element | null) {
  const document = { activeElement };
  const container = {
    ownerDocument: document,
    querySelectorAll: jest.fn(() => controls),
  } as unknown as HTMLElement;
  const event = {
    key: "Tab",
    defaultPrevented: false,
    shiftKey: false,
    target: activeElement,
    currentTarget: container,
    preventDefault: jest.fn(),
  } as Parameters<typeof wrapDialogTabBoundary>[0];
  return { container, document, event };
}

describe("wrapDialogTabBoundary", () => {
  // These fixtures characterize DOM decisions. Installed Modal behavior and
  // real keyboard focus are exercised by Auth and Observation Chromium tests.
  it.each([false, true])("wraps the visible edge with Shift=%s", (shiftKey) => {
    const close = control("close-auth");
    const email = control("auth-email");
    const google = control("google-sign-in");
    const active = shiftKey ? close : google;
    const destination = shiftKey ? google : close;
    const { event } = keyboardEvent([close, email, google], active);

    wrapDialogTabBoundary({ ...event, shiftKey });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(destination.focus).toHaveBeenCalledTimes(1);
    expect(email.focus).not.toHaveBeenCalled();
    expect(active.focus).not.toHaveBeenCalled();
  });

  it("leaves intermediate controls and non-Tab keys to native behavior", () => {
    const close = control("close-auth");
    const email = control("auth-email");
    const google = control("google-sign-in");
    const { event } = keyboardEvent([close, email, google], email);

    wrapDialogTabBoundary(event);
    wrapDialogTabBoundary({ ...event, shiftKey: true });
    wrapDialogTabBoundary({ ...event, key: "Escape" });
    wrapDialogTabBoundary({ ...event, key: "ArrowRight" });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(close.focus).not.toHaveBeenCalled();
    expect(google.focus).not.toHaveBeenCalled();
  });

  it("respects an already handled event, including container focus", () => {
    const close = control("close-auth");
    const { container, event } = keyboardEvent([close], close);

    wrapDialogTabBoundary(
      { ...event, target: container, defaultPrevented: true },
      { focusFromContainer: true },
    );

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(close.focus).not.toHaveBeenCalled();
    expect(container.querySelectorAll).not.toHaveBeenCalled();
  });

  it("excludes disabled, hidden and negative-tabindex controls at both edges", () => {
    const disabled = control("disabled-submit", { disabled: true });
    const close = control("close-auth");
    const google = control("google-sign-in");
    const hiddenResize = control("mobile-resize", { visible: false });
    const nonTabbable = control("inactive-control", { tabIndex: -1 });
    const { document, event } = keyboardEvent(
      [disabled, close, google, hiddenResize, nonTabbable],
      google,
    );

    wrapDialogTabBoundary(event);
    document.activeElement = close;
    wrapDialogTabBoundary({ ...event, shiftKey: true });

    expect(close.focus).toHaveBeenCalledTimes(1);
    expect(google.focus).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    for (const excluded of [disabled, hiddenResize, nonTabbable]) {
      expect(excluded.focus).not.toHaveBeenCalled();
    }
  });

  it("keeps a closed-details summary, excluding its positive-rectangle input", () => {
    const first = control("auto-arrange");
    const summary = control("assumptions-summary");
    const details = closedDetails([summary]);
    Object.defineProperty(summary, "closest", { value: () => details });
    const date = control("closed-from-date", { details });
    const { document, event } = keyboardEvent([first, summary, date], first);

    wrapDialogTabBoundary({ ...event, shiftKey: true });
    document.activeElement = summary;
    wrapDialogTabBoundary(event);

    expect(summary.focus).toHaveBeenCalledTimes(1);
    expect(first.focus).toHaveBeenCalledTimes(1);
    expect(date.focus).not.toHaveBeenCalled();
  });

  it("excludes an inner summary when an enclosing closed details hides it", () => {
    const first = control("auto-arrange");
    const outerSummary = control("outer-summary");
    const outer = closedDetails([outerSummary]);
    Object.defineProperty(outerSummary, "closest", { value: () => outer });
    const innerSummary = control("inner-summary");
    const inner = closedDetails([innerSummary], outer);
    Object.defineProperty(innerSummary, "closest", { value: () => inner });
    const nestedInput = control("nested-date", { details: inner });
    const { event } = keyboardEvent(
      [first, outerSummary, innerSummary, nestedInput],
      first,
    );

    wrapDialogTabBoundary({ ...event, shiftKey: true });

    expect(outerSummary.focus).toHaveBeenCalledTimes(1);
    expect(innerSummary.focus).not.toHaveBeenCalled();
    expect(nestedInput.focus).not.toHaveBeenCalled();
  });

  it("uses the focused control even when the original event target differs", () => {
    const first = control("auto-arrange");
    const last = control("resize-window");
    const { event } = keyboardEvent([first, last], last);

    wrapDialogTabBoundary({ ...event, target: first });

    expect(first.focus).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    "redirects Observation container focus with Shift=%s after MUI capture",
    (shiftKey) => {
      const first = control("auto-arrange");
      const last = control("resize-window");
      const sentinel = control("mui-sentinel");
      const { container, event } = keyboardEvent([first, last], sentinel);

      wrapDialogTabBoundary(
        { ...event, target: container, shiftKey },
        { focusFromContainer: true },
      );

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect((shiftKey ? last : first).focus).toHaveBeenCalledTimes(1);
    },
  );

  it("leaves container focus alone unless the caller opts in", () => {
    const first = control("close-auth");
    const { container, document, event } = keyboardEvent([first], null);
    document.activeElement = container;

    wrapDialogTabBoundary({ ...event, target: container });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(first.focus).not.toHaveBeenCalled();
  });

  it.each([
    { controls: [] },
    { controls: [control("pending-submit", { disabled: true })] },
  ])(
    "leaves an empty enabled-control boundary to Modal enforcement",
    ({ controls }) => {
      const { event } = keyboardEvent(controls, null);

      wrapDialogTabBoundary(event);
      wrapDialogTabBoundary({ ...event, shiftKey: true });

      expect(event.preventDefault).not.toHaveBeenCalled();
    },
  );

  it("retains Observation container Tab suppression when every control is disabled", () => {
    const submit = control("pending-submit", { disabled: true });
    const { container, document, event } = keyboardEvent([submit], null);
    document.activeElement = container;

    wrapDialogTabBoundary(
      { ...event, target: container },
      { focusFromContainer: true },
    );

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(submit.focus).not.toHaveBeenCalled();
  });
});
