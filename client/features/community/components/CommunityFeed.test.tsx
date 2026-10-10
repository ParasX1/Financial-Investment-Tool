import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import { createCommentsState } from "../state/commentsReducer";
import type { PostUI } from "../types";
import { CommunityFeed } from "./CommunityFeed";

jest.mock("./PostCard", () => ({
  PostCard: ({ post }: { post: PostUI }) => <article>{post.title}</article>,
}));

function post(): PostUI {
  return {
    id: "post-1",
    user: "Member",
    initials: "ME",
    title: "A useful live discussion",
    body: "Research notes",
    votes: 4,
    time: "now",
    sortTime: Date.now(),
    tags: [],
    commentCount: 0,
    avatarGradient: "linear-gradient(#000, #111)",
    fromDB: true,
    authorId: "user-a",
  };
}

function props(posts: PostUI[] = []) {
  return {
    canAttachCommentImage: true,
    canDeleteComment: jest.fn(() => false),
    canDeletePost: jest.fn(() => false),
    commentsState: createCommentsState(posts),
    hasLoadedPosts: posts.length > 0,
    likedPostIds: new Set<string>(),
    likingPostIds: new Set<string>(),
    savedPostIds: new Set<string>(),
    savingPostIds: new Set<string>(),
    loadError: null as string | null,
    loading: false,
    onRetry: jest.fn(),
    onAddComment: jest.fn<any>(),
    onDeleteComment: jest.fn<any>(),
    onDeletePost: jest.fn<any>(),
    onToggleLike: jest.fn<any>(),
    onToggleSave: jest.fn<any>(),
    onReport: jest.fn<any>(),
    posts,
    query: "",
    view: "top" as const,
  };
}

describe("CommunityFeed", () => {
  it("renders explicit loading, partial-error, and search-empty states", () => {
    const loadingHtml = renderToStaticMarkup(
      <CommunityFeed {...props()} loading />,
    );
    expect(loadingHtml).toContain('aria-busy="true"');
    expect(loadingHtml).toContain("Loading latest discussions");

    const livePost = post();
    const partialHtml = renderToStaticMarkup(
      <CommunityFeed
        {...props([livePost])}
        loadError="Comments could not be refreshed."
      />,
    );
    expect(partialHtml).toContain("Community data did not fully load");
    expect(partialHtml).toContain("Comments could not be refreshed.");
    expect(partialHtml).toContain(livePost.title);
    expect(partialHtml).toContain("Try again");

    const emptyHtml = renderToStaticMarkup(
      <CommunityFeed {...props()} query="banks" />,
    );
    expect(emptyHtml).toContain("No discussions match your search.");

    const unavailableHtml = renderToStaticMarkup(
      <CommunityFeed
        {...props()}
        loadError="Could not load latest community posts."
      />,
    );
    expect(unavailableHtml).toContain("Community is unavailable");
    expect(unavailableHtml).toContain("Try again");
    expect(unavailableHtml).not.toContain("No discussions yet.");
    expect(unavailableHtml).not.toContain(
      "Start a discussion to create the first community post.",
    );

    const filteredPartialHtml = renderToStaticMarkup(
      <CommunityFeed
        {...props()}
        hasLoadedPosts
        loadError="Comments could not be refreshed."
        query="banks"
      />,
    );
    expect(filteredPartialHtml).toContain("Community data did not fully load");
    expect(filteredPartialHtml).toContain("No discussions match your search.");
    expect(filteredPartialHtml).not.toContain("Community is unavailable");
  });

  it("offers an accessible partial retry and retains posts while the retry is busy", () => {
    const input = props();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <CommunityFeed
          {...input}
          hasLoadedPosts
          loadError="Comments unavailable."
        />,
      );
    });
    const retry = renderer.root.findByType("button");
    act(() => {
      retry.props.onClick();
    });
    expect(input.onRetry).toHaveBeenCalledTimes(1);
    act(() => {
      renderer.update(
        <CommunityFeed
          {...input}
          hasLoadedPosts
          loadError="Comments unavailable."
          retrying
        />,
      );
    });
    expect(renderer.root.findByType("button").props.disabled).toBe(true);
    expect(renderer.root.findByType("button").children).toEqual(["Retrying…"]);
    expect(renderer.root.findByType("section").props["aria-busy"]).toBe(true);
    renderer.unmount();
    const busyHtml = renderToStaticMarkup(
      <CommunityFeed
        {...props([post()])}
        loadError="Comments unavailable."
        retrying
      />,
    );
    expect(busyHtml).toContain(post().title);
    expect(busyHtml).toContain("Retrying…");
    expect(busyHtml).not.toContain("Loading latest discussions");
  });

  it.each(["saved", "liked", "commented"] as const)(
    "does not claim the %s view is empty when associated state is unknown",
    (view) => {
      const html = renderToStaticMarkup(
        <CommunityFeed
          {...props()}
          hasLoadedPosts
          view={view}
          loadError="Associated data unavailable."
          commentsReady={false}
          likesReady={false}
          savesReady={false}
        />,
      );
      expect(html).toContain(
        "This view is unavailable until community data reloads",
      );
      expect(html).toContain("Try again");
      expect(html).not.toContain(`No ${view} discussions yet.`);
      expect(html).not.toContain("No discussions match your search.");
    },
  );
});
