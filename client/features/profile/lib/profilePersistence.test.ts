import {
  buildProfileAvatarPayload,
  buildProfileIdentityPayload,
  buildProfilePhonePayload,
} from "./profilePersistence";

describe("profilePersistence", () => {
  it("builds sparse profile patches that cannot overwrite unrelated fields", () => {
    expect(
      buildProfileIdentityPayload({
        firstName: "Nathan",
        handle: "nathan_li",
        lastName: "Li",
      }),
    ).toEqual({
      first_name: "Nathan",
      handle: "nathan_li",
      last_name: "Li",
    });
    expect(buildProfilePhonePayload({ phone: "+61 2 5555 1234" })).toEqual({
      phone: "+61 2 5555 1234",
    });
    expect(
      buildProfileAvatarPayload({
        avatarPath: "user-1/avatar-1.png",
        avatarUrl: "https://cdn.example.com/avatar.png",
      }),
    ).toEqual({
      avatar_path: "user-1/avatar-1.png",
      avatar_url: "https://cdn.example.com/avatar.png",
    });

    for (const payload of [
      buildProfileIdentityPayload({
        firstName: "Nathan",
        handle: "nathan_li",
        lastName: "Li",
      }),
      buildProfilePhonePayload({ phone: "+61 2 5555 1234" }),
    ]) {
      expect(payload).not.toHaveProperty("email");
      expect(payload).not.toHaveProperty("id");
    }
  });
});
