// File purpose: Verifies that Community comments never render untrusted remote attachments.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommentList } from "./CommentList";
import type { CommentUI } from "../types";

function renderComment(comment: Partial<CommentUI>) {
  return renderToStaticMarkup(
    <CommentList
      items={[
        {
          id: "comment-1",
          user: "Member",
          text: "A comment",
          createdAt: "2026-07-24T00:00:00.000Z",
          ...comment,
        },
      ]}
    />,
  );
}

describe("CommentList image trust boundary", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET = "comment-images";
  });

  it("does not render a persisted external tracker", () => {
    const html = renderComment({
      fromDB: true,
      imageUrl: "https://tracker.example/pixel.png",
    });

    expect(html).not.toContain("<img");
    expect(html).not.toContain("tracker.example");
  });

  it("renders the canonical URL derived from a valid comment image path", () => {
    const html = renderComment({
      fromDB: true,
      imagePath: "comments/post-1/chart.png",
      imageUrl: "https://tracker.example/pixel.png",
    });

    expect(html).toContain(
      'src="https://project.supabase.co/storage/v1/object/public/comment-images/comments/post-1/chart.png"',
    );
    expect(html).not.toContain("tracker.example");
  });
});
