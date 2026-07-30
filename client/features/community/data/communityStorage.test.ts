// File purpose: Tests Community storage path handling, upload paths, and no-op cleanup behavior.
import {
  removeCommunityImages,
  uniqueImagePaths,
  uploadCommentImage,
} from "./communityStorage";
import { COMMUNITY_IMAGE_BUCKET } from "../constants";

function imageFile(overrides: Partial<File> = {}) {
  return {
    name: "chart.png",
    size: 1024,
    type: "image/png",
    ...overrides,
  } as File;
}

function createStorageClient() {
  const upload = jest.fn(async () => ({ error: null }));
  const remove = jest.fn(async () => ({ error: null }));
  const getPublicUrl = jest.fn((path: string) => ({
    data: { publicUrl: `https://cdn.example.com/${path}` },
  }));
  const from = jest.fn(() => ({ upload, remove, getPublicUrl }));

  return {
    db: { storage: { from } } as any,
    from,
    upload,
    remove,
  };
}

describe("Community storage helpers", () => {
  it("deduplicates image paths and removes empty values", () => {
    expect(
      uniqueImagePaths([
        "posts/a.png",
        null,
        "comments/post-1/b.png",
        undefined,
        "posts/a.png",
      ]),
    ).toEqual(["posts/a.png", "comments/post-1/b.png"]);
  });

  it("uploads comment images into the post-scoped comments folder", async () => {
    const { db, from, upload } = createStorageClient();

    const result = await uploadCommentImage(db, "post-1", imageFile());

    expect(from).toHaveBeenCalledWith(COMMUNITY_IMAGE_BUCKET);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toMatch(
      /^comments\/post-1\/[a-f0-9-]+\.png$/,
    );
    expect(result).toEqual({
      path: upload.mock.calls[0][0],
      publicUrl: `https://cdn.example.com/${upload.mock.calls[0][0]}`,
    });
  });

  it("does not call Supabase when there are no image paths to remove", async () => {
    const { db, from } = createStorageClient();

    await removeCommunityImages(db, [null, undefined]);

    expect(from).not.toHaveBeenCalled();
  });
});
