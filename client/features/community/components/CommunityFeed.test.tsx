import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
    loadError: null as string | null,
    loading: false,
    onAddComment: jest.fn<any>(),
    onDeleteComment: jest.fn<any>(),
    onDeletePost: jest.fn<any>(),
    onToggleLike: jest.fn<any>(),
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
});
