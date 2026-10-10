// File purpose: Tests the trusted display boundary for persisted Community images.
import {
  getDisplayableCommunityCommentImageUrl,
  getDisplayableCommunityPostImageUrl,
  validateCommunityCommentImageReference,
} from "./communityImageUrls";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;

afterEach(() => {
  if (originalSupabaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  }

  if (originalBucket === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET = originalBucket;
  }
});

describe("getDisplayableCommunityPostImageUrl", () => {
  it("derives the canonical public URL from a persisted post image path", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET = "comment-images";

    expect(
      getDisplayableCommunityPostImageUrl({
        fromDB: true,
        imagePath: "posts/chart-1.png",
      }),
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/comment-images/posts/chart-1.png",
    );
  });

  it("ignores stored URLs and rejects missing or invalid persisted paths", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET = "comment-images";

    expect(
      getDisplayableCommunityPostImageUrl({
        fromDB: true,
        imagePath: "posts/tracker.png",
        imageUrl: "https://tracker.example/posts/tracker.png",
      }),
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/comment-images/posts/tracker.png",
    );
    expect(
      getDisplayableCommunityPostImageUrl({
        fromDB: true,
        imageUrl:
          "https://project.supabase.co/storage/v1/object/public/comment-images/posts/chart.png",
      }),
    ).toBeNull();
    expect(
      getDisplayableCommunityPostImageUrl({
        fromDB: true,
        imagePath: "../chart.png",
        imageUrl:
          "https://project.supabase.co/storage/v1/object/public/comment-images/../chart.png",
      }),
    ).toBeNull();
  });

  it("allows only browser-owned blob URLs for demo posts", () => {
    expect(
      getDisplayableCommunityPostImageUrl({
        imageUrl: "blob:http://localhost/local-chart",
      }),
    ).toBe("blob:http://localhost/local-chart");
    expect(
      getDisplayableCommunityPostImageUrl({
        imageUrl: "https://tracker.example/local-chart.png",
      }),
    ).toBeNull();
  });
});

describe("Community comment image references", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET = "comment-images";
  });

  it("derives a persisted comment attachment URL from its owned storage path", () => {
    expect(
      getDisplayableCommunityCommentImageUrl({
        fromDB: true,
        imagePath: "comments/post-1/chart-1.webp",
        imageUrl: "https://tracker.example/pixel.webp",
      }),
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/comment-images/comments/post-1/chart-1.webp",
    );
  });

  it("never displays a persisted external URL without a valid comment path", () => {
    expect(
      getDisplayableCommunityCommentImageUrl({
        fromDB: true,
        imageUrl: "https://tracker.example/pixel.png",
      }),
    ).toBeNull();
    expect(
      getDisplayableCommunityCommentImageUrl({
        fromDB: true,
        imagePath: "comments/../pixel.png",
        imageUrl: "https://tracker.example/pixel.png",
      }),
    ).toBeNull();
  });

  it("rejects an unmatched comment image reference at the service boundary", () => {
    expect(
      validateCommunityCommentImageReference({
        imageUrl: "https://tracker.example/pixel.png",
        imagePath: undefined,
      }),
    ).toBe(
      "The comment image reference is invalid. Reattach the image and try again.",
    );
  });
});
