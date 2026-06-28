import { buildProfileDetailsPayload } from "./profilePersistence";

describe("profilePersistence", () => {
  it("keeps profile detail persistence separate from auth email changes", () => {
    const payload = buildProfileDetailsPayload({
      avatarUrl: "https://cdn.example.com/avatar.png",
      userId: "user-1",
      values: {
        email: "unsaved@example.com",
        firstName: "Nathan",
        handle: "nathan_li",
        lastName: "Li",
        phone: "+61 2 5555 1234",
      },
    });

    expect(payload).toEqual({
      avatar_url: "https://cdn.example.com/avatar.png",
      first_name: "Nathan",
      handle: "nathan_li",
      id: "user-1",
      last_name: "Li",
      phone: "+61 2 5555 1234",
    });
    expect(payload).not.toHaveProperty("email");
  });

  it("can omit handle for profile tables that have not run the handle migration", () => {
    const payload = buildProfileDetailsPayload({
      avatarUrl: null,
      includeHandle: false,
      userId: "user-1",
      values: {
        email: "nathan@example.com",
        firstName: "Nathan",
        handle: "nathan_li",
        lastName: "Li",
        phone: "",
      },
    });

    expect(payload).toEqual({
      avatar_url: null,
      first_name: "Nathan",
      id: "user-1",
      last_name: "Li",
      phone: "",
    });
  });
});
