// Comment length feedback and submission behavior, including Unicode boundaries.
import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { CommentForm } from "./CommentForm";

function renderForm(options: { busy?: boolean; failure?: string } = {}) {
  const onSubmit = jest.fn(async () => {});
  if (options.failure)
    onSubmit.mockRejectedValueOnce(new Error(options.failure));
  const renderer = TestRenderer.create(
    <CommentForm
      onSubmit={onSubmit}
      canAttachImage={true}
      busy={options.busy}
    />,
  );
  const changeText = (value: string) => {
    act(() =>
      renderer.root
        .findByType("textarea")
        .props.onChange({ target: { value } }),
    );
  };
  const submit = async () => {
    await act(async () => {
      await renderer.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {} });
    });
  };
  return { renderer, onSubmit, changeText, submit };
}

describe("CommentForm content limit", () => {
  afterEach(() => jest.restoreAllMocks());

  it("keeps an overlong draft visible, describes its error, and blocks submission", async () => {
    const form = renderForm();
    form.changeText("x".repeat(2001));
    const input = form.renderer.root.findByType("textarea");
    expect(input.props.value).toHaveLength(2001);
    expect(input.props.maxLength).toBe(4000);
    expect(input.props["aria-invalid"]).toBe(true);
    const error = form.renderer.root.findByProps({ role: "alert" });
    expect(error.props.children).toBe(
      "Keep the comment to 2,000 characters or fewer.",
    );
    expect(input.props["aria-describedby"]).toContain(error.props.id);
    await form.submit();
    expect(form.onSubmit).not.toHaveBeenCalled();
    form.renderer.unmount();
  });

  it("accepts 2,000 emoji without truncation and clears the error when corrected", async () => {
    const form = renderForm();
    form.changeText("😀".repeat(2001));
    expect(
      form.renderer.root.findByType("textarea").props["aria-invalid"],
    ).toBe(true);
    form.changeText("😀".repeat(2000));
    expect(
      form.renderer.root.findByType("textarea").props["aria-invalid"],
    ).toBe(false);
    expect(form.renderer.root.findAllByProps({ role: "alert" })).toHaveLength(
      0,
    );
    await form.submit();
    expect(form.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ text: "😀".repeat(2000) }),
    );
    expect(form.renderer.root.findByType("textarea").props.value).toBe("");
    form.renderer.unmount();
  });

  it("preserves the composer's empty text guard and existing whitespace trimming", async () => {
    const form = renderForm();
    form.changeText("  ");
    await form.submit();
    expect(form.onSubmit).not.toHaveBeenCalled();
    form.changeText("  Useful reply  ");
    await form.submit();
    expect(form.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Useful reply" }),
    );
    form.renderer.unmount();
  });

  it("retains an attached image and draft while length validation blocks posting", async () => {
    const createUrl = jest
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:comment-fixture");
    const revokeUrl = jest
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const form = renderForm();
    const file = new File(["image"], "chart.png", { type: "image/png" });
    act(() =>
      form.renderer.root
        .findByType("input")
        .props.onChange({ currentTarget: { files: [file] } }),
    );
    form.changeText("x".repeat(2001));
    await form.submit();
    expect(form.onSubmit).not.toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalledWith(file);
    expect(form.renderer.root.findByType("img").props.src).toBe(
      "blob:comment-fixture",
    );
    form.changeText("A useful chart");
    await form.submit();
    expect(form.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ text: "A useful chart", file }),
    );
    expect(revokeUrl).toHaveBeenCalledWith("blob:comment-fixture");
    form.renderer.unmount();
  });

  it("keeps a failed draft for correction and allows a successful retry", async () => {
    const form = renderForm({ failure: "Could not post reply." });
    form.changeText("Useful reply");
    await form.submit();
    expect(form.renderer.root.findByType("textarea").props.value).toBe(
      "Useful reply",
    );
    expect(
      form.renderer.root.findByProps({ role: "alert" }).props.children,
    ).toBe("Could not post reply.");
    form.changeText("Corrected reply");
    expect(form.renderer.root.findAllByProps({ role: "alert" })).toHaveLength(
      0,
    );
    await form.submit();
    expect(form.onSubmit).toHaveBeenCalledTimes(2);
    expect(form.renderer.root.findByType("textarea").props.value).toBe("");
    form.renderer.unmount();
  });

  it("does not submit while another reply is posting", async () => {
    const form = renderForm({ busy: true });
    form.changeText("Useful reply");
    await form.submit();
    expect(form.onSubmit).not.toHaveBeenCalled();
    expect(form.renderer.root.findByType("textarea").props.disabled).toBe(true);
    form.renderer.unmount();
  });
});
