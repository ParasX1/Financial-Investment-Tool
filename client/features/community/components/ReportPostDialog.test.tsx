import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { ReportPostDialog } from "./ReportPostDialog";

describe("ReportPostDialog", () => {
  it("explains privacy and constrains the moderation input", () => {
    const html = renderToStaticMarkup(
      <ReportPostDialog
        postId="post-1"
        busy={false}
        onCancel={jest.fn()}
        onSubmit={jest.fn<any>()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Report this discussion");
    expect(html).toContain("Only moderators can review the report");
    expect(html).toContain("Misleading financial claim");
    expect(html).toContain('maxLength="500"');
  });

  it("renders nothing until a report is requested", () => {
    expect(
      renderToStaticMarkup(
        <ReportPostDialog
          postId={null}
          busy={false}
          onCancel={jest.fn()}
          onSubmit={jest.fn<any>()}
        />,
      ),
    ).toBe("");
  });

  it("collects a reason and details while supporting cancel and Escape", () => {
    const onCancel = jest.fn();
    const onSubmit = jest.fn<any>();
    const focus = jest.fn();
    const firstFocusable = { focus: jest.fn() };
    const lastFocusable = { focus: jest.fn() };
    const dialogNode = {
      focus: jest.fn(),
      querySelectorAll: () => [firstFocusable, lastFocusable],
    };
    const documentMock = {
      activeElement: { focus },
      body: { style: { overflow: "" } },
    };
    const previousDocument = global.document;
    Object.defineProperty(global, "document", {
      configurable: true,
      value: documentMock,
    });
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ReportPostDialog
          postId="post-1"
          busy={false}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />,
        {
          createNodeMock: (element) =>
            element.type === "div" ? dialogNode : { focus: jest.fn() },
        },
      );
    });

    act(() => {
      renderer.root.findByType("select").props.onChange({
        target: { value: "spam_or_scam" },
      });
      renderer.root.findByType("textarea").props.onChange({
        target: { value: "Suspicious link" },
      });
    });
    act(() => {
      renderer.root.findByType("form").props.onSubmit({
        preventDefault: jest.fn(),
      });
    });

    expect(onSubmit).toHaveBeenCalledWith(
      "spam_or_scam",
      "Suspicious link",
    );

    const cancelButton = renderer.root
      .findAllByType("button")
      .find((button) => button.props.type === "button")!;
    act(() => cancelButton.props.onClick());
    const overlay = renderer.root.find(
      (node) => node.type === "div" && node.props.role === "presentation",
    );
    act(() => overlay.props.onKeyDown({ key: "Escape" }));
    expect(onCancel).toHaveBeenCalledTimes(2);

    const preventBackwardWrap = jest.fn();
    documentMock.activeElement = firstFocusable;
    act(() =>
      overlay.props.onKeyDown({
        key: "Tab",
        shiftKey: true,
        preventDefault: preventBackwardWrap,
      }),
    );
    expect(preventBackwardWrap).toHaveBeenCalled();
    expect(lastFocusable.focus).toHaveBeenCalled();

    const preventForwardWrap = jest.fn();
    documentMock.activeElement = lastFocusable;
    act(() =>
      overlay.props.onKeyDown({
        key: "Tab",
        shiftKey: false,
        preventDefault: preventForwardWrap,
      }),
    );
    expect(preventForwardWrap).toHaveBeenCalled();
    expect(firstFocusable.focus).toHaveBeenCalled();

    act(() => renderer.unmount());
    expect(focus).toHaveBeenCalled();
    Object.defineProperty(global, "document", {
      configurable: true,
      value: previousDocument,
    });
  });
});
