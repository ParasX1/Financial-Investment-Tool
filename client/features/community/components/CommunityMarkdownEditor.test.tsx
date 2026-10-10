// File purpose: Tests the Reddit-like Community Markdown writing and preview experience.
import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { MAX_COMMUNITY_POST_BODY_CHARS } from "../constants";
import { CommunityMarkdownEditor } from "./CommunityMarkdownEditor";

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof CommunityMarkdownEditor>> = {},
) {
  const onChange = jest.fn();
  const onImageChange = jest.fn();
  const renderer = TestRenderer.create(
    <CommunityMarkdownEditor
      canAttachImage={false}
      disabled={false}
      imageFile={null}
      imagePreviewUrl={null}
      onChange={onChange}
      onImageChange={onImageChange}
      value="**Conviction** needs evidence."
      {...overrides}
    />,
  );

  return { onChange, onImageChange, renderer };
}

describe("CommunityMarkdownEditor", () => {
  it("switches between Write and a shared rendered Preview", () => {
    const { renderer } = renderEditor();
    const modeGroup = renderer.root.findByProps({
      "aria-label": "Writing mode",
    });
    const previewButton = modeGroup
      .findAllByType("button")
      .find((button) => button.children.join("") === "Preview");

    expect(previewButton).toBeTruthy();
    act(() => previewButton!.props.onClick());

    expect(previewButton!.props["aria-pressed"]).toBe(true);
    expect(renderer.root.findAllByType("textarea")).toHaveLength(0);
    expect(
      renderer.root.findByProps({ "aria-label": "Markdown preview" }),
    ).toBeTruthy();
    expect(renderer.root.findByType("strong").children).toEqual(["Conviction"]);
  });

  it("supports familiar keyboard shortcuts without submitting the form", () => {
    const { onChange, renderer } = renderEditor({ value: "" });
    const textarea = renderer.root.findByType("textarea");
    const preventDefault = jest.fn();

    act(() =>
      textarea.props.onKeyDown({
        key: "b",
        ctrlKey: true,
        metaKey: false,
        preventDefault,
      }),
    );

    expect(preventDefault).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("**bold text**");
  });

  it("shows the raw Markdown storage limit and an empty preview state", () => {
    const { renderer } = renderEditor({ value: "" });
    const counter = renderer.root.findByProps({
      "aria-label": "Post body character count",
    });

    expect(counter.children.join("")).toBe(
      `0/${MAX_COMMUNITY_POST_BODY_CHARS.toLocaleString("en-US")}`,
    );

    const previewButton = renderer.root
      .findByProps({ "aria-label": "Writing mode" })
      .findAllByType("button")
      .find((button) => button.children.join("") === "Preview");
    act(() => previewButton!.props.onClick());
    expect(
      renderer.root.findByProps({ children: "Nothing to preview yet." }),
    ).toBeTruthy();
  });

  it.each([0, 1])(
    "handles Enter in link field %s without submitting the post form",
    (inputIndex) => {
      const { onChange, renderer } = renderEditor({ value: "evidence" });
      const toolbarLink = renderer.root.findByProps({
        "aria-label": "Insert link",
      });

      act(() => toolbarLink.props.onClick());

      const inputs = renderer.root
        .findByProps({ id: "community-link-panel" })
        .findAllByType("input");
      const preventDefault = jest.fn();

      act(() => {
        inputs[0].props.onChange({ target: { value: "Source" } });
        inputs[1].props.onChange({
          target: { value: "https://example.com" },
        });
      });
      act(() =>
        inputs[inputIndex].props.onKeyDown({
          key: "Enter",
          preventDefault,
        }),
      );

      expect(preventDefault).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(
        "evidence[Source](https://example.com/)",
      );
    },
  );

  it.each([0, 1])(
    "closes the link panel with Escape in field %s",
    (inputIndex) => {
      const { renderer } = renderEditor({ value: "evidence" });
      act(() =>
        renderer.root
          .findByProps({ "aria-label": "Insert link" })
          .props.onClick(),
      );

      const inputs = renderer.root
        .findByProps({ id: "community-link-panel" })
        .findAllByType("input");
      const preventDefault = jest.fn();
      act(() =>
        inputs[inputIndex].props.onKeyDown({
          key: "Escape",
          preventDefault,
        }),
      );

      expect(preventDefault).toHaveBeenCalled();
      expect(() =>
        renderer.root.findByProps({ id: "community-link-panel" }),
      ).toThrow();
    },
  );
});
