import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, jest } from "@jest/globals";
import type { PostUI } from "../types";
import { PostCard } from "./PostCard";

function post(overrides: Partial<PostUI> = {}): PostUI {
  return {
    id: "post-1",
    user: "Member",
    initials: "ME",
    title: "NVDA earnings review",
    body: "Using the latest filing for context.",
    votes: 4,
    time: "now",
    sortTime: Date.now(),
    tags: ["$NVDA", "Earnings"],
    postType: "analysis",
    symbol: "NVDA",
    sourceUrl: "https://www.sec.gov/Archives/example",
    commentCount: 0,
    avatarGradient: "linear-gradient(#000, #111)",
    fromDB: true,
    authorId: "user-a",
    ...overrides,
  };
}

describe("PostCard", () => {
  it("renders neutral research context without inferred horizon or evidence labels", () => {
    const html = renderToStaticMarkup(
      <PostCard
        post={post()}
        comments={[]}
        count={0}
        liked={false}
        likeBusy={false}
        saved={false}
        saveBusy={false}
        canDeletePost={false}
        canDeleteComment={() => false}
        canAttachCommentImage={true}
        onAddComment={jest.fn<any>()}
        onDeleteComment={jest.fn<any>()}
        onToggleLike={jest.fn<any>()}
        onToggleSave={jest.fn<any>()}
        onReport={jest.fn<any>()}
      />,
    );

    expect(html).toContain("Post type");
    expect(html).toContain("Analysis");
    expect(html).toContain("sec.gov");
    expect(html).toContain("Open source");
    expect(html).toContain('href="https://www.sec.gov/Archives/example"');
    expect(html).toContain("/MarketNews?quote=NVDA");
    expect(html).not.toContain(">Signals<");
    expect(html).not.toContain(">Horizon<");
    expect(html).not.toContain(">Evidence<");
    expect(html).toContain("Save discussion");
    expect(html).toContain("Report discussion");
  });
});
