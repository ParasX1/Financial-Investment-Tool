import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import { PostEngagementBar } from "./PostEngagementBar";

type EngagementProps = React.ComponentProps<typeof PostEngagementBar>;

function engagementProps(
  overrides: Partial<EngagementProps> = {},
): EngagementProps {
  return {
    commentsId: "comments-post-1",
    commentLabel: "2 comments",
    formattedCommentCount: "2",
    postId: "post-1",
    postTitle: "NVDA earnings review",
    formattedVotes: "1",
    voteLabel: "1 vote",
    commentsOpen: false,
    liked: false,
    likeBusy: false,
    saved: false,
    saveBusy: false,
    onToggleComments: jest.fn(),
    onToggleLike: jest.fn<any>(),
    onToggleSave: jest.fn<any>(),
    ...overrides,
  };
}

function renderBar(overrides: Partial<EngagementProps> = {}) {
  let renderer!: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      <PostEngagementBar {...engagementProps(overrides)} />,
    );
  });

  return renderer;
}

describe("PostEngagementBar", () => {
  it("groups comments, likes, and saves into one compact engagement control", () => {
    const renderer = renderBar();
    const group = renderer.root.findByProps({ role: "group" });
    const buttons = group.findAllByType("button");

    expect(group.props["aria-label"]).toBe("Discussion engagement");
    expect(buttons).toHaveLength(3);
    expect(buttons[0].props.title).toBe("2 comments");
    expect(buttons[0].findByType("span").children).toEqual(["2"]);
    expect(buttons[1].props["aria-label"]).toBe("Like post. 1 vote");
    expect(buttons[2].props["aria-label"]).toBe("Save discussion");
    expect(
      renderer.root.findAll(
        (node) => node.props["aria-label"] === "Report discussion",
      ),
    ).toHaveLength(0);
  });

  it("keeps pressed and busy action states accessible", () => {
    const renderer = renderBar({
      commentLabel: "1 comment",
      formattedCommentCount: "1",
      formattedVotes: "18",
      voteLabel: "18 votes",
      commentsOpen: true,
      liked: true,
      likeBusy: true,
      saved: true,
      saveBusy: true,
    });
    const buttons = renderer.root.findAllByType("button");

    expect(buttons[0].props["aria-expanded"]).toBe(true);
    expect(buttons[1].props["aria-pressed"]).toBe(true);
    expect(buttons[1].props.disabled).toBe(true);
    expect(buttons[1].props["aria-label"]).toBe("Unlike post. 18 votes");
    expect(buttons[2].props["aria-pressed"]).toBe(true);
    expect(buttons[2].props.disabled).toBe(true);
    expect(buttons[2].props["aria-label"]).toBe("Remove saved discussion");
  });

  it("forwards each frequent action to its focused handler", () => {
    const onToggleComments = jest.fn();
    const onToggleLike = jest.fn<any>();
    const onToggleSave = jest.fn<any>();
    const renderer = renderBar({
      onToggleComments,
      onToggleLike,
      onToggleSave,
    });
    const buttons = renderer.root.findAllByType("button");

    act(() => {
      buttons.forEach((button) => button.props.onClick());
    });

    expect(onToggleComments).toHaveBeenCalledTimes(1);
    expect(onToggleLike).toHaveBeenCalledWith("post-1");
    expect(onToggleSave).toHaveBeenCalledWith("post-1");
  });
});
