import { resolveProfileAvatarBucket } from "./profileDependencies";

describe("profileDependencies", () => {
  it("uses only the profile-specific bucket configuration", () => {
    expect(
      resolveProfileAvatarBucket({
        NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET: "member-avatars",
        NEXT_PUBLIC_SUPABASE_BUCKET: "comment-images",
      } as NodeJS.ProcessEnv),
    ).toBe("member-avatars");
    expect(
      resolveProfileAvatarBucket({
        NEXT_PUBLIC_SUPABASE_BUCKET: "comment-images",
      } as NodeJS.ProcessEnv),
    ).toBe("avatars");
  });
});
