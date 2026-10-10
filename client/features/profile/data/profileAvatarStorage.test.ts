import { describe, expect, it, jest } from "@jest/globals";
import { createProfileAvatarStorage } from "./profileAvatarStorage";

function imageFile(type = "image/png") {
  return { name: "avatar.untrusted-extension", size: 100, type } as File;
}

describe("profileAvatarStorage", () => {
  it("upserts only the canonical avatar object for the authenticated user", async () => {
    const upload = jest.fn<any>().mockResolvedValue({ error: null });
    const getPublicUrl = jest.fn<any>(() => ({
      data: { publicUrl: "https://cdn.example.com/user-a/123.png" },
    }));
    const remove = jest.fn<any>().mockResolvedValue({ error: null });
    const from = jest.fn<any>(() => ({ getPublicUrl, remove, upload }));
    const storage = createProfileAvatarStorage({ from } as any, {
      bucket: "avatars",
    });

    await expect(
      storage.upload({ file: imageFile(), userId: "user-a" }),
    ).resolves.toEqual({
      path: "user-a/avatar",
      publicUrl: "https://cdn.example.com/user-a/123.png",
    });
    expect(from).toHaveBeenCalledWith("avatars");
    expect(upload).toHaveBeenCalledWith("user-a/avatar", expect.anything(), {
      contentType: "image/png",
      upsert: true,
    });
  });

  it("classifies a missing bucket without leaking storage details", async () => {
    const upload = jest.fn<any>().mockResolvedValue({
      error: new Error("Bucket not found: internal-storage-name"),
    });
    const from = jest.fn<any>(() => ({
      getPublicUrl: jest.fn<any>(() => ({
        data: { publicUrl: "https://cdn.example.com/user-a/avatar" },
      })),
      remove: jest.fn<any>(),
      upload,
    }));
    const storage = createProfileAvatarStorage({ from } as any, {
      bucket: "avatars",
    });

    await expect(
      storage.upload({ file: imageFile(), userId: "user-a" }),
    ).rejects.toMatchObject({
      code: "bucket_missing",
      name: "ProfileAvatarStorageError",
    });
  });

  it("does not upload when the canonical public URL cannot be created", async () => {
    const upload = jest.fn<any>().mockResolvedValue({ error: null });
    const getPublicUrl = jest.fn<any>(() => ({ data: { publicUrl: "" } }));
    const remove = jest.fn<any>().mockResolvedValue({ error: null });
    const from = jest.fn<any>(() => ({ getPublicUrl, remove, upload }));
    const storage = createProfileAvatarStorage({ from } as any, {
      bucket: "avatars",
    });

    await expect(
      storage.upload({ file: imageFile(), userId: "user-a" }),
    ).rejects.toMatchObject({ code: "public_url_missing" });
    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("only removes an object owned by the supplied user", async () => {
    const remove = jest.fn<any>().mockResolvedValue({ error: null });
    const from = jest.fn<any>(() => ({ remove }));
    const storage = createProfileAvatarStorage({ from } as any, {
      bucket: "avatars",
    });

    await storage.remove({ path: "user-a/avatar", userId: "user-a" });
    expect(remove).toHaveBeenCalledWith(["user-a/avatar"]);

    await expect(
      storage.remove({ path: "user-a/another-avatar", userId: "user-a" }),
    ).rejects.toMatchObject({ code: "invalid_path" });
    await expect(
      storage.remove({ path: "user-b/avatar", userId: "user-a" }),
    ).rejects.toMatchObject({ code: "invalid_path" });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
